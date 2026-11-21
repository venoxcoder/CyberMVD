import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Download,
  Maximize2,
  Network,
  Plus,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  CaseRecord,
  GraphEdge,
  GraphNode,
  GraphNodeType,
  Lang,
  LinkConfidence,
} from '../types';
import { confidenceLabel, localizeRecordText, t, tr } from '../utils/i18n';
import { EmptyState, PageHeader, StatusBadge, TableSkeleton } from './CommonUI';

interface IntelligenceGraphPageProps {
  lang: Lang;
  initialCaseId?: string;
  canGoBack: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}

const NODE_COLORS: Record<GraphNodeType, string> = {
  case: '#2dd4bf',
  evidence: '#38bdf8',
  domain: '#a78bfa',
  ip: '#f59e0b',
  file: '#60a5fa',
  event: '#ef4444',
  organization: '#34d399',
  participant: '#f472b6',
};

export const IntelligenceGraphPage: React.FC<IntelligenceGraphPageProps> = ({
  lang,
  initialCaseId,
  canGoBack,
  onBack,
  onToast,
}) => {
  const { apiFetch, permissions } = useAuth();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [caseFilter, setCaseFilter] = useState<string>(initialCaseId || 'all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number } | null>(null);

  const [addEdgeOpen, setAddEdgeOpen] = useState(false);
  const [edgeDraft, setEdgeDraft] = useState({
    sourceId: '',
    targetId: '',
    relation: '',
    source: '',
    confidence: 'hypothesis' as LinkConfidence,
  });

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, cRes] = await Promise.all([
        apiFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
          `/api/graph?caseId=${encodeURIComponent(caseFilter)}`
        ),
        apiFetch<{ cases: CaseRecord[] }>('/api/cases'),
      ]);
      setNodes(gRes.nodes || []);
      setEdges(gRes.edges || []);
      setCases(cRes.cases || []);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, caseFilter, onToast]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return nodes.filter((n) => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (q && !`${n.label} ${n.subtitle || ''} ${n.type}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [nodes, typeFilter, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          filteredNodeIds.has(e.sourceId) &&
          filteredNodeIds.has(e.targetId) &&
          (confidenceFilter === 'all' || e.confidence === confidenceFilter)
      ),
    [edges, filteredNodeIds, confidenceFilter]
  );

  // 1-hop & 2-hop neighborhood computation for selected node
  const neighborhood = useMemo(() => {
    const direct = new Set<string>();
    const indirect = new Set<string>();
    if (!selectedNodeId) return { direct, indirect };

    for (const e of filteredEdges) {
      if (e.sourceId === selectedNodeId) direct.add(e.targetId);
      if (e.targetId === selectedNodeId) direct.add(e.sourceId);
    }
    for (const e of filteredEdges) {
      if (direct.has(e.sourceId) && e.targetId !== selectedNodeId && !direct.has(e.targetId)) {
        indirect.add(e.targetId);
      }
      if (direct.has(e.targetId) && e.sourceId !== selectedNodeId && !direct.has(e.sourceId)) {
        indirect.add(e.sourceId);
      }
    }
    return { direct, indirect };
  }, [selectedNodeId, filteredEdges]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const selectedNodeEdges = useMemo(
    () =>
      selectedNodeId
        ? filteredEdges.filter((e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId)
        : [],
    [selectedNodeId, filteredEdges]
  );

  const svgPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNodeId) {
      const pt = svgPoint(e.clientX, e.clientY);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: pt.x, y: pt.y } : n))
      );
    } else if (panning) {
      const dx = e.clientX - panning.startX;
      const dy = e.clientY - panning.startY;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      setPanning({ startX: e.clientX, startY: e.clientY });
    }
  };

  const handleSvgMouseUp = () => {
    setDraggingNodeId(null);
    setPanning(null);
  };

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ edge: GraphEdge }>('/api/graph/edges', {
        method: 'POST',
        body: JSON.stringify(edgeDraft),
      });
      setEdges((prev) => [...prev, res.edge]);
      setAddEdgeOpen(false);
      setEdgeDraft({ sourceId: '', targetId: '', relation: '', source: '', confidence: 'hypothesis' });
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed to create link');
    }
  };

  const renderSvgToPngUrl = async (): Promise<string | null> => {
    if (!svgRef.current) return null;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.width = 900;
    img.height = 520;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1040;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#070b12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
  };

  const exportPng = async () => {
    const png = await renderSvgToPngUrl();
    if (!png) return;
    const a = document.createElement('a');
    a.href = png;
    a.download = `kiberjinoyatlar-graph-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportPdf = async () => {
    const png = await renderSvgToPngUrl();
    if (!png) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(12);
    doc.text('KIBERJINOYATLAR — Intelligence Link Graph Export', 14, 15);
    doc.addImage(png, 'PNG', 14, 22, 268, 155);
    doc.save(`kiberjinoyatlar-graph-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        lang={lang}
        eyebrow={t('e_graph', lang)}
        title={t('p_graph', lang)}
        subtitle={
          lang === 'ru'
            ? 'Анализ прямых и косвенных связей между делами, доказательствами, доменами, IP и участниками с указанием источника и степени достоверности (без автоматических обвинительных выводов).'
            : lang === 'en'
              ? 'Interactive 1-hop and 2-hop link analysis across accessible cases, digital evidence, domains, IPs, and entities with source provenance and confidence scoring.'
              : 'Ishlar, dalillar, domenlar, IP va ishtirokchilar o‘rtasidagi aloqalar tahlili.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPng}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5 text-[var(--blue)]" />
              <span>PDF</span>
            </button>
            {permissions?.graph_edit && (
              <button
                type="button"
                onClick={() => setAddEdgeOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-ink)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{tr(lang, 'Aloqa qo‘shish', 'Добавить связь', 'Add Link')}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Graph Controls */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-xs">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr(lang, 'Grafda tugunni qidirish...', 'Поиск узла на графе...', 'Search node...')}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] py-1.5 pl-8 pr-3"
          />
        </div>
        <select
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
        >
          <option value="all">{tr(lang, 'Barcha ruxsat etilgan ishlar', 'Все доступные дела', 'All accessible cases')}</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.caseNumber}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
        >
          <option value="all">{tr(lang, 'Barcha tugun turlari', 'Все типы узлов', 'All node types')}</option>
          {(Object.keys(NODE_COLORS) as GraphNodeType[]).map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>
        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
        >
          <option value="all">{tr(lang, 'Har qanday ishonchlilik', 'Любая достоверность', 'All confidence')}</option>
          <option value="confirmed">{confidenceLabel('confirmed', lang)}</option>
          <option value="indirect">{confidenceLabel('indirect', lang)}</option>
          <option value="hypothesis">{confidenceLabel('hypothesis', lang)}</option>
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))}
            className="rounded border border-[var(--line)] p-1.5 hover:border-[var(--accent)]"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            className="rounded border border-[var(--line)] p-1.5 hover:border-[var(--accent)]"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              setSelectedNodeId(null);
            }}
            className="rounded border border-[var(--line)] p-1.5 hover:border-[var(--accent)]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {addEdgeOpen && permissions?.graph_edit && (
        <form
          onSubmit={handleAddEdge}
          className="grid grid-cols-1 gap-2.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] p-4 text-xs md:grid-cols-5"
        >
          <select
            required
            value={edgeDraft.sourceId}
            onChange={(e) => setEdgeDraft((p) => ({ ...p, sourceId: e.target.value }))}
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2"
          >
            <option value="">{tr(lang, 'Boshlang‘ich tugun', 'Исходный узел', 'Source node')}</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                [{n.type}] {localizeRecordText(n.label, lang)}
              </option>
            ))}
          </select>
          <select
            required
            value={edgeDraft.targetId}
            onChange={(e) => setEdgeDraft((p) => ({ ...p, targetId: e.target.value }))}
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2"
          >
            <option value="">{tr(lang, 'Maqsadli tugun', 'Целевой узел', 'Target node')}</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                [{n.type}] {localizeRecordText(n.label, lang)}
              </option>
            ))}
          </select>
          <input
            required
            type="text"
            value={edgeDraft.relation}
            onChange={(e) => setEdgeDraft((p) => ({ ...p, relation: e.target.value }))}
            placeholder={tr(lang, 'Aloqa xususiyati', 'Характер связи', 'Relation')}
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2"
          />
          <input
            required
            type="text"
            value={edgeDraft.source}
            onChange={(e) => setEdgeDraft((p) => ({ ...p, source: e.target.value }))}
            placeholder={tr(lang, 'Ma’lumot manbasi', 'Источник данных', 'Source provenance')}
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2"
          />
          <div className="flex gap-2">
            <select
              value={edgeDraft.confidence}
              onChange={(e) =>
                setEdgeDraft((p) => ({ ...p, confidence: e.target.value as LinkConfidence }))
              }
              className="flex-1 rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-2"
            >
              <option value="confirmed">confirmed</option>
              <option value="indirect">indirect</option>
              <option value="hypothesis">hypothesis</option>
            </select>
            <button
              type="submit"
              className="rounded bg-[var(--accent)] px-3 font-bold text-[var(--accent-ink)]"
            >
              OK
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={2} />
      ) : filteredNodes.length === 0 ? (
        <EmptyState
          title={tr(lang, 'Graf tugunlari topilmadi', 'Узлы графа не найдены', 'No graph nodes found')}
          description={tr(
            lang,
            'Filtrlarni tozalang yoki obyektlari bor ishni oching.',
            'Сбросьте фильтры или откройте дело с объектами.',
            'Clear filters or select a case containing linked entities.'
          )}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[#070b12] xl:col-span-8">
            <svg
              ref={svgRef}
              viewBox="0 0 880 500"
              className="h-[500px] w-full cursor-grab select-none active:cursor-grabbing"
              onMouseDown={(e) => {
                if (e.target === svgRef.current) {
                  setPanning({ startX: e.clientX, startY: e.clientY });
                  setSelectedNodeId(null);
                }
              }}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={handleSvgMouseUp}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {filteredEdges.map((edge) => {
                  const src = filteredNodes.find((n) => n.id === edge.sourceId);
                  const dst = filteredNodes.find((n) => n.id === edge.targetId);
                  if (!src || !dst) return null;
                  const isHighlighted =
                    !selectedNodeId ||
                    edge.sourceId === selectedNodeId ||
                    edge.targetId === selectedNodeId ||
                    (neighborhood.direct.has(edge.sourceId) && neighborhood.indirect.has(edge.targetId)) ||
                    (neighborhood.direct.has(edge.targetId) && neighborhood.indirect.has(edge.sourceId));
                  const stroke =
                    edge.confidence === 'confirmed'
                      ? '#2dd4bf'
                      : edge.confidence === 'indirect'
                        ? '#f59e0b'
                        : '#94a3b8';
                  return (
                    <g key={edge.id} opacity={isHighlighted ? 0.92 : 0.16}>
                      <line
                        x1={src.x}
                        y1={src.y}
                        x2={dst.x}
                        y2={dst.y}
                        stroke={stroke}
                        strokeWidth={edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId ? 2.2 : 1.4}
                        strokeDasharray={edge.confidence === 'hypothesis' ? '5 4' : undefined}
                      />
                      <text
                        x={(src.x + dst.x) / 2}
                        y={(src.y + dst.y) / 2 - 5}
                        fill="#94a3b8"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {localizeRecordText(edge.relation, lang)}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {filteredNodes.map((node) => {
                  const isSel = node.id === selectedNodeId;
                  const isDirect = neighborhood.direct.has(node.id);
                  const isIndirect = neighborhood.indirect.has(node.id);
                  const dimmed = selectedNodeId && !isSel && !isDirect && !isIndirect;
                  const color = NODE_COLORS[node.type] || '#2dd4bf';
                  const locLabel = localizeRecordText(node.label, lang);
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      opacity={dimmed ? 0.25 : 1}
                      className="cursor-pointer"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setDraggingNodeId(node.id);
                      }}
                    >
                      <circle
                        r={isSel ? 23 : isDirect ? 20 : 17}
                        fill="#0d1420"
                        stroke={color}
                        strokeWidth={isSel ? 3 : isDirect ? 2.2 : 1.5}
                      />
                      <text
                        y={3}
                        fill={color}
                        fontSize="8.5"
                        fontWeight="700"
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {node.type.slice(0, 4).toUpperCase()}
                      </text>
                      <text
                        y={32}
                        fill="#eaf0f8"
                        fontSize="10.5"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {locLabel.length > 22 ? `${locLabel.slice(0, 20)}…` : locLabel}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-[10px] text-[var(--muted)]">
              {(Object.keys(NODE_COLORS) as GraphNodeType[]).map((tp) => (
                <span key={tp} className="inline-flex items-center gap-1 font-mono uppercase">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: NODE_COLORS[tp] }}
                  />
                  {tp}
                </span>
              ))}
            </div>
          </div>

          {/* Right Context Entity Panel */}
          <aside className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs xl:col-span-4">
            {!selectedNode ? (
              <div className="flex h-full flex-col justify-center text-center">
                <Network className="mx-auto mb-2 h-6 w-6 text-[var(--accent)]" />
                <div className="font-bold text-[var(--text)]">
                  {tr(lang, 'Grafda tugunni tanlang', 'Выберите узел на графе', 'Select a node')}
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {tr(
                    lang,
                    'Bosilganda 1-darajali (bevosita) va 2-darajali (bilvosita) aloqalar, manbalar va ishonchlilik darajasi ko‘rsatiladi. Tugunlarni sudrab joylashtirish mumkin.',
                    'Клик выделит прямые (1-й уровень) и косвенные (2-й уровень) связи, покажет источники и степень достоверности. Перетаскивание перемещает узлы.',
                    'Click any node to highlight 1-hop direct and 2-hop indirect links, attributes, and source metadata. Drag nodes to arrange.'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-b border-[var(--line)] pb-3">
                  <div className="font-mono text-[10px] font-bold uppercase text-[var(--accent)]">
                    {selectedNode.type} · {selectedNode.accessLevel}
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-[var(--text)]">
                    {localizeRecordText(selectedNode.label, lang)}
                  </h3>
                  {selectedNode.subtitle && (
                    <p className="mt-0.5 text-[11px] text-[var(--secondary-text)]">
                      {localizeRecordText(selectedNode.subtitle, lang)}
                    </p>
                  )}
                </div>

                {Object.keys(selectedNode.attributes).length > 0 && (
                  <div className="space-y-1 rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                    {Object.entries(selectedNode.attributes).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 text-[11px]">
                        <span className="text-[var(--muted)]">{localizeRecordText(k, lang)}:</span>
                        <span className="font-mono text-[var(--text)]">{localizeRecordText(v, lang)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="mb-2 font-bold text-[var(--text)]">
                    {tr(
                      lang,
                      `To‘g‘ridan-to‘g‘ri aloqalar (${selectedNodeEdges.length})`,
                      `Прямые связи (${selectedNodeEdges.length})`,
                      `Direct Connections (${selectedNodeEdges.length})`
                    )}
                  </div>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {selectedNodeEdges.map((ed) => {
                      const otherId =
                        ed.sourceId === selectedNode.id ? ed.targetId : ed.sourceId;
                      const other = nodes.find((n) => n.id === otherId);
                      return (
                        <div
                          key={ed.id}
                          className="rounded-lg border border-[var(--line)] bg-[var(--panel2)]/70 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[var(--text)]">
                              {other ? localizeRecordText(other.label, lang) : otherId}
                            </span>
                            <StatusBadge status={ed.confidence} lang={lang} />
                          </div>
                          <div className="mt-1 text-[11px] text-[var(--accent)]">
                            {localizeRecordText(ed.relation, lang)}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                            {tr(lang, 'Manba', 'Источник', 'Source')}: {localizeRecordText(ed.source, lang)} · {ed.establishedAt.slice(0, 10)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)]/40 p-2.5 text-[11px] text-[var(--muted)]">
                  {tr(
                    lang,
                    `2-darajali bilvosita tugunlar: ${neighborhood.indirect.size}. Ishonchlilik darajasi manba asosini aks ettiradi va avtomatik ayblov xulosasi hisoblanmaydi.`,
                    `Косвенных узлов (2-й уровень): ${neighborhood.indirect.size}. Степень достоверности отражает происхождение связи и не является выводом о виновности.`,
                    `2-hop indirect nodes: ${neighborhood.indirect.size}. Confidence indicates evidentiary provenance, not automated legal attribution.`
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
