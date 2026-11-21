import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Building2,
  Database,
  FileSpreadsheet,
  MapPin,
  Radar,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ART, HOME_SOURCE, HOME_STATS, KHOR, findMethod } from '../data/crimeData';
import {
  ARAL_SEA_BAY_PATH,
  CATEGORY_LABELS,
  UZBEKISTAN_REGIONS,
  getRegionName,
  matchCaseRegionId,
  type UzbekistanRegionDef,
} from '../data/uzbekistanRegions';
import type { CaseRecord, EvidenceRecord, IncidentCategory, Lang, PageId } from '../types';
import { caseStatusLabel, localizeRecordText, pickText, t, tr, tx } from '../utils/i18n';
import { EmptyState, PageHeader, StatusBadge, TableSkeleton } from './CommonUI';

interface InteractiveMapPageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (
    page: PageId,
    opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
  ) => void;
}

type CategoryFilter = 'all' | IncidentCategory;
type MapMetricMode = 'official' | 'live';

export const InteractiveMapPage: React.FC<InteractiveMapPageProps> = ({
  lang,
  canGoBack,
  onBack,
  onNavigate,
}) => {
  const { apiFetch } = useAuth();
  const [selectedId, setSelectedId] = useState<string>('ts');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [metricMode, setMetricMode] = useState<MapMetricMode>('official');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadLiveData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [casesRes, evRes] = await Promise.all([
          apiFetch<{ cases: CaseRecord[] }>('/api/cases'),
          apiFetch<{ evidence: EvidenceRecord[] }>('/api/evidence').catch(() => ({ evidence: [] as EvidenceRecord[] })),
        ]);
        if (!cancelled) {
          setCases(casesRes.cases || []);
          setEvidence(evRes.evidence || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load live regional cases');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadLiveData();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => categoryFilter === 'all' || c.category === categoryFilter);
  }, [cases, categoryFilter]);

  const casesByRegion = useMemo(() => {
    const map: Record<string, CaseRecord[]> = {};
    for (const r of UZBEKISTAN_REGIONS) {
      map[r.id] = [];
    }
    for (const c of filteredCases) {
      const text = `${c.caseNumber} ${c.title} ${c.summary} ${c.assignedOfficer} ${c.qualificationNotes}`;
      const rid = matchCaseRegionId(text, c.departmentId);
      if (!map[rid]) map[rid] = [];
      map[rid].push(c);
    }
    return map;
  }, [filteredCases]);

  const evidenceCountByRegion = useMemo(() => {
    const caseRegionLookup: Record<string, string> = {};
    for (const c of cases) {
      const text = `${c.caseNumber} ${c.title} ${c.summary} ${c.assignedOfficer}`;
      caseRegionLookup[c.id] = matchCaseRegionId(text, c.departmentId);
    }
    const counts: Record<string, number> = {};
    for (const ev of evidence) {
      const rid = caseRegionLookup[ev.caseId] || 'ts';
      counts[rid] = (counts[rid] || 0) + 1;
    }
    return counts;
  }, [cases, evidence]);

  const selectedRegion: UzbekistanRegionDef = useMemo(
    () => UZBEKISTAN_REGIONS.find((r) => r.id === selectedId) || UZBEKISTAN_REGIONS[0],
    [selectedId]
  );

  const selectedCases = casesByRegion[selectedRegion.id] || [];
  const selectedEvCount = evidenceCountByRegion[selectedRegion.id] || 0;
  const maxLiveCount = Math.max(
    1,
    ...UZBEKISTAN_REGIONS.map((r) => (casesByRegion[r.id] || []).length)
  );

  const getRegionFill = (region: UzbekistanRegionDef) => {
    const isSel = region.id === selectedId;
    const isHover = region.id === hoveredId;

    if (metricMode === 'official') {
      const regCount = region.officialStats?.registeredCases || 0;
      if (regCount >= 10000) {
        return isSel ? 'rgba(212, 168, 67, 0.55)' : isHover ? 'rgba(212, 168, 67, 0.42)' : 'rgba(212, 168, 67, 0.30)';
      }
      if (regCount >= 1000) {
        return isSel ? 'rgba(59, 130, 246, 0.52)' : isHover ? 'rgba(59, 130, 246, 0.40)' : 'rgba(59, 130, 246, 0.28)';
      }
      const liveCnt = (casesByRegion[region.id] || []).length;
      if (liveCnt > 0) {
        return isSel ? 'rgba(59, 130, 246, 0.36)' : isHover ? 'rgba(59, 130, 246, 0.28)' : 'rgba(30, 58, 138, 0.34)';
      }
      return isSel ? 'rgba(59, 130, 246, 0.26)' : isHover ? 'rgba(30, 58, 138, 0.48)' : '#0f1f3a';
    }

    const liveCnt = (casesByRegion[region.id] || []).length;
    if (liveCnt === 0) {
      return isSel ? 'rgba(59, 130, 246, 0.25)' : isHover ? 'rgba(30, 58, 138, 0.46)' : '#0f1f3a';
    }
    const ratio = liveCnt / maxLiveCount;
    const alpha = (0.24 + ratio * 0.46 + (isSel ? 0.14 : isHover ? 0.08 : 0)).toFixed(2);
    return `rgba(59, 130, 246, ${alpha})`;
  };

  const handleKhorClick = (target: string) => {
    if (target.startsWith('p:')) {
      onNavigate(target.slice(2) as PageId);
      return;
    }
    const found = findMethod(target);
    if (found) onNavigate('art', { a: found[0].id, m: found[1].id });
  };

  const categoryFilters: CategoryFilter[] = [
    'all',
    'apk_fraud',
    'phishing',
    'crypto_fraud',
    'data_breach',
    'simbox',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_map', lang)}
        title={
          lang === 'ru'
            ? 'Киберкарта Республики Узбекистан'
            : lang === 'en'
              ? 'Republic of Uzbekistan Cyber Intelligence Map'
              : 'O‘zbekiston Respublikasi kiberxaritasi'
        }
        subtitle={
          lang === 'ru'
            ? 'Территориальная аналитика по 14 регионам МВД/ОВД: реальные авторизованные дела из базы данных и верифицированная ведомственная статистика.'
            : lang === 'en'
              ? 'Territorial analytics across all 14 Uzbekistan regions combining real authorized DB cases and verified institutional reference datasets.'
              : 'O‘zbekistonning 14 hududi kesimidagi real tahlil: bazadagi vakolatli ishlar va tasdiqlangan rasmiy statistika.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <button
            type="button"
            onClick={() => onNavigate('prediction', { id: selectedRegion.id })}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
          >
            <Radar className="h-3.5 w-3.5" />
            <span>
              {tr(
                lang,
                'AI-prognoz (hudud)',
                'ИИ-прогноз по региону',
                'AI Forecast for Region'
              )}
            </span>
          </button>
        }
      />

      {/* Mode Switcher & Category Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              {pickText(CATEGORY_LABELS[cat], lang)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setMetricMode('official')}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 font-semibold transition-colors ${
              metricMode === 'official'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'text-[var(--secondary-text)] hover:text-[var(--text)]'
            }`}
          >
            {tr(lang, 'Rasmiy + Real', 'Офиц. + Живая БД', 'Official + Live')}
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('live')}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 font-semibold transition-colors ${
              metricMode === 'live'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'text-[var(--secondary-text)] hover:text-[var(--text)]'
            }`}
          >
            {tr(lang, 'Faqat real ishlar', 'Только живые дела', 'Live DB Only')}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-[var(--red)]/40 bg-[var(--red)]/10 p-3.5 text-xs text-[var(--red)]">
          {loadError}
        </div>
      )}

      {/* Main Map + Regional Command Dossier */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Uzbekistan Interactive SVG Map */}
        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-[var(--gold)]">
                IIV / МВД РУз · {tr(lang, '14 hudud', '14 регионов', '14 regions')}
              </span>
              <span className="text-[var(--muted)]">·</span>
              <span className="font-mono text-[11px] text-[var(--secondary-text)]">
                {tr(
                  lang,
                  `Bazadagi ruxsat etilgan ishlar: ${filteredCases.length}`,
                  `Дел в контуре доступа: ${filteredCases.length}`,
                  `Authorized live cases: ${filteredCases.length}`
                )}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs border border-[#d4a843] bg-[#d4a843]/40" />
                {tr(lang, 'Markaz / 11k+', 'Столица / 11k+', 'Capital / 11k+')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs border border-[#3b82f6] bg-[#3b82f6]/40" />
                {tr(lang, 'Faol ma’lumot', 'Есть сводка / дела', 'Active data')}
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[#060f1f]">
            <svg viewBox="0 0 1000 620" className="block h-auto w-full select-none">
              <defs>
                <pattern id="uz-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#172c4d"
                    strokeWidth="0.7"
                    strokeDasharray="2 3"
                  />
                </pattern>
              </defs>
              <rect width="1000" height="620" fill="url(#uz-grid)" />

              {/* Geographic Neighbor Context Labels */}
              <text x="520" y="132" fill="#3b5377" fontSize="11" fontFamily="monospace" letterSpacing="3">
                KAZAKHSTAN
              </text>
              <text x="160" y="455" fill="#3b5377" fontSize="11" fontFamily="monospace" letterSpacing="3">
                TURKMENISTAN
              </text>
              <text x="860" y="255" fill="#3b5377" fontSize="10" fontFamily="monospace" letterSpacing="2">
                KYRGYZSTAN
              </text>
              <text x="720" y="495" fill="#3b5377" fontSize="10" fontFamily="monospace" letterSpacing="2">
                TAJIKISTAN
              </text>
              <text x="520" y="595" fill="#3b5377" fontSize="10" fontFamily="monospace" letterSpacing="2">
                AFGHANISTAN
              </text>

              {/* Aral Sea Water Basin Contour */}
              <path
                d={ARAL_SEA_BAY_PATH}
                fill="#0b294d"
                fillOpacity="0.65"
                stroke="#2563eb"
                strokeOpacity="0.45"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text x="242" y="102" fill="#60a5fa" fontSize="8.5" fontFamily="monospace" textAnchor="middle" opacity="0.8">
                ARAL
              </text>

              {/* Render Regional Polygons (Non-capital first, then Tashkent city on top) */}
              {UZBEKISTAN_REGIONS.filter((r) => !r.isCapitalCity).map((region) => {
                const isSel = region.id === selectedId;
                const isHover = region.id === hoveredId;
                return (
                  <path
                    key={region.id}
                    d={region.path}
                    fill={getRegionFill(region)}
                    stroke={isSel ? '#d4a843' : isHover ? '#60a5fa' : '#2b4d82'}
                    strokeWidth={isSel ? 2.4 : isHover ? 1.8 : 1.15}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-colors duration-150"
                    onMouseEnter={() => setHoveredId(region.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedId(region.id)}
                  />
                );
              })}

              {/* Capital Node Highlight: Tashkent City */}
              {(() => {
                const ts = UZBEKISTAN_REGIONS.find((r) => r.id === 'ts')!;
                const isSel = ts.id === selectedId;
                return (
                  <g
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredId('ts')}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedId('ts')}
                  >
                    <path
                      d={ts.path}
                      fill={getRegionFill(ts)}
                      stroke={isSel ? '#f3d478' : '#d4a843'}
                      strokeWidth={isSel ? 2.6 : 1.8}
                    />
                    <circle
                      cx={ts.center[0]}
                      cy={ts.center[1]}
                      r={14}
                      fill="#d4a843"
                      fillOpacity={isSel ? 0.25 : 0.14}
                      stroke="#d4a843"
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                    <circle cx={ts.center[0]} cy={ts.center[1]} r={4.5} fill="#f3d478" />
                  </g>
                );
              })()}

              {/* Network telemetry links from regional MVD centers to Tashkent Central Hub */}
              {UZBEKISTAN_REGIONS.filter((r) => !r.isCapitalCity).map((r) => {
                const active = r.id === selectedId || (casesByRegion[r.id]?.length || 0) > 0 || Boolean(r.officialStats);
                if (!active) return null;
                return (
                  <line
                    key={`hub_${r.id}`}
                    x1={r.center[0]}
                    y1={r.center[1]}
                    x2={748}
                    y2={306}
                    stroke={r.id === selectedId ? '#d4a843' : '#3b82f6'}
                    strokeOpacity={r.id === selectedId ? 0.65 : 0.25}
                    strokeWidth={r.id === selectedId ? 1.5 : 1}
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Region Labels & Case/Stat Markers */}
              {UZBEKISTAN_REGIONS.map((region) => {
                const liveCount = (casesByRegion[region.id] || []).length;
                const offCount = region.officialStats?.registeredCases;
                const isSel = region.id === selectedId;
                const shortName = region.id === 'qr'
                  ? 'QR'
                  : region.id === 'ts'
                    ? 'Toshkent sh.'
                    : getRegionName(region, lang).split(' ')[0];

                return (
                  <g
                    key={`lbl_${region.id}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredId(region.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedId(region.id)}
                  >
                    {!region.isCapitalCity && (
                      <circle
                        cx={region.center[0]}
                        cy={region.center[1]}
                        r={isSel ? 5 : liveCount > 0 || offCount ? 4 : 2.8}
                        fill={offCount ? '#d4a843' : liveCount > 0 ? '#60a5fa' : '#4b6c9e'}
                        stroke="#060f1f"
                        strokeWidth="1.2"
                      />
                    )}
                    <text
                      x={region.center[0]}
                      y={region.center[1] - (region.isCapitalCity ? 18 : 9)}
                      fill={isSel ? '#ffffff' : '#cbd5e1'}
                      fontSize={region.isCapitalCity ? '10.5' : '9.5'}
                      fontWeight={isSel ? '700' : '600'}
                      textAnchor="middle"
                    >
                      {shortName}
                    </text>
                    {(offCount || liveCount > 0) && (
                      <text
                        x={region.center[0]}
                        y={region.center[1] + (region.isCapitalCity ? 23 : 16)}
                        fill={offCount ? '#f3d478' : '#93c5fd'}
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {metricMode === 'official' && offCount
                          ? offCount.toLocaleString()
                          : `${liveCount} ${tr(lang, 'ish', 'дел', 'cases')}`}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Compact 14-Region Quick Selector Grid */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
            {UZBEKISTAN_REGIONS.map((r) => {
              const liveCnt = (casesByRegion[r.id] || []).length;
              const isSel = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`flex items-center justify-between rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors ${
                    isSel
                      ? 'border-[var(--gold)] bg-[var(--gold-soft)] font-bold text-[var(--text)]'
                      : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="truncate pr-1">{getRegionName(r, lang)}</span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--accent)]">
                    {r.officialStats?.registeredCases
                      ? r.officialStats.registeredCases.toLocaleString()
                      : liveCnt}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Regional Command Dossier Sidebar */}
        <aside className="flex flex-col justify-between space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 xl:col-span-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div>
                <div className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--gold)]">
                  {selectedRegion.code} · {tr(lang, 'Hududiy bo‘linma', 'Региональное подразделение', 'Regional Command')}
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-[var(--text)]">
                  {getRegionName(selectedRegion, lang)}
                </h2>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--secondary-text)]">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  <span>{pickText(selectedRegion.unitName, lang)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('prediction', { id: selectedRegion.id })}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
              >
                <Radar className="h-3.5 w-3.5" />
                <span>AI</span>
              </button>
            </div>

            {/* Live Database Counters for Selected Region */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                  <Database className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>{tr(lang, 'Real bazadagi ishlar', 'Дела в БД (RBAC)', 'Live DB Cases')}</span>
                </div>
                <div className="mt-1 font-mono text-xl font-extrabold tabular-nums text-[var(--text)]">
                  {loading ? '—' : selectedCases.length}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--gold)]" />
                  <span>{tr(lang, 'Raqamli dalillar', 'Цифровых улик', 'Linked Evidence')}</span>
                </div>
                <div className="mt-1 font-mono text-xl font-extrabold tabular-nums text-[var(--text)]">
                  {loading ? '—' : selectedEvCount}
                </div>
              </div>
            </div>

            {/* Verified Official Reference Sheet Section */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text)]">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--gold)]" />
                  {tr(lang, 'Rasmiy hududiy statistika', 'Ведомственная справка', 'Official Statistics')}
                </span>
                <span className="font-mono text-[10px] font-bold uppercase text-[var(--gold)]">
                  {selectedRegion.officialStats ? t('officialBadge', lang) : tr(lang, 'Yuklanmagan', 'Нет сводки', 'Not loaded')}
                </span>
              </div>

              {selectedRegion.officialStats ? (
                <div className="space-y-3 text-xs">
                  <div className="font-mono text-[11px] text-[var(--muted)]">
                    {pickText(selectedRegion.officialStats.periodLabel, lang)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRegion.officialStats.registeredCases !== undefined && (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5">
                        <div className="text-[10px] text-[var(--muted)]">
                          {tr(lang, 'Ro‘yxatga olingan', 'Зарегистрировано', 'Registered')}
                        </div>
                        <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-[var(--gold)]">
                          {selectedRegion.officialStats.registeredCases.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedRegion.officialStats.nationalSharePct !== undefined && (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5">
                        <div className="text-[10px] text-[var(--muted)]">
                          {tr(lang, 'Respublika ulushi', 'Доля по РУз', 'National Share')}
                        </div>
                        <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-[var(--accent)]">
                          {selectedRegion.officialStats.nationalSharePct}%
                        </div>
                      </div>
                    )}
                    {selectedRegion.officialStats.clearanceRatePct !== undefined && (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5">
                        <div className="text-[10px] text-[var(--muted)]">
                          {tr(lang, 'Ochilish (oper.)', 'Раскрываемость (опер.)', 'Clearance (Oper.)')}
                        </div>
                        <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-[var(--accent)]">
                          {selectedRegion.officialStats.clearanceRatePct}% ({selectedRegion.officialStats.operationalClearancePct}%)
                        </div>
                      </div>
                    )}
                    {selectedRegion.officialStats.damageBlnsUzs !== undefined && (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5">
                        <div className="text-[10px] text-[var(--muted)]">
                          {tr(lang, 'Zarar / Undirilgan', 'Ущерб / Возмещено', 'Loss / Recovered')}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-[var(--text)]">
                          {selectedRegion.officialStats.damageBlnsUzs} / {selectedRegion.officialStats.recoveredBlnsUzs} mlrd
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedRegion.officialStats.topArticleHighlights && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-[var(--secondary-text)]">
                        {tr(lang, 'Asosiy JK moddalari:', 'Основные статьи УК РУз:', 'Primary Criminal Code Articles:')}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {selectedRegion.officialStats.topArticleHighlights.map((item) => (
                          <div
                            key={item.code}
                            className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 font-mono text-[11px]"
                          >
                            <span className="font-bold text-[var(--accent)]">{item.code}</span>
                            <span className="tabular-nums text-[var(--text)]">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                    {pickText(selectedRegion.officialStats.sourceNote, lang)}
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--secondary-text)]">
                  {tr(
                    lang,
                    'Ushbu hudud bo‘yicha alohida statistika jadvali tizimga yuklanmagan. Quyida joriy tizim bazasidagi haqiqiy ishlar va materiallar ko‘rsatilmoqda.',
                    'Отдельная официальная сводка (.xlsx/.docx) для данного региона не загружена в реестр. Ниже отображаются реальные дела текущей базы данных.',
                    'No separate official statistical sheet has been uploaded for this region. Live database dossiers assigned to this region appear below.'
                  )}
                </p>
              )}
            </div>

            {/* Live Scoped Cases in Selected Region */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--text)]">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {tr(lang, 'Hudud bo‘yicha real ishlar', 'Дела по региону', 'Regional Live Cases')}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('case')}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                >
                  {t('p_case', lang)} →
                </button>
              </div>

              {loading ? (
                <TableSkeleton rows={2} cols={2} />
              ) : selectedCases.length === 0 ? (
                <EmptyState
                  title={tr(lang, 'Ushbu hududda faol ishlar yo‘q', 'Нет дел в данном регионе', 'No live cases in region')}
                  description={tr(
                    lang,
                    'Tanlangan toifa yoki hudud bo‘yicha bazada yozuv topilmadi.',
                    'Для выбранного региона и категории в базе данных записей нет.',
                    'No authorized cases match this region and threat category filter.'
                  )}
                />
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {selectedCases.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onNavigate('case', { id: c.id })}
                      className="flex w-full items-start justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-2.5 text-left transition-colors hover:border-[var(--accent)]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="font-bold text-[var(--accent)]">{c.caseNumber}</span>
                          <span className="text-[var(--muted)]">·</span>
                          <span className="text-[var(--muted)]">{caseStatusLabel(c.status, lang)}</span>
                        </div>
                        <div className="mt-0.5 truncate text-xs font-semibold text-[var(--text)]">
                          {localizeRecordText(c.title, lang)}
                        </div>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* National Official Reference Strip & 18 Regional Methods Breakdown */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--text)]">{t('statsTitle', lang)}</h2>
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-[var(--gold)]">
            {t('officialBadge', lang)}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HOME_STATS.map(([val, label]) => (
            <div key={val + label} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="font-mono text-lg font-extrabold tabular-nums text-[var(--gold)]">
                {tx(val, lang)}
              </div>
              <div className="mt-1 text-xs leading-snug text-[var(--secondary-text)]">
                {tx(label, lang)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* 18 Khorezm Official Regional Cybercrime Methods */}
        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--text)]">{t('khorTitle', lang)}</h3>
            <MapPin className="h-4 w-4 text-[var(--gold)]" />
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr className="border-b border-[var(--line)] text-[10px] font-bold uppercase text-[var(--muted)]">
                  <th className="py-2 pr-3">{tr(lang, 'Usul', 'Способ', 'Method')}</th>
                  <th className="py-2 pr-3 text-right">{tr(lang, 'Ish', 'Дел', 'Cases')}</th>
                  <th className="py-2 pr-3 text-right">{tr(lang, 'Zarar (mln)', 'Ущерб (млн)', 'Loss (M)')}</th>
                  <th className="py-2 text-right">{t('open', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {KHOR.map(([name, cnt, dmg, target]) => (
                  <tr key={name} className="hover:bg-[var(--hover-bg)]">
                    <td className="py-2 pr-3 font-medium text-[var(--text)]">{tx(name, lang)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-[var(--secondary-text)]">
                      {cnt.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-[var(--secondary-text)]">
                      {tx(dmg, lang)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleKhorClick(target)}
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        {t('open', lang)} →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Criminal Code Article Distribution (Tashkent vs Region) */}
        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--text)]">{t('artStatTitle', lang)}</h3>
            <StatusBadge status="active" lang={lang} />
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr className="border-b border-[var(--line)] text-[10px] font-bold uppercase text-[var(--muted)]">
                  <th className="py-2 pr-3">{tr(lang, 'Modda', 'Статья', 'Article')}</th>
                  <th className="py-2 pr-3 text-right">{tr(lang, 'Toshkent', 'Ташкент', 'Tashkent')}</th>
                  <th className="py-2 pr-3 text-right">{tr(lang, 'Viloyat', 'Область', 'Region')}</th>
                  <th className="py-2 text-right">{t('open', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {ART.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--hover-bg)]">
                    <td className="py-2 pr-3 font-medium text-[var(--text)]">
                      <span className="font-mono font-bold text-[var(--accent)]">{a.code}</span>{' '}
                      <span className="text-[var(--secondary-text)]">{tx(a.title, lang)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-[var(--secondary-text)]">
                      {tx(a.st.t, lang)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-[var(--secondary-text)]">
                      {tx(a.st.x, lang)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate('art', { a: a.id, m: a.m[0]?.id })}
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        {t('open', lang)} →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="text-xs text-[var(--muted)]">{tx(HOME_SOURCE, lang)}</p>
    </div>
  );
};
