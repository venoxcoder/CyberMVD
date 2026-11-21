import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  FolderPlus,
  HardDrive,
  History,
  ListChecks,
  Network,
  Plus,
  Printer,
  Shield,
  Star,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ART, findMethod, stepsOfMethod } from '../data/crimeData';
import type {
  AccessLevel,
  CaseEntity,
  CaseKind,
  CaseRecord,
  CaseStatus,
  CaseTaskItem,
  EvidenceRecord,
  IncidentCategory,
  Lang,
  PageId,
} from '../types';
import {
  artLabel,
  caseStatusLabel,
  confidenceLabel,
  deptLabel,
  kindLabel,
  localizeRecordText,
  priorityLabel,
  roleLabel,
  t,
  tr,
  tx,
} from '../utils/i18n';
import { DataTable, EmptyState, PageHeader, StatusBadge, TableSkeleton } from './CommonUI';

interface CaseDossierPageProps {
  lang: Lang;
  selectedCaseId?: string;
  initialTab?: string;
  caseNo: string;
  onCaseNoChange: (val: string) => void;
  ticks: Record<string, boolean>;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (
    page: PageId,
    opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
  ) => void;
  onToast: (msg: string) => void;
}

type DossierTab =
  | 'overview'
  | 'timeline'
  | 'entities'
  | 'evidence'
  | 'documents'
  | 'tasks'
  | 'reports'
  | 'history';

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const CaseDossierPage: React.FC<CaseDossierPageProps> = ({
  lang,
  selectedCaseId,
  initialTab,
  caseNo,
  onCaseNoChange,
  ticks,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const { apiFetch, permissions, user, prefs, toggleFavorite, recordRecentCase, addSavedFilter, removeSavedFilter } =
    useAuth();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [kindFilter, setKindFilter] = useState<'all' | CaseKind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CaseStatus>('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(selectedCaseId || null);
  const [activeCase, setActiveCase] = useState<CaseRecord | null>(null);
  const [linkedEvidence, setLinkedEvidence] = useState<EvidenceRecord[]>([]);
  const [linkedReports, setLinkedReports] = useState<
    { id: string; title: string; template: string; authorName: string; createdAt: string; summary: string }[]
  >([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [tab, setTab] = useState<DossierTab>((initialTab as DossierTab) || 'overview');

  // Create case form
  const [newCase, setNewCase] = useState({
    caseNumber: '',
    title: '',
    kind: 'training' as CaseKind,
    category: 'apk_fraud' as IncidentCategory,
    accessLevel: 'training' as AccessLevel,
    assignedOfficer: user?.name || '',
    summary: '',
    qualificationNotes: '',
  });

  // Edit overview modal/inline
  const [editingOverview, setEditingOverview] = useState(false);
  const [editDraft, setEditDraft] = useState({
    title: '',
    summary: '',
    qualificationNotes: '',
    assignedOfficer: '',
  });

  // Sub-tab forms
  const [tlDraft, setTlDraft] = useState({
    timestamp: '',
    description: '',
    source: '',
    severity: 'info' as 'info' | 'warning' | 'critical',
  });
  const [entDraft, setEntDraft] = useState({
    type: 'domain' as CaseEntity['type'],
    label: '',
    roleOrContext: '',
    confidence: 'confirmed' as CaseEntity['confidence'],
    source: '',
  });
  const [matDraft, setMatDraft] = useState({
    title: '',
    fileName: '',
    mimeType: 'application/octet-stream',
    fileSize: 0,
    sha256: '',
    source: '',
    notes: '',
  });
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    assignee: user?.name || '',
    dueDate: new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10),
    priority: 'medium' as CaseTaskItem['priority'],
  });
  const [reportDraft, setReportDraft] = useState({
    title: '',
    template: 'incident' as 'incident' | 'evidence' | 'investigation',
    summary: '',
  });

  useEffect(() => {
    if (selectedCaseId) setActiveId(selectedCaseId);
  }, [selectedCaseId]);

  useEffect(() => {
    if (initialTab) setTab(initialTab as DossierTab);
  }, [initialTab]);

  const loadCases = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (kindFilter !== 'all') params.set('kind', kindFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (query.trim()) params.set('q', query.trim());
      const res = await apiFetch<{ cases: CaseRecord[] }>(`/api/cases?${params.toString()}`);
      setCases(res.cases || []);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setLoadingList(false);
    }
  }, [apiFetch, kindFilter, statusFilter, query, onToast]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const loadDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const res = await apiFetch<{
          caseRecord: CaseRecord;
          linkedEvidence: EvidenceRecord[];
          linkedReports: typeof linkedReports;
        }>(`/api/cases/${encodeURIComponent(id)}`);
        setActiveCase(res.caseRecord);
        setLinkedEvidence(res.linkedEvidence || []);
        setLinkedReports(res.linkedReports || []);
        setEditDraft({
          title: res.caseRecord.title,
          summary: res.caseRecord.summary,
          qualificationNotes: res.caseRecord.qualificationNotes,
          assignedOfficer: res.caseRecord.assignedOfficer,
        });
        recordRecentCase({
          id: res.caseRecord.id,
          caseNumber: res.caseRecord.caseNumber,
          title: res.caseRecord.title,
        });
        onCaseNoChange(res.caseRecord.caseNumber);
      } catch (err: unknown) {
        setDetailError(err instanceof Error ? err.message : 'Access denied or not found.');
        setActiveCase(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [apiFetch, recordRecentCase, onCaseNoChange]
  );

  useEffect(() => {
    if (activeId) {
      loadDetail(activeId);
    } else {
      setActiveCase(null);
    }
  }, [activeId, loadDetail]);

  // Algorithm ticks summary for active case number
  const tickedMethods = useMemo(() => {
    const activeNo = activeCase?.caseNumber || caseNo;
    const byMethod = new Map<string, number>();
    for (const [k, v] of Object.entries(ticks)) {
      if (!v) continue;
      const parts = k.split('_');
      if (parts.length === 2 && !k.startsWith('ev_')) {
        const mId = parts[0];
        byMethod.set(mId, (byMethod.get(mId) || 0) + 1);
      }
    }
    const list: { artId: string; artCode: string; methodId: string; methodName: string; done: number; total: number }[] = [];
    for (const [mId, done] of byMethod.entries()) {
      const found = findMethod(mId);
      if (found) {
        const total = stepsOfMethod(found[1]).flat().length;
        list.push({
          artId: found[0].id,
          artCode: found[0].code,
          methodId: found[1].id,
          methodName: found[1].n,
          done,
          total,
        });
      }
    }
    return { activeNo, list };
  }, [activeCase, caseNo, ticks]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>('/api/cases', {
        method: 'POST',
        body: JSON.stringify(newCase),
      });
      setCreateOpen(false);
      setNewCase({
        caseNumber: '',
        title: '',
        kind: 'training',
        category: 'apk_fraud',
        accessLevel: 'training',
        assignedOfficer: user?.name || '',
        summary: '',
        qualificationNotes: '',
      });
      await loadCases();
      setActiveId(res.caseRecord.id);
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Error creating case');
    }
  };

  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>(`/api/cases/${activeCase.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editDraft),
      });
      setActiveCase(res.caseRecord);
      setEditingOverview(false);
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleStatusChange = async (nextStatus: CaseStatus) => {
    if (!activeCase || nextStatus === activeCase.status) return;
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>(`/api/cases/${activeCase.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      setActiveCase(res.caseRecord);
      loadCases();
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Status change rejected');
    }
  };

  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>(`/api/cases/${activeCase.id}/timeline`, {
        method: 'POST',
        body: JSON.stringify(tlDraft),
      });
      setActiveCase(res.caseRecord);
      setTlDraft({ timestamp: '', description: '', source: '', severity: 'info' });
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleAddEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>(`/api/cases/${activeCase.id}/entities`, {
        method: 'POST',
        body: JSON.stringify(entDraft),
      });
      setActiveCase(res.caseRecord);
      setEntDraft({ type: 'domain', label: '', roleOrContext: '', confidence: 'confirmed', source: '' });
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleMaterialFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      onToast(tr(lang, 'Fayl 25 MB limitidan oshib ketdi.', 'Превышен лимит файла (25 МБ).', 'File exceeds 25 MB limit.'));
      return;
    }
    const hash = await sha256Hex(file);
    setMatDraft((p) => ({
      ...p,
      title: p.title || file.name,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      sha256: hash,
    }));
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>(`/api/cases/${activeCase.id}/materials`, {
        method: 'POST',
        body: JSON.stringify(matDraft),
      });
      setActiveCase(res.caseRecord);
      setMatDraft({
        title: '',
        fileName: '',
        mimeType: 'application/octet-stream',
        fileSize: 0,
        sha256: '',
        source: '',
        notes: '',
      });
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>(`/api/cases/${activeCase.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskDraft),
      });
      setActiveCase(res.caseRecord);
      setTaskDraft((p) => ({ ...p, title: '' }));
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleTaskStatus = async (taskId: string, status: CaseTaskItem['status']) => {
    if (!activeCase) return;
    try {
      const res = await apiFetch<{ caseRecord: CaseRecord }>(
        `/api/cases/${activeCase.id}/tasks/${taskId}`,
        { method: 'PATCH', body: JSON.stringify({ status }) }
      );
      setActiveCase(res.caseRecord);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    try {
      const res = await apiFetch<{ report: typeof linkedReports[number] }>('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          caseId: activeCase.id,
          caseNumber: activeCase.caseNumber,
          title: reportDraft.title || `${activeCase.caseNumber} — ${tr(lang, 'Tahliliy hisobot', 'Аналитический отчёт', 'Analytical Report')}`,
          template: reportDraft.template,
          summary: reportDraft.summary || activeCase.summary,
        }),
      });
      setLinkedReports((prev) => [res.report, ...prev]);
      setReportDraft({ title: '', template: 'incident', summary: '' });
      loadDetail(activeCase.id);
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const tabs: { id: DossierTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: lang === 'ru' ? 'Обзор' : lang === 'en' ? 'Overview' : 'Umumiy', icon: Briefcase },
    { id: 'timeline', label: lang === 'ru' ? 'Таймлайн' : lang === 'en' ? 'Timeline' : 'Taymlayn', icon: Clock },
    { id: 'entities', label: lang === 'ru' ? 'Сущности и объекты' : lang === 'en' ? 'Entities' : 'Obyektlar', icon: Network },
    { id: 'evidence', label: lang === 'ru' ? 'Цифровые доказательства' : lang === 'en' ? 'Evidence' : 'Dalillar', icon: HardDrive },
    { id: 'documents', label: lang === 'ru' ? 'Документы' : lang === 'en' ? 'Documents' : 'Hujjatlar', icon: FileText },
    { id: 'tasks', label: lang === 'ru' ? 'Задачи' : lang === 'en' ? 'Tasks' : 'Vazifalar', icon: ListChecks },
    { id: 'reports', label: lang === 'ru' ? 'Отчёты' : lang === 'en' ? 'Reports' : 'Hisobotlar', icon: Printer },
    { id: 'history', label: lang === 'ru' ? 'История изменений' : lang === 'en' ? 'Change History' : 'O‘zgarishlar tarixi', icon: History },
  ];

  // CASE DOSSIER VIEW
  if (activeId) {
    const isFav =
      activeCase && prefs.favorites.some((f) => f.id === activeCase.id && f.kind === 'case');
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveId(null);
                setActiveCase(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>{lang === 'ru' ? 'Все дела' : lang === 'en' ? 'All Cases' : 'Barcha ishlar'}</span>
            </button>
            {activeCase && (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-[var(--accent)]">
                    {activeCase.caseNumber}
                  </span>
                  <StatusBadge status={activeCase.status} lang={lang} />
                  <span className="font-mono text-[10px] uppercase text-[var(--muted)]">
                    {activeCase.kind} · {activeCase.accessLevel} · {deptLabel(activeCase.departmentId, lang)}
                  </span>
                </div>
                <h1 className="mt-1 text-lg font-extrabold text-[var(--text)] sm:text-xl">
                  {localizeRecordText(activeCase.title, lang)}
                </h1>
              </div>
            )}
          </div>

          {activeCase && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  toggleFavorite({
                    id: activeCase.id,
                    kind: 'case',
                    label: activeCase.caseNumber,
                    page: 'case',
                    routeOpts: { id: activeCase.id },
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs font-semibold"
              >
                <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-[var(--orange)] text-[var(--orange)]' : 'text-[var(--muted)]'}`} />
                <span>{lang === 'ru' ? 'Избранное' : lang === 'en' ? 'Favorite' : 'Saralangan'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('graph', { id: activeCase.id })}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
              >
                <Network className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{t('p_graph', lang)}</span>
              </button>
              {permissions?.cases_change_status && (
                <select
                  aria-label="Change case status"
                  value={activeCase.status}
                  onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="open">{caseStatusLabel('open', lang)}</option>
                  <option value="in_progress">{caseStatusLabel('in_progress', lang)}</option>
                  <option value="pending_review">{caseStatusLabel('pending_review', lang)}</option>
                  <option value="closed">{caseStatusLabel('closed', lang)}</option>
                  <option value="archived">{caseStatusLabel('archived', lang)}</option>
                </select>
              )}
            </div>
          )}
        </div>

        {loadingDetail ? (
          <TableSkeleton rows={4} cols={3} />
        ) : detailError || !activeCase ? (
          <EmptyState
            title={lang === 'ru' ? 'Доступ ограничен' : lang === 'en' ? 'Restricted Dossier' : 'Kirish cheklangan'}
            description={detailError || 'Case unavailable'}
          />
        ) : (
          <>
            {/* 8 Dossier Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-3">
              {tabs.map((tb) => {
                const Icon = tb.icon;
                const isActive = tab === tb.id;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setTab(tb.id)}
                    className={`relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'border-transparent text-[var(--accent)]'
                        : 'border-[var(--line)] bg-[var(--panel)] text-[var(--secondary-text)] hover:text-[var(--text)]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="case-dossier-tab-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)]"
                      />
                    )}
                    <Icon className="relative z-10 h-3.5 w-3.5" />
                    <span className="relative z-10">{tb.label}</span>
                  </button>
                );
              })}
            </div>
            <div key={tab} className="animate-panel-reveal">

            {tab === 'overview' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <h2 className="text-sm font-bold text-[var(--text)]">
                      {lang === 'ru' ? 'Паспорт дела' : lang === 'en' ? 'Case Summary & Qualification' : 'Ish pasporti'}
                    </h2>
                    {permissions?.cases_update && (
                      <button
                        type="button"
                        onClick={() => setEditingOverview((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>{lang === 'ru' ? 'Редактировать' : lang === 'en' ? 'Edit' : 'Tahrirlash'}</span>
                      </button>
                    )}
                  </div>

                  {editingOverview ? (
                    <form onSubmit={handleSaveOverview} className="space-y-3 text-xs">
                      <input
                        type="text"
                        value={editDraft.title}
                        onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                      />
                      <textarea
                        rows={4}
                        value={editDraft.summary}
                        onChange={(e) => setEditDraft((p) => ({ ...p, summary: e.target.value }))}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-3"
                      />
                      <input
                        type="text"
                        value={editDraft.qualificationNotes}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, qualificationNotes: e.target.value }))
                        }
                        placeholder={tr(lang, 'JK bo‘yicha malakalash', 'Квалификация по УК', 'Criminal Code Qualification')}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                      />
                      <input
                        type="text"
                        value={editDraft.assignedOfficer}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, assignedOfficer: e.target.value }))
                        }
                        placeholder={tr(lang, 'Mas’ul xodim', 'Ответственный', 'Assigned Officer')}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)]"
                      >
                        {t('save', lang)}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3 text-xs leading-relaxed">
                      <p className="text-[var(--text)]">{localizeRecordText(activeCase.summary, lang) || '—'}</p>
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                        <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
                          {lang === 'ru' ? 'Квалификация' : lang === 'en' ? 'Qualification' : 'Malakalash'}
                        </div>
                        <div className="mt-1 font-semibold text-[var(--accent)]">
                          {localizeRecordText(activeCase.qualificationNotes, lang) || '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs">
                  <h3 className="font-bold text-[var(--text)]">
                    {lang === 'ru' ? 'Реквизиты доступа' : lang === 'en' ? 'Case Metadata' : 'Rekvizitlar'}
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">ID:</dt>
                      <dd className="font-mono">{activeCase.caseNumber}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">{tr(lang, 'Mas’ul:', 'Ответственный:', 'Officer:')}</dt>
                      <dd className="text-right font-semibold">{localizeRecordText(activeCase.assignedOfficer, lang)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">{tr(lang, 'Bo‘lim:', 'Подразделение:', 'Dept:')}</dt>
                      <dd className="font-mono text-right">{deptLabel(activeCase.departmentId, lang)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">{tr(lang, 'Kirish:', 'Уровень:', 'Access:')}</dt>
                      <dd className="font-mono text-[var(--accent)]">{activeCase.accessLevel}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">{tr(lang, 'Yaratilgan:', 'Создано:', 'Created:')}</dt>
                      <dd className="font-mono">{activeCase.createdAt.slice(0, 10)}</dd>
                    </div>
                  </dl>
                  {activeCase.relatedArticleId && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('art', {
                          a: activeCase.relatedArticleId,
                          m: activeCase.relatedMethodId,
                        })
                      }
                      className="w-full rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] py-2 text-xs font-bold text-[var(--accent)]"
                    >
                      {tr(lang, 'JK moddasi algoritmini ochish →', 'Открыть алгоритм статьи УК →', 'Open Article Algorithm →')}
                    </button>
                  )}
                </aside>
              </div>
            )}

            {tab === 'timeline' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 lg:col-span-2">
                  {activeCase.timeline.length === 0 ? (
                    <EmptyState
                      title={tr(lang, 'Taymlayn bo‘sh', 'Таймлайн пуст', 'Timeline is empty')}
                      description={tr(
                        lang,
                        'Manbasi ko‘rsatilgan xronologik hodisalarni qo‘shing.',
                        'Добавьте хронологические события с указанием источника.',
                        'Add chronological events with source provenance.'
                      )}
                    />
                  ) : (
                    <div className="relative space-y-4 border-l border-[var(--line)] pl-5">
                      {activeCase.timeline.map((ev) => (
                        <div key={ev.id} className="relative">
                          <span
                            className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border border-[var(--panel)] ${
                              ev.severity === 'critical'
                                ? 'bg-[var(--red)]'
                                : ev.severity === 'warning'
                                  ? 'bg-[var(--orange)]'
                                  : 'bg-[var(--accent)]'
                            }`}
                          />
                          <div className="font-mono text-[11px] text-[var(--accent)]">
                            {ev.timestamp.slice(0, 19).replace('T', ' ')}
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-[var(--text)]">
                            {localizeRecordText(ev.description, lang)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                            {tr(lang, 'Manba', 'Источник', 'Source')}: {localizeRecordText(ev.source, lang)} · {localizeRecordText(ev.authorName, lang)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {permissions?.cases_update && (
                  <form
                    onSubmit={handleAddTimeline}
                    className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs h-fit"
                  >
                    <h3 className="font-bold text-[var(--text)]">
                      {tr(lang, 'Taymlayn hodisasini qo‘shish', 'Добавить событие таймлайна', 'Add Timeline Entry')}
                    </h3>
                    <input
                      type="datetime-local"
                      value={tlDraft.timestamp}
                      onChange={(e) => setTlDraft((p) => ({ ...p, timestamp: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono"
                    />
                    <textarea
                      required
                      rows={3}
                      value={tlDraft.description}
                      onChange={(e) => setTlDraft((p) => ({ ...p, description: e.target.value }))}
                      placeholder={tr(lang, 'Hodisa tavsifi', 'Описание события', 'Event description')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-2.5"
                    />
                    <input
                      required
                      type="text"
                      value={tlDraft.source}
                      onChange={(e) => setTlDraft((p) => ({ ...p, source: e.target.value }))}
                      placeholder={tr(lang, 'Ma’lumot manbasi (log, so‘rov, SIEM)', 'Источник данных (лог, опрос, SIEM)', 'Data source (log, interview, SIEM)')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <select
                      value={tlDraft.severity}
                      onChange={(e) =>
                        setTlDraft((p) => ({ ...p, severity: e.target.value as typeof tlDraft.severity }))
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    >
                      <option value="info">info</option>
                      <option value="warning">warning</option>
                      <option value="critical">critical</option>
                    </select>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[var(--accent)] py-2 font-bold text-[var(--accent-ink)]"
                    >
                      {t('add', lang)}
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'entities' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-2.5 lg:col-span-2">
                  {activeCase.entities.length === 0 ? (
                    <EmptyState
                      title={tr(lang, 'Obyektlar qo‘shilmagan', 'Объекты не добавлены', 'No entities added')}
                      description={tr(
                        lang,
                        'Domenlar, IP-manzillar, hisoblar va ishtirokchilarni ishonchlilik darajasi bilan qayd eting.',
                        'Фиксируйте домены, IP-адреса, счета и участников с указанием степени достоверности.',
                        'Record domains, IP addresses, accounts, and participants with confidence scores.'
                      )}
                    />
                  ) : (
                    activeCase.entities.map((ent) => (
                      <div
                        key={ent.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold uppercase text-[var(--accent)]">
                              {ent.type}
                            </span>
                            <span className="font-mono font-bold text-[var(--text)]">
                              {localizeRecordText(ent.label, lang)}
                            </span>
                            <StatusBadge status={ent.confidence} lang={lang} />
                          </div>
                          <div className="mt-1 text-[var(--secondary-text)]">
                            {localizeRecordText(ent.roleOrContext, lang)}
                          </div>
                          <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                            {tr(lang, 'Manba', 'Источник', 'Source')}: {localizeRecordText(ent.source, lang)} · {ent.addedAt.slice(0, 10)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {permissions?.cases_update && (
                  <form
                    onSubmit={handleAddEntity}
                    className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs h-fit"
                  >
                    <h3 className="font-bold text-[var(--text)]">
                      {tr(lang, 'Ish va grafga obyekt qo‘shish', 'Добавить сущность в дело и граф', 'Add Entity & Graph Node')}
                    </h3>
                    <select
                      value={entDraft.type}
                      onChange={(e) =>
                        setEntDraft((p) => ({ ...p, type: e.target.value as CaseEntity['type'] }))
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    >
                      <option value="domain">Domain</option>
                      <option value="ip">IP Address</option>
                      <option value="participant">Participant</option>
                      <option value="organization">Organization</option>
                      <option value="account">Account</option>
                      <option value="wallet">Crypto Wallet</option>
                    </select>
                    <input
                      required
                      type="text"
                      value={entDraft.label}
                      onChange={(e) => setEntDraft((p) => ({ ...p, label: e.target.value }))}
                      placeholder={tr(lang, 'Identifikator / qiymat', 'Идентификатор / значение', 'Identifier / Value')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono"
                    />
                    <input
                      type="text"
                      value={entDraft.roleOrContext}
                      onChange={(e) =>
                        setEntDraft((p) => ({ ...p, roleOrContext: e.target.value }))
                      }
                      placeholder={tr(lang, 'Obyekt roli / konteksti', 'Контекст / роль объекта', 'Role / context')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <input
                      required
                      type="text"
                      value={entDraft.source}
                      onChange={(e) => setEntDraft((p) => ({ ...p, source: e.target.value }))}
                      placeholder={tr(lang, 'Aniqlash manbasi', 'Источник установления', 'Evidentiary source')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <select
                      value={entDraft.confidence}
                      onChange={(e) =>
                        setEntDraft((p) => ({
                          ...p,
                          confidence: e.target.value as CaseEntity['confidence'],
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    >
                      <option value="confirmed">{confidenceLabel('confirmed', lang)}</option>
                      <option value="indirect">{confidenceLabel('indirect', lang)}</option>
                      <option value="hypothesis">{confidenceLabel('hypothesis', lang)}</option>
                    </select>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[var(--accent)] py-2 font-bold text-[var(--accent-ink)]"
                    >
                      {t('add', lang)}
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'evidence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--secondary-text)]">
                    {tr(
                      lang,
                      'Ushbu ishga biriktirilgan Raqamli dalillar markazi obyektlari:',
                      'Объекты Центра цифровых доказательств, привязанные к этому делу:',
                      'Digital Evidence Center records linked to this dossier:'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('evidenceCenter')}
                    className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)]"
                  >
                    {t('p_evidenceCenter', lang)} →
                  </button>
                </div>
                {linkedEvidence.length === 0 ? (
                  <EmptyState
                    title={tr(lang, 'Ashyoviy obyektlar yo‘q', 'Вещественных объектов нет', 'No linked evidence')}
                    description={tr(
                      lang,
                      'Fayllarni yuklang va Raqamli dalillar markazi orqali SHA-256 ni qayd eting.',
                      'Загрузите файлы и зафиксируйте SHA-256 через Центр цифровых доказательств.',
                      'Upload artifacts and record SHA-256 checksums via the Digital Evidence Center.'
                    )}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {linkedEvidence.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onNavigate('evidenceCenter', { id: ev.id })}
                        className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left hover:border-[var(--accent)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[var(--accent)]">{ev.id}</span>
                          <StatusBadge status={ev.verificationStatus} lang={lang} />
                        </div>
                        <div className="mt-1 text-xs font-bold text-[var(--text)]">
                          {localizeRecordText(ev.name, lang)}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                          SHA-256: {ev.sha256}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'documents' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-2.5 lg:col-span-2">
                  {activeCase.materials.length === 0 ? (
                    <EmptyState
                      title={tr(lang, 'Hujjatlar va materiallar biriktirilmagan', 'Документы и материалы не приобщены', 'No attached documents')}
                      description={tr(
                        lang,
                        'SHA-256 avtomatik hisoblanishi, manbasi va sanasi bilan fayl yuklang.',
                        'Загрузите файл с автоматическим расчётом SHA-256, указанием источника и даты.',
                        'Attach a file with automatic SHA-256 calculation and source metadata.'
                      )}
                    />
                  ) : (
                    activeCase.materials.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[var(--text)]">
                            {localizeRecordText(m.title, lang)}
                          </span>
                          <StatusBadge status={m.verificationStatus} lang={lang} />
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-[var(--accent)]">
                          {m.fileName} ({Math.round(m.fileSize / 1024)} KB)
                        </div>
                        <div className="mt-1 break-all font-mono text-[10px] text-[var(--muted)]">
                          SHA-256: {m.sha256}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--secondary-text)]">
                          {tr(lang, 'Manba', 'Источник', 'Source')}: {localizeRecordText(m.source, lang)} · {tr(lang, 'Qo‘shdi', 'Добавил', 'Uploaded by')}: {localizeRecordText(m.uploadedBy, lang)} · {m.receivedAt.slice(0, 10)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {permissions?.cases_update && (
                  <form
                    onSubmit={handleAddMaterial}
                    className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs h-fit"
                  >
                    <h3 className="font-bold text-[var(--text)]">
                      {tr(lang, 'Material biriktirish', 'Приобщить материал', 'Attach Material')}
                    </h3>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--accent)]/60 bg-[var(--panel2)] px-3 py-3 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]">
                      <Upload className="h-4 w-4" />
                      <span>{matDraft.fileName || tr(lang, 'Fayl tanlash (SHA-256 avto)', 'Выбрать файл (SHA-256 авто)', 'Pick file (auto SHA-256)')}</span>
                      <input type="file" onChange={handleMaterialFilePick} className="hidden" />
                    </label>
                    <input
                      required
                      type="text"
                      value={matDraft.title}
                      onChange={(e) => setMatDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder={tr(lang, 'Hujjat nomi', 'Наименование документа', 'Document title')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <input
                      required
                      type="text"
                      value={matDraft.sha256}
                      onChange={(e) => setMatDraft((p) => ({ ...p, sha256: e.target.value }))}
                      placeholder="SHA-256 (64 hex chars)"
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-[11px]"
                    />
                    <input
                      required
                      type="text"
                      value={matDraft.source}
                      onChange={(e) => setMatDraft((p) => ({ ...p, source: e.target.value }))}
                      placeholder={tr(lang, 'Kelib tushish manbasi', 'Источник поступления', 'Source')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[var(--accent)] py-2 font-bold text-[var(--accent-ink)]"
                    >
                      {t('save', lang)}
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'tasks' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-2.5 lg:col-span-2">
                  {activeCase.tasks.length === 0 ? (
                    <EmptyState
                      title={tr(lang, 'Ish bo‘yicha vazifalar yo‘q', 'Задачи по делу отсутствуют', 'No tasks assigned')}
                      description={tr(
                        lang,
                        'Muddatini ko‘rsatgan holda topshiriq yoki tekshiruv yarating.',
                        'Создайте поручение или проверку с указанием срока.',
                        'Create an investigative task or verification item with a due date.'
                      )}
                    />
                  ) : (
                    activeCase.tasks.map((tk) => (
                      <div
                        key={tk.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--text)]">
                            {localizeRecordText(tk.title, lang)}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                            {localizeRecordText(tk.assignee, lang)} · {tr(lang, 'Muddat', 'Срок', 'Due')}: {tk.dueDate} · {tr(lang, 'Ustuvorlik', 'Приоритет', 'Priority')}: {priorityLabel(tk.priority, lang)}
                          </div>
                        </div>
                        {permissions?.cases_update ? (
                          <select
                            value={tk.status}
                            onChange={(e) =>
                              handleTaskStatus(tk.id, e.target.value as CaseTaskItem['status'])
                            }
                            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[11px]"
                          >
                            <option value="todo">{tr(lang, 'Rejada', 'К выполнению', 'To Do')}</option>
                            <option value="in_progress">{caseStatusLabel('in_progress', lang)}</option>
                            <option value="done">{tr(lang, 'Bajarildi', 'Выполнено', 'Done')}</option>
                          </select>
                        ) : (
                          <span className="font-mono text-[11px]">{tk.status}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {permissions?.cases_update && (
                  <form
                    onSubmit={handleAddTask}
                    className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs h-fit"
                  >
                    <h3 className="font-bold text-[var(--text)]">
                      {tr(lang, 'Vazifa yaratish', 'Создать задачу', 'Create Task')}
                    </h3>
                    <input
                      required
                      type="text"
                      value={taskDraft.title}
                      onChange={(e) => setTaskDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder={tr(lang, 'Vazifa mazmuni', 'Формулировка задачи', 'Task title')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <input
                      type="text"
                      value={taskDraft.assignee}
                      onChange={(e) => setTaskDraft((p) => ({ ...p, assignee: e.target.value }))}
                      placeholder={tr(lang, 'Ijrochi', 'Исполнитель', 'Assignee')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={taskDraft.dueDate}
                        onChange={(e) => setTaskDraft((p) => ({ ...p, dueDate: e.target.value }))}
                        className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2 font-mono"
                      />
                      <select
                        value={taskDraft.priority}
                        onChange={(e) =>
                          setTaskDraft((p) => ({
                            ...p,
                            priority: e.target.value as CaseTaskItem['priority'],
                          }))
                        }
                        className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2"
                      >
                        <option value="low">{priorityLabel('low', lang)}</option>
                        <option value="medium">{priorityLabel('medium', lang)}</option>
                        <option value="high">{priorityLabel('high', lang)}</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[var(--accent)] py-2 font-bold text-[var(--accent-ink)]"
                    >
                      {t('add', lang)}
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'reports' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-2.5 lg:col-span-2">
                  {linkedReports.length === 0 ? (
                    <EmptyState
                      title={tr(lang, 'Hali hisobotlar shakllantirilmagan', 'Сформированных отчётов пока нет', 'No generated reports yet')}
                      description={tr(
                        lang,
                        'O‘ng tomonda ish bo‘yicha hisobot tuzing yoki PDF/DOCX eksport uchun Hisobotlar generatoriga o‘ting.',
                        'Создайте отчёт по делу справа или перейдите в Генератор отчётов для экспорта PDF/DOCX.',
                        'Generate a case report on the right or open the Report Generator for PDF/DOCX export.'
                      )}
                    />
                  ) : (
                    linkedReports.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--text)]">
                            {localizeRecordText(r.title, lang)}
                          </span>
                          <span className="font-mono text-[10px] uppercase text-[var(--accent)]">
                            {r.template}
                          </span>
                        </div>
                        <p className="mt-1 text-[var(--secondary-text)]">
                          {localizeRecordText(r.summary, lang)}
                        </p>
                        <div className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                          {localizeRecordText(r.authorName, lang)} · {r.createdAt.slice(0, 10)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {permissions?.reports_export && (
                  <form
                    onSubmit={handleGenerateReport}
                    className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs h-fit"
                  >
                    <h3 className="font-bold text-[var(--text)]">
                      {tr(lang, 'Hisobotni qayd etish', 'Зафиксировать отчёт', 'Generate Case Report')}
                    </h3>
                    <input
                      type="text"
                      value={reportDraft.title}
                      onChange={(e) => setReportDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder={tr(lang, 'Hisobot sarlavhasi', 'Заголовок отчёта', 'Report title')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    />
                    <select
                      value={reportDraft.template}
                      onChange={(e) =>
                        setReportDraft((p) => ({
                          ...p,
                          template: e.target.value as typeof reportDraft.template,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                    >
                      <option value="incident">{tr(lang, 'Hodisa bo‘yicha hisobot', 'Отчёт об инциденте', 'Incident Report')}</option>
                      <option value="evidence">{tr(lang, 'Raqamli dalillar ma’lumotnomasi', 'Справка по цифровым уликам', 'Digital Evidence Brief')}</option>
                      <option value="investigation">{tr(lang, 'Yakuniy tergov xulosasi', 'Итоговая сводка расследования', 'Final Investigation Summary')}</option>
                    </select>
                    <textarea
                      rows={3}
                      value={reportDraft.summary}
                      onChange={(e) => setReportDraft((p) => ({ ...p, summary: e.target.value }))}
                      placeholder={tr(lang, 'Qisqacha mazmuni...', 'Краткая выжимка...', 'Executive summary...')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-2.5"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[var(--accent)] py-2 font-bold text-[var(--accent-ink)]"
                    >
                      {t('save', lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('reports')}
                      className="w-full rounded-lg border border-[var(--line)] py-2 font-semibold hover:border-[var(--accent)]"
                    >
                      {t('p_reports', lang)} (PDF/DOCX) →
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text)]">
                    {tr(
                      lang,
                      'Ish kartochkasi o‘zgarishlar jurnali (append-only)',
                      'Журнал изменений карточки дела (append-only)',
                      'Immutable Case Audit History (append-only)'
                    )}
                  </span>
                  <Shield className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {activeCase.history.map((h) => (
                    <div key={h.id} className="py-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[var(--accent)]">{h.action}</span>
                        <span className="font-mono text-[10px] text-[var(--muted)]">
                          {h.timestamp.slice(0, 19).replace('T', ' ')}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[var(--text)]">{localizeRecordText(h.details, lang)}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                        {localizeRecordText(h.actorName, lang)} ({roleLabel(h.actorRole, lang)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    );
  }

  // CASE REGISTRY LIST VIEW
  return (
    <div className="space-y-5">
      <PageHeader
        lang={lang}
        eyebrow={t('e_case', lang)}
        title={t('p_case', lang)}
        subtitle={
          lang === 'ru'
            ? 'Единый реестр учебных и ведомственных дел с разграничением прав доступа (RBAC), 8-вкладочным досье, таймлайном и историей изменений.'
            : lang === 'en'
              ? 'RBAC-scoped registry of working and training cases with 8-tab investigative dossiers, timeline, evidence, tasks, and immutable change history.'
              : 'RBAC bo‘yicha ajratilgan ishlar reyestri, 8 bo‘limli dosye, taymlayn va o‘zgarishlar jurnali.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          permissions?.cases_create && (
            <button
              type="button"
              onClick={() => setCreateOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-[var(--accent-ink)]"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>{lang === 'ru' ? 'Новое дело' : lang === 'en' ? 'New Case' : 'Yangi ish'}</span>
            </button>
          )
        }
      />

      {createOpen && permissions?.cases_create && (
        <form
          onSubmit={handleCreateCase}
          className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] p-5 text-xs md:grid-cols-3"
        >
          <input
            type="text"
            value={newCase.caseNumber}
            onChange={(e) => setNewCase((p) => ({ ...p, caseNumber: e.target.value }))}
            placeholder={tr(lang, 'Ish raqami (mas. WRK-2026-109)', 'Номер дела (напр. WRK-2026-109)', 'Case number (e.g. WRK-2026-109)')}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono"
          />
          <input
            required
            type="text"
            value={newCase.title}
            onChange={(e) => setNewCase((p) => ({ ...p, title: e.target.value }))}
            placeholder={tr(lang, 'Ish nomi / fabulasi', 'Наименование дела / фабулы', 'Case title')}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 md:col-span-2"
          />
          <select
            value={newCase.kind}
            onChange={(e) => setNewCase((p) => ({ ...p, kind: e.target.value as CaseKind }))}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
          >
            <option value="training">{kindLabel('training', lang)}</option>
            <option value="working">{kindLabel('working', lang)}</option>
          </select>
          <select
            value={newCase.category}
            onChange={(e) =>
              setNewCase((p) => ({ ...p, category: e.target.value as IncidentCategory }))
            }
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
          >
            <option value="apk_fraud">APK Fraud</option>
            <option value="phishing">Phishing</option>
            <option value="crypto_fraud">Crypto Fraud</option>
            <option value="data_breach">Data Breach</option>
            <option value="simbox">SIM-Box</option>
            <option value="ransomware">Ransomware</option>
          </select>
          <select
            value={newCase.accessLevel}
            onChange={(e) => setNewCase((p) => ({ ...p, accessLevel: e.target.value as AccessLevel }))}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
          >
            <option value="training">{tr(lang, 'training (barcha xodimlar)', 'training (все сотрудники)', 'training (all staff)')}</option>
            <option value="department">{tr(lang, 'department (bo‘lim)', 'department (подразделение)', 'department (unit scope)')}</option>
            <option value="restricted">{tr(lang, 'restricted (tayinlanganlar)', 'restricted (назначенные)', 'restricted (assigned only)')}</option>
            <option value="confidential">{tr(lang, 'confidential (qat’iy cheklangan)', 'confidential (строго ограничено)', 'confidential (strictly restricted)')}</option>
          </select>
          <textarea
            rows={2}
            value={newCase.summary}
            onChange={(e) => setNewCase((p) => ({ ...p, summary: e.target.value }))}
            placeholder={tr(lang, 'Holatlarning qisqacha tavsifi...', 'Краткое описание обстоятельств...', 'Summary of incident details...')}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-2.5 md:col-span-3"
          />
          <div className="flex gap-2 md:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-ink)]"
            >
              {t('save', lang)}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-[var(--line)] px-4 py-2 font-semibold"
            >
              {tr(lang, 'Bekor qilish', 'Отмена', 'Cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Filters & Saved Filter Chips */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr(lang, 'Raqam, nom, xodim bo‘yicha qidirish...', 'Поиск по номеру, названию, сотруднику...', 'Filter cases by number, title, officer...')}
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5"
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
          className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
        >
          <option value="all">{tr(lang, 'Barcha turlar', 'Все типы', 'All kinds')}</option>
          <option value="working">{tr(lang, 'Ishchi', 'Рабочие', 'Working')}</option>
          <option value="training">{tr(lang, 'O‘quv', 'Учебные', 'Training')}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
        >
          <option value="all">{tr(lang, 'Barcha holatlar', 'Любой статус', 'All statuses')}</option>
          <option value="open">{caseStatusLabel('open', lang)}</option>
          <option value="in_progress">{caseStatusLabel('in_progress', lang)}</option>
          <option value="pending_review">{caseStatusLabel('pending_review', lang)}</option>
          <option value="closed">{caseStatusLabel('closed', lang)}</option>
        </select>
        {query.trim() && (
          <button
            type="button"
            onClick={() => addSavedFilter({ name: query.trim(), page: 'case', query: query.trim() })}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold hover:border-[var(--accent)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tr(lang, 'Filtrni saqlash', 'Сохранить фильтр', 'Save filter')}</span>
          </button>
        )}
      </div>

      {prefs.savedFilters.filter((f) => f.page === 'case').length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-[var(--muted)]">{tr(lang, 'Saqlangan:', 'Сохранённые:', 'Saved:')}</span>
          {prefs.savedFilters
            .filter((f) => f.page === 'case')
            .map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-0.5"
              >
                <button
                  type="button"
                  onClick={() => setQuery(f.query)}
                  className="font-mono text-[var(--accent)] hover:underline"
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  onClick={() => removeSavedFilter(f.id)}
                  className="text-[var(--muted)] hover:text-[var(--red)]"
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}

      {loadingList ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <DataTable
          lang={lang}
          rows={cases}
          rowKey={(c) => c.id}
          onRowClick={(c) => setActiveId(c.id)}
          emptyTitle={tr(lang, 'Ruxsat etilgan ishlar topilmadi', 'Доступных дел не найдено', 'No accessible cases')}
          emptyDescription={tr(
            lang,
            'Filtrlash parametrlarini o‘zgartiring yoki yangi ish yarating.',
            'Измените параметры фильтрации или создайте новое учебное/рабочее дело.',
            'Adjust filters or create a new case if permitted.'
          )}
          columns={[
            {
              key: 'caseNumber',
              header: tr(lang, 'Ish raqami', 'Номер дела', 'Case No.'),
              sortValue: (c) => c.caseNumber,
              render: (c) => (
                <span className="font-mono font-bold text-[var(--accent)]">{c.caseNumber}</span>
              ),
            },
            {
              key: 'title',
              header: tr(lang, 'Nomi', 'Наименование', 'Title'),
              sortValue: (c) => c.title,
              render: (c) => (
                <div>
                  <div className="font-semibold text-[var(--text)]">
                    {localizeRecordText(c.title, lang)}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--muted)]">
                    {c.kind} · {c.accessLevel}
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              header: tr(lang, 'Holat', 'Статус', 'Status'),
              sortValue: (c) => c.status,
              render: (c) => <StatusBadge status={c.status} lang={lang} />,
            },
            {
              key: 'officer',
              header: tr(lang, 'Mas’ul', 'Ответственный', 'Assigned'),
              sortValue: (c) => c.assignedOfficer,
              render: (c) => (
                <span className="text-[var(--secondary-text)]">
                  {localizeRecordText(c.assignedOfficer, lang)}
                </span>
              ),
            },
            {
              key: 'updated',
              header: tr(lang, 'Yangilangan', 'Обновлено', 'Updated'),
              sortValue: (c) => c.updatedAt,
              align: 'right',
              render: (c) => (
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {c.updatedAt.slice(0, 10)}
                </span>
              ),
            },
          ]}
        />
      )}

      {/* Preserved Method Algorithm Checklist Progress Bridge */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
            <span>{t('progH', lang)}</span>
          </div>
          <input
            type="text"
            value={caseNo}
            onChange={(e) => onCaseNoChange(e.target.value)}
            placeholder={t('cbPh', lang)}
            className="w-40 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1 font-mono text-xs"
          />
        </div>
        {tickedMethods.list.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">{t('progNone', lang)}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {tickedMethods.list.map((pm) => {
              const art = ART.find((a) => a.id === pm.artId);
              return (
                <button
                  key={pm.methodId}
                  type="button"
                  onClick={() => onNavigate('art', { a: pm.artId, m: pm.methodId })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3 text-left text-xs hover:border-[var(--accent)]"
                >
                  <div className="font-mono font-bold text-[var(--accent)]">
                    {artLabel(pm.artCode, lang)} · {pm.done}/{pm.total}
                  </div>
                  <div className="mt-0.5 font-semibold text-[var(--text)]">
                    {tx(pm.methodName, lang)}
                  </div>
                  {art && (
                    <div className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
                      {tx(art.title, lang)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
