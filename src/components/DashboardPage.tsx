import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  Bot,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Globe,
  HardDrive,
  LayoutGrid,
  MapPin,
  Microscope,
  Network,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ART,
  HOME_LEGAL,
  HOME_SOURCE,
  HOME_STATS,
  KHOR,
  findMethod,
  stepsOfMethod,
} from '../data/crimeData';
import type { Lang, PageId } from '../types';
import {
  artLabel,
  caseStatusLabel,
  deptLabel,
  localizeRecordText,
  roleLabel,
  t,
  tr,
  tx,
} from '../utils/i18n';
import { EmptyState, StatusBadge, TableSkeleton } from './CommonUI';

interface DashboardPageProps {
  lang: Lang;
  onNavigate: (
    page: PageId,
    opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
  ) => void;
}

interface DashboardSummaryResponse {
  systemStatus: {
    operational: boolean;
    aiConfigured: boolean;
    authEnforced: boolean;
    role: string;
    departmentId: string;
  };
  metrics: {
    accessibleTotal: number;
    trainingCasesCount: number;
    workingCasesCount: number;
    pendingMaterialsCount: number;
    pendingEvidenceCount: number;
    evidenceTotal: number;
    openTasksCount: number;
  };
  dynamics: { label: string; working: number; training: number }[];
  categoryDistribution: { category: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  evidenceStatusCounts: {
    verified: number;
    pending: number;
    mismatch: number;
    archived: number;
  };
  recentCases: {
    id: string;
    caseNumber: string;
    title: string;
    kind: string;
    category: string;
    status: string;
    accessLevel: string;
    updatedAt: string;
    assignedOfficer: string;
  }[];
  pendingTasks: {
    id: string;
    title: string;
    caseId: string;
    caseNumber: string;
    assignee: string;
    dueDate: string;
    priority: string;
    status: string;
  }[];
  latestEvidence: {
    id: string;
    caseId: string;
    caseNumber: string;
    name: string;
    sha256: string;
    receivedAt: string;
    verificationStatus: string;
  }[];
  recentAudit: {
    id: string;
    timestamp: string;
    actorName: string;
    actorRole: string;
    action: string;
    resourceId: string;
    outcome: string;
    details: string;
  }[];
  userActivity: {
    id: string;
    name: string;
    role: string;
    departmentId: string;
    lastActive: string;
    status: string;
  }[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ lang, onNavigate }) => {
  const { apiFetch, user, prefs } = useAuth();
  const [clock, setClock] = useState(() => new Date());
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          period,
          category: categoryFilter,
          status: statusFilter,
        });
        const data = await apiFetch<DashboardSummaryResponse>(
          `/api/dashboard/summary?${params.toString()}`
        );
        if (!cancelled) setSummary(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, period, categoryFilter, statusFilter]);

  const totalMethods = ART.reduce((sum, a) => sum + a.m.length, 0);
  const totalSteps = ART.reduce(
    (sum, a) => sum + a.m.reduce((ms, m) => ms + stepsOfMethod(m).flat().length, 0),
    0
  );

  const catLabel = (cat: string) => {
    const map: Record<string, Record<Lang, string>> = {
      apk_fraud: { uz: 'APK firibgarlik', ru: 'APK-мошенничество', en: 'APK Fraud' },
      phishing: { uz: 'Fishing', ru: 'Фишинг', en: 'Phishing' },
      crypto_fraud: { uz: 'Kripto-firibgarlik', ru: 'Крипто-инциденты', en: 'Crypto Fraud' },
      data_breach: { uz: 'Ma’lumot sizishi', ru: 'Утечка / НСД', en: 'Data Breach' },
      simbox: { uz: 'SIM-Box', ru: 'SIM-Box шлюзы', en: 'SIM-Box' },
      ransomware: { uz: 'Shifrlovchi', ru: 'Шифровальщики', en: 'Ransomware' },
      social_engineering: { uz: 'Ijtimoiy muhandislik', ru: 'Соц. инженерия', en: 'Social Eng.' },
    };
    return map[cat]?.[lang] || cat;
  };

  const quickCards: {
    id: PageId;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'case',
      title: t('p_case', lang),
      desc:
        lang === 'ru'
          ? 'Реестр дел, 8-вкладочное досье, таймлайн, задачи и аудит изменений.'
          : lang === 'en'
            ? 'Case registry, 8-tab dossier, timeline, tasks, and immutable audit trail.'
            : 'Ishlar reyestri, 8 bo‘limli dosye, taymlayn va vazifalar.',
      icon: Briefcase,
    },
    {
      id: 'evidenceCenter',
      title: t('p_evidenceCenter', lang),
      desc:
        lang === 'ru'
          ? 'Реестр цифровых объектов, SHA-256 проверка, передача хранения и опись.'
          : lang === 'en'
            ? 'Digital evidence registry, SHA-256 integrity verification, and custody logs.'
            : 'Raqamli dalillar reyestri, SHA-256 tekshiruvi va saqlash zanjiri.',
      icon: HardDrive,
    },
    {
      id: 'graph',
      title: t('p_graph', lang),
      desc:
        lang === 'ru'
          ? 'Интерактивный граф связей: объекты, домены, IP, степень достоверности.'
          : lang === 'en'
            ? 'Interactive entity-link graph with 1/2-hop isolation and PNG/PDF export.'
            : 'Obyektlar va bog‘liqliklarning interaktiv tahlil grafi.',
      icon: Network,
    },
    { id: 'catalog', title: t('p_catalog', lang), desc: t('d_catalog', lang), icon: LayoutGrid },
    { id: 'wizard', title: t('p_wizard', lang), desc: t('d_wizard', lang), icon: Compass },
    { id: 'universal', title: t('p_universal', lang), desc: t('d_universal', lang), icon: Activity },
    { id: 'evidence', title: t('p_evidence', lang), desc: t('d_evidence', lang), icon: CheckCircle2 },
    { id: 'expert', title: t('p_expert', lang), desc: t('d_expert', lang), icon: Microscope },
    { id: 'ai', title: t('p_ai', lang), desc: t('d_ai', lang), icon: Bot },
    { id: 'osint', title: t('p_osint', lang), desc: t('d_osint', lang), icon: Globe },
    { id: 'simulator', title: t('p_simulator', lang), desc: t('d_simulator', lang), icon: Sparkles },
    { id: 'map', title: t('p_map', lang), desc: t('d_map', lang), icon: MapPin },
    { id: 'tests', title: t('p_tests', lang), desc: t('d_tests', lang), icon: Award },
    { id: 'reports', title: t('p_reports', lang), desc: t('d_reports', lang), icon: FileText },
  ];

  const handleKhorClick = (target: string) => {
    if (target.startsWith('p:')) {
      onNavigate(target.slice(2) as PageId);
      return;
    }
    const found = findMethod(target);
    if (found) onNavigate('art', { a: found[0].id, m: found[1].id });
  };

  const maxDyn = Math.max(
    1,
    ...(summary?.dynamics.map((d) => d.working + d.training) || [1])
  );
  const maxCat = Math.max(
    1,
    ...(summary?.categoryDistribution.map((c) => c.count) || [1])
  );

  return (
    <div className="space-y-6">
      {/* Top Institutional Status & Live Clock Header */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <div className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--accent)]">
              {t('e_dashboard', lang)}
            </div>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--text)] sm:text-2xl">
              {lang === 'ru'
                ? 'Оперативный и учебно-аналитический рабочий стол'
                : lang === 'en'
                  ? 'Departmental Cyber Forensics & Analytical Workbench'
                  : 'Idoraviy kiberxavfsizlik va tahlil ish stoli'}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--secondary-text)]">
              <span>
                {lang === 'ru' ? 'Контур доступа' : lang === 'en' ? 'Access Scope' : 'Kirish doirasi'}:
              </span>
              <span className="font-mono font-semibold text-[var(--text)]">{roleLabel(user?.role, lang)}</span>
              <span>·</span>
              <span className="font-mono">{user?.departmentId ? deptLabel(user.departmentId, lang) : ''}</span>
              <span>·</span>
              <StatusBadge status={summary?.systemStatus.operational ? 'active' : 'pending'} lang={lang} />
            </div>
          </div>

          <div className="flex flex-col items-end font-mono">
            <div className="text-xl font-bold tabular-nums text-[var(--text)]">
              {clock.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              {clock.toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {prefs.showHints && (
          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--panel2)]/70 px-3 py-2 text-[11px] text-[var(--secondary-text)]">
            {lang === 'ru'
              ? 'Подсказка: нажмите Ctrl+K для быстрого поиска по делам и справочникам или «?» для списка горячих клавиш. Показатели отображаются строго в пределах прав вашей роли.'
              : lang === 'en'
                ? 'Tip: Press Ctrl+K for RBAC-scoped search or "?" for keyboard shortcuts. Metrics strictly reflect records authorized for your active role.'
                : 'Maslahat: Tezkor qidiruv uchun Ctrl+K yoki tugmalar ro‘yxati uchun «?» ni bosing.'}
          </div>
        )}

        {/* Top Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5 font-medium"
          >
            <option value="7d">{lang === 'ru' ? 'За 7 дней' : lang === 'en' ? 'Last 7 days' : '7 kun'}</option>
            <option value="30d">{lang === 'ru' ? 'За 30 дней' : lang === 'en' ? 'Last 30 days' : '30 kun'}</option>
            <option value="90d">{lang === 'ru' ? 'За 90 дней' : lang === 'en' ? 'Last 90 days' : '90 kun'}</option>
            <option value="all">{lang === 'ru' ? 'Весь период' : lang === 'en' ? 'All time' : 'Barcha davr'}</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5 font-medium"
          >
            <option value="all">{lang === 'ru' ? 'Все категории' : lang === 'en' ? 'All categories' : 'Barcha toifalar'}</option>
            <option value="apk_fraud">{catLabel('apk_fraud')}</option>
            <option value="phishing">{catLabel('phishing')}</option>
            <option value="crypto_fraud">{catLabel('crypto_fraud')}</option>
            <option value="data_breach">{catLabel('data_breach')}</option>
            <option value="simbox">{catLabel('simbox')}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5 font-medium"
          >
            <option value="all">{lang === 'ru' ? 'Любой статус' : lang === 'en' ? 'All statuses' : 'Barcha holatlar'}</option>
            <option value="open">{caseStatusLabel('open', lang)}</option>
            <option value="in_progress">{caseStatusLabel('in_progress', lang)}</option>
            <option value="pending_review">{caseStatusLabel('pending_review', lang)}</option>
            <option value="closed">{caseStatusLabel('closed', lang)}</option>
          </select>

          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('case')}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              {t('p_case', lang)}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('wizard')}
              className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
            >
              {t('btnWizard', lang)}
            </button>
          </div>
        </div>

        {/* 5 Top Operational KPIs */}
        {loading ? (
          <div className="mt-4">
            <TableSkeleton rows={1} cols={5} />
          </div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 p-3 text-xs text-[var(--red)]">
            {error}
          </div>
        ) : summary ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] font-semibold text-[var(--muted)]">
                {lang === 'ru' ? 'Рабочие дела (доступные)' : lang === 'en' ? 'Working Cases (Scoped)' : 'Ishchi ishlar'}
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
                {summary.metrics.workingCasesCount}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                {lang === 'ru' ? 'Разграничение по отделу' : lang === 'en' ? 'Department RBAC' : 'Bo‘lim bo‘yicha'}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] font-semibold text-[var(--muted)]">
                {lang === 'ru' ? 'Учебные дела' : lang === 'en' ? 'Training Cases' : 'O‘quv ishlari'}
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-[var(--accent)]">
                {summary.metrics.trainingCasesCount}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                {lang === 'ru' ? 'Изолированный учебный контур' : lang === 'en' ? 'Training sandbox' : 'O‘quv muhiti'}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] font-semibold text-[var(--muted)]">
                {lang === 'ru' ? 'Ожидают проверки' : lang === 'en' ? 'Pending Review / Hash' : 'Tekshiruv kutmoqda'}
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-[var(--orange)]">
                {summary.metrics.pendingMaterialsCount}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                {tr(
                  lang,
                  `Materiallar: ${summary.metrics.pendingEvidenceCount}`,
                  `Материалы: ${summary.metrics.pendingEvidenceCount}`,
                  `Evidence: ${summary.metrics.pendingEvidenceCount}`
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] font-semibold text-[var(--muted)]">
                {lang === 'ru' ? 'Цифровые объекты' : lang === 'en' ? 'Evidence Objects' : 'Raqamli dalillar'}
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
                {summary.metrics.evidenceTotal}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--ok)]">
                {tr(
                  lang,
                  `Tasdiqlangan: ${summary.evidenceStatusCounts.verified}`,
                  `Верифицировано: ${summary.evidenceStatusCounts.verified}`,
                  `Verified: ${summary.evidenceStatusCounts.verified}`
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] font-semibold text-[var(--muted)]">
                {lang === 'ru' ? 'Открытые задачи' : lang === 'en' ? 'Pending Tasks' : 'Faol vazifalar'}
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-[var(--blue)]">
                {summary.metrics.openTasksCount}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                {lang === 'ru' ? 'По доступным делам' : lang === 'en' ? 'Across scoped dossiers' : 'Mavjud ishlar bo‘yicha'}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Central Analytical Charts & Workflows */}
      {summary && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Dynamics Chart (2 cols) */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text)]">
                {lang === 'ru'
                  ? 'Динамика регистрации инцидентов'
                  : lang === 'en'
                    ? 'Incident Registration Dynamics'
                    : 'Hodisalar dinamikasi'}
              </h2>
              <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[var(--blue)]" />
                  {lang === 'ru' ? 'Рабочие' : lang === 'en' ? 'Working' : 'Ishchi'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[var(--accent)]" />
                  {lang === 'ru' ? 'Учебные' : lang === 'en' ? 'Training' : 'O‘quv'}
                </span>
              </div>
            </div>

            {summary.dynamics.every((d) => d.working === 0 && d.training === 0) ? (
              <EmptyState
                title={lang === 'ru' ? 'Нет записей за выбранный фильтр' : lang === 'en' ? 'No cases match filters' : 'Tanlangan davrda yozuv yo‘q'}
                description={lang === 'ru' ? 'Попробуйте расширить период или сбросить фильтр категории.' : lang === 'en' ? 'Expand the time range or clear category filters.' : 'Davrni kengaytiring.'}
              />
            ) : (
              <div className="flex h-44 items-end gap-2 border-b border-[var(--line)] pb-2 pt-4">
                {summary.dynamics.map((b) => {
                  const total = b.working + b.training;
                  const hTotal = Math.round((total / maxDyn) * 120);
                  const hWork = total > 0 ? Math.round((b.working / total) * hTotal) : 0;
                  const hTrain = hTotal - hWork;
                  return (
                    <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        {total > 0 ? total : ''}
                      </span>
                      <div className="flex w-full max-w-[28px] flex-col justify-end overflow-hidden rounded-t">
                        {hWork > 0 && (
                          <div style={{ height: `${hWork}px` }} className="w-full bg-[var(--blue)]" />
                        )}
                        {hTrain > 0 && (
                          <div style={{ height: `${hTrain}px` }} className="w-full bg-[var(--accent)]" />
                        )}
                      </div>
                      <span className="w-full truncate text-center font-mono text-[9px] text-[var(--muted)]">
                        {b.label.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Category Distribution */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="mb-4 text-sm font-bold text-[var(--text)]">
              {lang === 'ru'
                ? 'Распределение по категориям'
                : lang === 'en'
                  ? 'Category Breakdown'
                  : 'Toifalar bo‘yicha'}
            </h2>
            {summary.categoryDistribution.length === 0 ? (
              <EmptyState
                title={lang === 'ru' ? 'Нет данных' : lang === 'en' ? 'No data' : 'Ma’lumot yo‘q'}
                description={lang === 'ru' ? 'Доступные дела по выбранным фильтрам отсутствуют.' : lang === 'en' ? 'No accessible cases match.' : 'Mos ishlar topilmadi.'}
              />
            ) : (
              <div className="space-y-3">
                {summary.categoryDistribution.map((item) => (
                  <div key={item.category}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--secondary-text)]">{catLabel(item.category)}</span>
                      <span className="font-mono font-bold tabular-nums text-[var(--text)]">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--panel2)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.round((item.count / maxCat) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Middle 3 Operational Panels: Recent Cases / Pending Tasks / Recent System Actions */}
      {summary && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Recent Cases */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text)]">
                {lang === 'ru' ? 'Недавние дела' : lang === 'en' ? 'Recent Dossiers' : 'So‘nggi ishlar'}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('case')}
                className="text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                {t('open', lang)} →
              </button>
            </div>
            {summary.recentCases.length === 0 ? (
              <EmptyState
                title={lang === 'ru' ? 'Нет доступных дел' : lang === 'en' ? 'No accessible cases' : 'Ishlar yo‘q'}
                description={lang === 'ru' ? 'Дела появятся после назначения или создания.' : lang === 'en' ? 'Create or obtain assignment to a case.' : 'Yangi ish yarating.'}
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {summary.recentCases.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onNavigate('case', { id: c.id })}
                    className="block w-full py-2.5 text-left hover:bg-[var(--hover-bg)] px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--accent)]">
                        {c.caseNumber}
                      </span>
                      <StatusBadge status={c.status} lang={lang} />
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs font-semibold text-[var(--text)]">
                      {localizeRecordText(c.title, lang)}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {c.kind.toUpperCase()} · {c.accessLevel} · {c.updatedAt.slice(0, 10)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Pending Tasks */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text)]">
                {lang === 'ru' ? 'Ожидающие задачи' : lang === 'en' ? 'Pending Tasks' : 'Kutilayotgan vazifalar'}
              </h2>
              <Clock className="h-4 w-4 text-[var(--muted)]" />
            </div>
            {summary.pendingTasks.length === 0 ? (
              <EmptyState
                title={lang === 'ru' ? 'Открытых задач нет' : lang === 'en' ? 'No open tasks' : 'Ochiq vazifa yo‘q'}
                description={lang === 'ru' ? 'Все задачи по доступным делам завершены.' : lang === 'en' ? 'All tasks across accessible cases are completed.' : 'Barcha vazifalar bajarilgan.'}
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {summary.pendingTasks.map((tk) => (
                  <button
                    key={tk.id}
                    type="button"
                    onClick={() => onNavigate('case', { id: tk.caseId, tab: 'tasks' })}
                    className="block w-full py-2.5 text-left hover:bg-[var(--hover-bg)] px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                      <span className="font-bold text-[var(--blue)]">{tk.caseNumber}</span>
                      <span className="text-[var(--muted)]">{tk.dueDate}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[var(--text)]">
                      {localizeRecordText(tk.title, lang)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {localizeRecordText(tk.assignee, lang)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Recent System Actions */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text)]">
                {lang === 'ru' ? 'Последние действия' : lang === 'en' ? 'Recent System Actions' : 'So‘nggi amallar'}
              </h2>
              <span className="font-mono text-[10px] text-[var(--muted)]">AUDIT</span>
            </div>
            {summary.recentAudit.length === 0 ? (
              <EmptyState
                title={lang === 'ru' ? 'События отсутствуют' : lang === 'en' ? 'No recent actions' : 'Yozuvlar yo‘q'}
                description={lang === 'ru' ? 'Операции пользователя будут зафиксированы в журнале.' : lang === 'en' ? 'User actions will appear here.' : 'Amallar shu yerda chiqadi.'}
              />
            ) : (
              <div className="divide-y divide-[var(--line)] max-h-64 overflow-y-auto">
                {summary.recentAudit.map((aud) => (
                  <div key={aud.id} className="py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[var(--accent)]">
                        {aud.action}
                      </span>
                      <StatusBadge status={aud.outcome} lang={lang} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--secondary-text)]">
                      {localizeRecordText(aud.details, lang)}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {localizeRecordText(aud.actorName, lang)} · {aud.timestamp.slice(0, 19).replace('T', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Bottom 3 Blocks: Latest Digital Materials / Evidence Verification Status / Scoped User Activity */}
      {summary && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text)]">
                {lang === 'ru' ? 'Новые цифровые материалы' : lang === 'en' ? 'Latest Digital Evidence' : 'Yangi raqamli materiallar'}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('evidenceCenter')}
                className="text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                {t('open', lang)} →
              </button>
            </div>
            {summary.latestEvidence.length === 0 ? (
              <EmptyState
                title={lang === 'ru' ? 'Нет доступных материалов' : lang === 'en' ? 'No evidence accessible' : 'Dalillar mavjud emas'}
                description={lang === 'ru' ? 'Доступ к вещественным материалам ограничен ролью или пока пуст.' : lang === 'en' ? 'Evidence records are scoped by RBAC or empty.' : 'Kirish cheklangan yoki bo‘sh.'}
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {summary.latestEvidence.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onNavigate('evidenceCenter', { id: ev.id })}
                    className="block w-full py-2 text-left hover:bg-[var(--hover-bg)] px-2 -mx-2 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--text)]">{ev.id}</span>
                      <StatusBadge status={ev.verificationStatus} lang={lang} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[var(--secondary-text)]">
                      {localizeRecordText(ev.name, lang)}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--muted)]">
                      {ev.caseNumber} · SHA-256: {ev.sha256.slice(0, 14)}…
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 text-sm font-bold text-[var(--text)]">
              {lang === 'ru' ? 'Статус проверки целостности' : lang === 'en' ? 'Evidence Integrity Status' : 'Butunlik tekshiruvi holati'}
            </h2>
            <div className="grid grid-cols-2 gap-2.5 font-mono">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                <div className="text-[10px] text-[var(--muted)]">{tr(lang, 'TASDIQLANGAN', 'VERIFIED', 'VERIFIED')}</div>
                <div className="mt-1 text-xl font-bold text-[var(--ok)]">
                  {summary.evidenceStatusCounts.verified}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                <div className="text-[10px] text-[var(--muted)]">{tr(lang, 'KUTILMOQDA', 'ОЖИДАЕТ', 'PENDING')}</div>
                <div className="mt-1 text-xl font-bold text-[var(--orange)]">
                  {summary.evidenceStatusCounts.pending}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                <div className="text-[10px] text-[var(--muted)]">{tr(lang, 'MOS KELMADI', 'НЕСОВПАДЕНИЕ', 'MISMATCH')}</div>
                <div className="mt-1 text-xl font-bold text-[var(--red)]">
                  {summary.evidenceStatusCounts.mismatch}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                <div className="text-[10px] text-[var(--muted)]">{tr(lang, 'ARXIVDA', 'АРХИВ', 'ARCHIVED')}</div>
                <div className="mt-1 text-xl font-bold text-[var(--secondary-text)]">
                  {summary.evidenceStatusCounts.archived}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 text-sm font-bold text-[var(--text)]">
              {lang === 'ru' ? 'Активность подразделения' : lang === 'en' ? 'Scoped Team Activity' : 'Bo‘lim faolligi'}
            </h2>
            {summary.userActivity.length === 0 ? (
              <EmptyState
                title={lang === 'ru' ? 'Сводка доступна руководителю/админу' : lang === 'en' ? 'Scoped to supervisor/admin' : 'Faqat rahbar/admin uchun'}
                description={lang === 'ru' ? 'Личные права не включают просмотр активности других сотрудников.' : lang === 'en' ? 'Your current role only views individual workspace metrics.' : 'Rolingiz boshqa xodimlar faolligini ko‘rishni cheklaydi.'}
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {summary.userActivity.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <div className="font-bold text-[var(--text)]">{u.name}</div>
                      <div className="font-mono text-[10px] text-[var(--muted)]">
                        {roleLabel(u.role, lang)} · {deptLabel(u.departmentId, lang)}
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={u.status} lang={lang} />
                      <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                        {u.lastActive.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Preserved 4 Clickable Reference KPI Cards (Articles, Methods, Steps, Clearance) */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">
              {lang === 'ru'
                ? 'Методическая база квалификации и расследований'
                : lang === 'en'
                  ? 'Criminal Code Qualification & Methodology Reference'
                  : 'Malakalash va tergov metodik bazasi'}
            </h2>
            <p className="text-xs text-[var(--muted)]">{t('heroIntro', lang)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => onNavigate('catalog', { view: 'articles' })}
            className="group rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span>{t('sArt', lang)}</span>
              <span className="font-mono text-[var(--accent)]">▤</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
              {ART.length}
            </div>
            <div className="mt-1 text-xs font-medium text-[var(--accent)] group-hover:underline">
              {t('nArt', lang)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('catalog', { view: 'methods' })}
            className="group rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span>{t('sMeth', lang)}</span>
              <span className="font-mono text-[var(--accent)]">◎</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
              {totalMethods}
            </div>
            <div className="mt-1 text-xs font-medium text-[var(--accent)] group-hover:underline">
              {t('nMeth', lang)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('universal')}
            className="group rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span>{t('sSteps', lang)}</span>
              <span className="font-mono text-[var(--accent)]">☑</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
              {totalSteps}
            </div>
            <div className="mt-1 text-xs font-medium text-[var(--accent)] group-hover:underline">
              {t('nSteps', lang)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="group rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span>{t('sSolve', lang)}</span>
              <span className="font-mono text-[var(--accent)]">◉</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
              {lang === 'en' ? '7.4%' : '7,4%'}
            </div>
            <div className="mt-1 text-xs font-medium text-[var(--accent)] group-hover:underline">
              {t('nSolve', lang)}
            </div>
          </button>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-bold text-[var(--text)]">{t('quick', lang)}</h2>
          <p className="text-xs text-[var(--muted)]">{t('quickDesc', lang)}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigate(card.id)}
                className="flex flex-col items-start rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
              >
                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-[var(--text)]">{card.title}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-[var(--secondary-text)]">
                  {card.desc}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Official Reference Statistics & Legal Notice */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--text)]">{t('statsTitle', lang)}</h2>
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-[var(--accent)]">
            {t('officialBadge', lang)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HOME_STATS.map(([val, label]) => (
            <div
              key={val + label}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5"
            >
              <div className="font-mono text-lg font-extrabold tabular-nums text-[var(--accent)]">
                {tx(val, lang)}
              </div>
              <div className="mt-1 text-xs leading-snug text-[var(--secondary-text)]">
                {tx(label, lang)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3 rounded-xl border border-[var(--orange)]/40 bg-[var(--orange)]/10 p-3.5 text-xs leading-relaxed text-[var(--text)]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--orange)]" />
          <p>{tx(HOME_LEGAL, lang)}</p>
        </div>
      </section>

      {/* Preserved KHOR & ART Reference Tables */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h3 className="mb-3 text-sm font-bold text-[var(--text)]">{t('khorTitle', lang)}</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--line)] text-[10px] font-bold uppercase text-[var(--muted)]">
                  <th className="py-2 pr-3">{lang === 'ru' ? 'Способ' : lang === 'en' ? 'Method' : 'Usul'}</th>
                  <th className="py-2 pr-3 text-right">{lang === 'ru' ? 'Дел' : lang === 'en' ? 'Cases' : 'Ish'}</th>
                  <th className="py-2 pr-3 text-right">{lang === 'ru' ? 'Ущерб (млн)' : lang === 'en' ? 'Loss (M)' : 'Zarar (mln)'}</th>
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

        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h3 className="mb-3 text-sm font-bold text-[var(--text)]">{t('artStatTitle', lang)}</h3>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr className="border-b border-[var(--line)] text-[10px] font-bold uppercase text-[var(--muted)]">
                  <th className="py-2 pr-3">{lang === 'ru' ? 'Статья' : lang === 'en' ? 'Article' : 'Modda'}</th>
                  <th className="py-2 pr-3">{lang === 'ru' ? 'Ташкент' : lang === 'en' ? 'Tashkent' : 'Toshkent'}</th>
                  <th className="py-2 pr-3">{lang === 'ru' ? 'Область' : lang === 'en' ? 'Region' : 'Viloyat'}</th>
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
                    <td className="py-2 pr-3 font-mono tabular-nums text-[var(--secondary-text)]">
                      {tx(a.st.t, lang)}
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-[var(--secondary-text)]">
                      {tx(a.st.x, lang)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate('art', { a: a.id, m: a.m[0]?.id })}
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        {artLabel(a.code, lang)}
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
