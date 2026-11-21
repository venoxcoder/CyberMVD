import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Database,
  Radar,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ART, KHOR } from '../data/crimeData';
import {
  CATEGORY_LABELS,
  UZBEKISTAN_REGIONS,
  getRegionName,
} from '../data/uzbekistanRegions';
import type { CaseRecord, IncidentCategory, Lang, PageId } from '../types';
import { pickText, t, tr, tx } from '../utils/i18n';
import { EmptyState, PageHeader, TableSkeleton } from './CommonUI';

interface PredictiveAnalyticsPageProps {
  lang: Lang;
  initialRegionId?: string;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (
    page: PageId,
    opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
  ) => void;
  onToast: (msg: string) => void;
}

interface PredictedThreat {
  title: string;
  category: string;
  probabilityPct: number;
  projectedCasesDelta: string;
  articleCode: string;
  articleId: string;
  targetAudience: string;
  mechanismForecast: string;
  earlyIndicators: string[];
  preventiveMeasures: string[];
}

interface RegionalHotspot {
  regionName: string;
  riskScore: number;
  primaryVector: string;
  rationale: string;
}

interface TimelinePoint {
  label: string;
  baseline: number;
  projected: number;
  confidenceLow: number;
  confidenceHigh: number;
}

interface PredictApiResponse {
  generatedAt: string;
  model: string;
  scope: {
    regionId: string;
    regionName: string;
    horizonDays: number;
    categoryFocus: string;
    liveCasesAnalyzed: number;
    liveEvidenceAnalyzed: number;
  };
  forecast: {
    overallRiskScore: number;
    overallRiskLevel: string;
    trendDirection: string;
    executiveBrief: string;
    predictedThreats: PredictedThreat[];
    regionalHotspots: RegionalHotspot[];
    timelineProjection: TimelinePoint[];
  };
}

export const PredictiveAnalyticsPage: React.FC<PredictiveAnalyticsPageProps> = ({
  lang,
  initialRegionId,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const { apiFetch } = useAuth();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [baselineLoading, setBaselineLoading] = useState(true);

  const [regionId, setRegionId] = useState<string>(() => {
    if (initialRegionId && UZBEKISTAN_REGIONS.some((r) => r.id === initialRegionId)) {
      return initialRegionId;
    }
    return 'all';
  });
  const [horizonDays, setHorizonDays] = useState<7 | 30 | 90>(30);
  const [categoryFocus, setCategoryFocus] = useState<'all' | IncidentCategory>('all');
  const [analystSignals, setAnalystSignals] = useState('');

  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictApiResponse | null>(null);

  useEffect(() => {
    if (initialRegionId && UZBEKISTAN_REGIONS.some((r) => r.id === initialRegionId)) {
      setRegionId(initialRegionId);
    }
  }, [initialRegionId]);

  useEffect(() => {
    let cancelled = false;
    const loadBaseline = async () => {
      setBaselineLoading(true);
      try {
        const res = await apiFetch<{ cases: CaseRecord[] }>('/api/cases');
        if (!cancelled) setCases(res.cases || []);
      } catch {
        if (!cancelled) setCases([]);
      } finally {
        if (!cancelled) setBaselineLoading(false);
      }
    };
    loadBaseline();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const selectedRegionName = useMemo(() => {
    if (regionId === 'all') {
      return tr(lang, 'O‘zbekiston Respublikasi (barcha hududlar)', 'Республика Узбекистан (все регионы)', 'Republic of Uzbekistan (National)');
    }
    const found = UZBEKISTAN_REGIONS.find((r) => r.id === regionId);
    return found ? getRegionName(found, lang) : 'Republic of Uzbekistan';
  }, [regionId, lang]);

  const baselineStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of cases) {
      counts[c.category] = (counts[c.category] || 0) + 1;
    }
    const sortedCats = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const totalKhorCases = KHOR.reduce((acc, row) => acc + row[1], 0);
    return {
      liveCount: cases.length,
      openOrActive: cases.filter((c) => c.status !== 'closed' && c.status !== 'archived').length,
      topLiveCat: sortedCats[0] || null,
      sortedCats,
      totalKhorCases,
      topKhorMethods: KHOR.slice(0, 4),
    };
  }, [cases]);

  const signalPresets = useMemo(
    () => [
      {
        id: 'apk',
        label: tr(lang, 'APK + soliq/nafaqa to‘lqini', 'Волна APK (налоги/пособия)', 'APK Tax/Benefit Wave'),
        text:
          lang === 'ru'
            ? 'Фиксируется рост рассылок вредоносных APK-файлов в Telegram под предлогом налоговых уведомлений, перерасчета пенсий и штрафов ГУБДД.'
            : lang === 'en'
              ? 'Spike in Telegram distribution of malicious Android APKs disguised as tax debt notices, social benefits, and traffic fine receipts.'
              : 'Telegram orqali soliq qarzi, nafaqa va YHXBB jarimalari niqobidagi zararli APK tarqalishi ortmoqda.',
      },
      {
        id: 'p2p',
        label: tr(lang, 'Kripto / P2P droplar', 'Крипто-обмен и P2P-дропы', 'Crypto P2P & Drop Farms'),
        text:
          lang === 'ru'
            ? 'Участились треугольные P2P-схемы вывода похищенных средств через арендованные банковские карты (дроп-фермы) и анонимные Telegram-обменники.'
            : lang === 'en'
              ? 'Increasing triangular P2P laundering chains using rented bank drop cards and unregistered Telegram crypto exchangers.'
              : 'Ijaraga olingan bank kartalari (drop-fermalar) va noqonuniy Telegram P2P-almashinuvchilar orqali pul chiqarish ko‘paygan.',
      },
      {
        id: 'simbox',
        label: tr(lang, 'SIM-box va qo‘ng‘iroqlar', 'SIM-Box и спуфинг звонков', 'SIM-Box & Vishing'),
        text:
          lang === 'ru'
            ? 'Рост обращений по звонкам от лже-сотрудников банков и правоохранительных органов с использованием нелегальных GSM-шлюзов (SIM-box).'
            : lang === 'en'
              ? 'Surge in vishing calls impersonating bank security or law enforcement officers routed through illegal SIM-box gateways.'
              : 'Noqonuniy SIM-box shlyuzlari orqali soxta bank xavfsizligi va IIO xodimlari nomidan qo‘ng‘iroqlar ko‘paygan.',
      },
    ],
    [lang]
  );

  const runForecast = async () => {
    setPredicting(true);
    setPredictError(null);
    try {
      const data = await apiFetch<PredictApiResponse>('/api/ai/predict', {
        method: 'POST',
        body: JSON.stringify({
          regionId,
          regionName: selectedRegionName,
          horizonDays,
          categoryFocus,
          analystSignals,
          lang,
        }),
      });
      setResult(data);
      onToast(
        tr(
          lang,
          'AI prognozi muvaffaqiyatli shakllantirildi',
          'ИИ-прогноз успешно сформирован',
          'AI crime forecast generated'
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Prediction failed';
      setPredictError(msg);
    } finally {
      setPredicting(false);
    }
  };

  const resolveArticleId = (artId: string, artCode: string) => {
    if (artId && ART.some((a) => a.id === artId)) return artId;
    const norm = artCode.replace(/[^\d-]/g, '');
    const match = ART.find((a) => a.code.includes(norm));
    return match?.id;
  };

  const riskColor = (score: number) => {
    if (score >= 75) return 'text-[var(--red)]';
    if (score >= 50) return 'text-[var(--orange)]';
    return 'text-[var(--accent)]';
  };

  const timelineChart = useMemo(() => {
    const pts = result?.forecast?.timelineProjection || [];
    if (pts.length === 0) return null;
    const width = 640;
    const height = 210;
    const padX = 44;
    const padY = 24;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const maxVal = Math.max(
      10,
      ...pts.map((p) => Math.max(p.baseline, p.projected, p.confidenceHigh))
    );

    const xAt = (i: number) =>
      pts.length === 1 ? padX + innerW / 2 : padX + (i / (pts.length - 1)) * innerW;
    const yAt = (v: number) => padY + innerH - (v / maxVal) * innerH;

    const baseLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(p.baseline)}`).join(' ');
    const projLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(p.projected)}`).join(' ');
    const upper = pts.map((p, i) => `${xAt(i)},${yAt(p.confidenceHigh)}`);
    const lower = [...pts].reverse().map((p, i) => `${xAt(pts.length - 1 - i)},${yAt(p.confidenceLow)}`);
    const bandArea = `M${upper.join(' L')} L${lower.join(' L')} Z`;

    return { width, height, padX, padY, innerH, maxVal, pts, xAt, yAt, baseLine, projLine, bandArea };
  }, [result]);

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_prediction', lang)}
        title={t('p_prediction', lang)}
        subtitle={
          lang === 'ru'
            ? 'Предиктивная ИИ-аналитика будущих киберпреступлений на основе реальных дел системы, региональных данных и оперативных сигналов МВД.'
            : lang === 'en'
              ? 'Predictive AI forecasting of emerging cybercrime threats grounded in authorized case data, regional statistics, and operational field signals.'
              : 'Bazadagi haqiqiy ishlar, hududiy statistika va tezkor signallar asosida kelgusi kiberjinoyatlarni oldindan prognozlash moduli.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
          >
            <Activity className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>{t('p_map', lang)}</span>
          </button>
        }
      />

      {/* Deterministic Baseline Snapshot (Always populated from live authorized cases & KHOR) */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
            <Database className="h-4 w-4 text-[var(--gold)]" />
            <span>
              {tr(
                lang,
                'Bazaviy tahlil ma’lumotlari (jonli DB + rasmiy KHOR)',
                'Исходная база прогноза (живая БД + статистика KHOR)',
                'Verified Baseline Inputs (Live DB + KHOR Statistics)'
              )}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[var(--muted)]">
            {tr(lang, 'Kirish doirasi bo‘yicha', 'В пределах прав доступа', 'RBAC Scoped')}
          </span>
        </div>

        {baselineLoading ? (
          <TableSkeleton rows={1} cols={4} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] text-[var(--muted)]">
                {tr(lang, 'Tahlil qilinadigan ishlar', 'Доступных дел в модели', 'Authorized Live Cases')}
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
                {baselineStats.liveCount}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--accent)]">
                {tr(
                  lang,
                  `Faol: ${baselineStats.openOrActive}`,
                  `В работе: ${baselineStats.openOrActive}`,
                  `Active: ${baselineStats.openOrActive}`
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] text-[var(--muted)]">
                {tr(lang, 'Yetakchi toifa (DB)', 'Лидирующий вектор (БД)', 'Top Live Category')}
              </div>
              <div className="mt-1 text-sm font-extrabold text-[var(--text)]">
                {baselineStats.topLiveCat
                  ? pickText(
                      CATEGORY_LABELS[baselineStats.topLiveCat[0] as IncidentCategory] ||
                        CATEGORY_LABELS.all,
                      lang
                    )
                  : '—'}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                {baselineStats.topLiveCat ? `${baselineStats.topLiveCat[1]} cases` : '0 cases'}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] text-[var(--muted)]">
                {tr(lang, 'Hududiy tayanch (KHOR)', 'База способов (KHOR)', 'Regional Method Baseline')}
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[var(--gold)]">
                {baselineStats.totalKhorCases.toLocaleString()}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                {tr(lang, '18 ta hujjatlashtirilgan usul', '18 способов в расчетах', '18 documented vectors')}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="text-[11px] text-[var(--muted)]">
                {tr(lang, 'Birinchi o‘rindagi tahdid', 'Угроза №1 по статистике', '#1 Historical Vector')}
              </div>
              <div className="mt-1 truncate text-sm font-extrabold text-[var(--text)]">
                {tx(KHOR[0][0], lang)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--red)]">
                {KHOR[0][1].toLocaleString()} ({Math.round((KHOR[0][1] / baselineStats.totalKhorCases) * 100)}%)
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Forecast Parameter Controls */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--secondary-text)]">
              {tr(lang, 'Hududiy qamrov', 'Регион / Территория', 'Regional Scope')}
            </label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs font-semibold text-[var(--text)]"
            >
              <option value="all">
                {tr(lang, 'Butun O‘zbekiston (14 hudud)', 'Весь Узбекистан (14 регионов)', 'All Uzbekistan (14 regions)')}
              </option>
              {UZBEKISTAN_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {getRegionName(r, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--secondary-text)]">
              {tr(lang, 'Prognoz gorizonti', 'Горизонт прогноза', 'Forecast Horizon')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setHorizonDays(days)}
                  className={`rounded-lg border py-2 font-mono text-xs font-bold transition-colors ${
                    horizonDays === days
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--secondary-text)] hover:text-[var(--text)]'
                  }`}
                >
                  {days} {tr(lang, 'kun', 'дн.', 'd')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--secondary-text)]">
              {tr(lang, 'Toifa yo‘nalishi', 'Фокус категории', 'Threat Category Focus')}
            </label>
            <select
              value={categoryFocus}
              onChange={(e) => setCategoryFocus(e.target.value as 'all' | IncidentCategory)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs font-semibold text-[var(--text)]"
            >
              {(Object.keys(CATEGORY_LABELS) as ('all' | IncidentCategory)[]).map((cat) => (
                <option key={cat} value={cat}>
                  {pickText(CATEGORY_LABELS[cat], lang)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold text-[var(--secondary-text)]">
              {tr(
                lang,
                'Tezkor signallar va hududiy kuzatuvlar (ixtiyoriy)',
                'Оперативные сигналы и тенденции с мест (необязательно)',
                'Investigator Field Signals & Emerging Complaints (Optional)'
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {signalPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAnalystSignals(preset.text)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 text-[11px] font-medium text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={analystSignals}
            onChange={(e) => setAnalystSignals(e.target.value)}
            rows={2}
            placeholder={tr(
              lang,
              'Masalan: so‘nggi 48 soatda Telegramda soxta soliq APK havolalari bo‘yicha arizalar ko‘paydi...',
              'Например: за последние 48 часов участились обращения по рассылкам фейковых APK от имени налоговой или банков...',
              'Example: Surge in complaints about malicious APKs disguised as utility/tax notices over the last 48 hours...'
            )}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-[var(--muted)]">
            {tr(
              lang,
              'AI modeli bazadagi ruxsat etilgan ishlar va hududiy statistikani tahlil qilib tizimli prognoz tuzadi.',
              'Модель ИИ анализирует доступные дела из БД, статистику МВД и оперативные сигналы для прогноза волн угроз.',
              'AI correlates authorized case telemetry, official baseline shares, and field signals into structured threat projections.'
            )}
          </span>
          <button
            type="button"
            disabled={predicting}
            onClick={runForecast}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Radar className={`h-4 w-4 ${predicting ? 'animate-spin' : ''}`} />
            <span>
              {predicting
                ? tr(lang, 'Tahlil qilinmoqda...', 'Моделирование прогноза...', 'Generating Forecast...')
                : tr(lang, 'Kelgusi jinoyatlarni prognozlash', 'Построить прогноз ИИ', 'Run AI Threat Forecast')}
            </span>
          </button>
        </div>
      </section>

      {predictError && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--red)]/40 bg-[var(--red)]/10 p-4 text-xs text-[var(--red)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-bold">
              {tr(lang, 'Prognoz xizmati xatosi', 'Ошибка предиктивного анализа', 'Predictive Analysis Error')}
            </div>
            <div className="mt-0.5">{predictError}</div>
          </div>
        </div>
      )}

      {predicting && (
        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          <div className="font-mono text-xs text-[var(--accent)]">
            {tr(
              lang,
              'Kiber-tahdidlar ehtimolligi va hududiy dinamika modellashtirilmoqda...',
              'Выполняется расчёт вероятностных векторов и траектории инцидентов...',
              'Computing threat probabilities and confidence trajectories...'
            )}
          </div>
          <TableSkeleton rows={4} cols={3} />
        </section>
      )}

      {!predicting && !result && !predictError && (
        <EmptyState
          title={tr(
            lang,
            'Prognozni shakllantirish uchun parametrlarni tanlang',
            'Выберите регион и запустите ИИ-прогноз',
            'Configure Scope and Run AI Forecast'
          )}
          description={tr(
            lang,
            'Tizim jonli bazadagi ishlar, KHOR usullari va kiritilgan tezkor signallarni tahlil qilib, kutilayotgan kiberjinoyatlar to‘lqini va profilaktika choralarini beradi.',
            'Интеллектуальный модуль оценит динамику преступлений на ближайшие 7–90 дней, укажет целевые статьи УК, ранние индикаторы и меры упреждения.',
            'The predictive engine evaluates upcoming 7–90 day crime trajectories, targeted Criminal Code articles, early indicators, and preventive actions.'
          )}
        />
      )}

      {!predicting && result && (
        <div className="space-y-6 animate-panel-reveal">
          {/* Executive Brief + Overall Risk Score */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 lg:col-span-4">
              <div className="font-mono text-[10px] font-bold tracking-wider uppercase text-[var(--gold)]">
                {result.scope.regionName} · {result.scope.horizonDays}d
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`font-mono text-4xl font-extrabold tabular-nums ${riskColor(result.forecast.overallRiskScore)}`}>
                  {result.forecast.overallRiskScore}
                </span>
                <span className="font-mono text-sm text-[var(--muted)]">/ 100</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold uppercase text-[var(--text)]">
                <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
                <span>{result.forecast.overallRiskLevel}</span>
                <span className="text-[var(--muted)]">·</span>
                <span className="font-mono text-[var(--accent)]">{result.forecast.trendDirection}</span>
              </div>
              <div className="mt-3 border-t border-[var(--line)] pt-3 font-mono text-[11px] text-[var(--muted)]">
                {tr(
                  lang,
                  `Tahlil asosi: ${result.scope.liveCasesAnalyzed} ish, ${result.scope.liveEvidenceAnalyzed} dalil`,
                  `Опора: ${result.scope.liveCasesAnalyzed} дел, ${result.scope.liveEvidenceAnalyzed} улик`,
                  `Analyzed: ${result.scope.liveCasesAnalyzed} cases, ${result.scope.liveEvidenceAnalyzed} evidence`
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 lg:col-span-8">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[var(--text)]">
                  {tr(lang, 'Analitik xulosa', 'Аналитическая сводка прогноза', 'Executive Threat Assessment')}
                </h2>
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  {result.generatedAt.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
                {result.forecast.executiveBrief}
              </p>

              {/* Baseline vs Projected Chart */}
              {timelineChart && (
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
                      <BarChart3 className="h-3.5 w-3.5 text-[var(--accent)]" />
                      {tr(lang, 'Bazaviy va prognoz qilinayotgan dinamika', 'Траектория инцидентов: база vs прогноз', 'Baseline vs. Projected Incident Trajectory')}
                    </span>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-3 rounded-xs bg-[var(--muted)]" />
                        {tr(lang, 'Bazaviy', 'База', 'Baseline')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-3 rounded-xs bg-[var(--gold)]" />
                        {tr(lang, 'Prognoz', 'Прогноз', 'Forecast')}
                      </span>
                    </div>
                  </div>
                  <svg
                    viewBox={`0 0 ${timelineChart.width} ${timelineChart.height}`}
                    className="h-auto w-full"
                  >
                    {[0.25, 0.5, 0.75, 1].map((f) => {
                      const y = timelineChart.padY + timelineChart.innerH * (1 - f);
                      return (
                        <g key={f}>
                          <line
                            x1={timelineChart.padX}
                            y1={y}
                            x2={timelineChart.width - timelineChart.padX}
                            y2={y}
                            stroke="var(--line)"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={timelineChart.padX - 6}
                            y={y + 3}
                            fill="var(--muted)"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            {Math.round(timelineChart.maxVal * f)}
                          </text>
                        </g>
                      );
                    })}
                    <path d={timelineChart.bandArea} fill="rgba(212, 168, 67, 0.14)" />
                    <path
                      d={timelineChart.baseLine}
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                    <path d={timelineChart.projLine} fill="none" stroke="#d4a843" strokeWidth="2.6" />
                    {timelineChart.pts.map((p, idx) => (
                      <g key={p.label + idx}>
                        <circle
                          cx={timelineChart.xAt(idx)}
                          cy={timelineChart.yAt(p.projected)}
                          r="3.8"
                          fill="#d4a843"
                          stroke="#060d18"
                          strokeWidth="1.2"
                        />
                        <text
                          x={timelineChart.xAt(idx)}
                          y={timelineChart.height - 6}
                          fill="var(--muted)"
                          fontSize="9.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              )}
            </section>
          </div>

          {/* Emerging Crime Vectors */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--text)]">
              {tr(
                lang,
                'Kutilayotgan kiberjinoyat yo‘nalishlari va profilaktika choralari',
                'Прогнозируемые векторы киберпреступлений и меры упреждения',
                'Predicted Crime Vectors & Preventive Measures'
              )}
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {result.forecast.predictedThreats.map((threat, idx) => {
                const targetArtId = resolveArticleId(threat.articleId, threat.articleCode);
                return (
                  <article
                    key={`${threat.title}-${idx}`}
                    className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-[10px] font-bold uppercase text-[var(--muted)]">
                            {threat.category} · {threat.projectedCasesDelta}
                          </div>
                          <h3 className="mt-0.5 text-sm font-extrabold text-[var(--text)]">
                            {threat.title}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-mono text-lg font-extrabold tabular-nums ${riskColor(threat.probabilityPct)}`}>
                            {threat.probabilityPct}%
                          </div>
                          <div className="font-mono text-[9px] uppercase text-[var(--muted)]">
                            {tr(lang, 'ehtimol', 'вероятность', 'prob.')}
                          </div>
                        </div>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel2)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${Math.min(100, Math.max(5, threat.probabilityPct))}%` }}
                        />
                      </div>

                      <p className="text-xs leading-relaxed text-[var(--secondary-text)]">
                        {threat.mechanismForecast}
                      </p>

                      <div className="text-[11px] text-[var(--muted)]">
                        <span className="font-semibold text-[var(--text)]">
                          {tr(lang, 'Nishon auditoriya:', 'Целевая группа:', 'Target Group:')}{' '}
                        </span>
                        {threat.targetAudience}
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-2.5">
                          <div className="mb-1 font-mono text-[10px] font-bold uppercase text-[var(--gold)]">
                            {tr(lang, 'Erta indikatorlar', 'Ранние признаки', 'Early Triggers')}
                          </div>
                          <ul className="space-y-1 text-[11px] text-[var(--secondary-text)]">
                            {threat.earlyIndicators.slice(0, 3).map((ind, i) => (
                              <li key={i} className="flex gap-1.5">
                                <span className="text-[var(--gold)]">•</span>
                                <span>{ind}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-2.5">
                          <div className="mb-1 font-mono text-[10px] font-bold uppercase text-[var(--ok)]">
                            {tr(lang, 'Oldini olish choralari', 'Меры упреждения', 'Prevention Actions')}
                          </div>
                          <ul className="space-y-1 text-[11px] text-[var(--secondary-text)]">
                            {threat.preventiveMeasures.slice(0, 3).map((pm, i) => (
                              <li key={i} className="flex gap-1.5">
                                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ok)]" />
                                <span>{pm}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs">
                      <span className="font-mono font-bold text-[var(--accent)]">
                        {threat.articleCode}
                      </span>
                      {targetArtId && (
                        <button
                          type="button"
                          onClick={() => onNavigate('art', { a: targetArtId })}
                          className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                        >
                          <span>{tr(lang, 'Algoritmni ochish', 'Алгоритм расследования', 'Open Algorithm')}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Regional Hotspots Table */}
          {result.forecast.regionalHotspots.length > 0 && (
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                  <Shield className="h-4 w-4 text-[var(--gold)]" />
                  <span>
                    {tr(lang, 'Yuqori xavf hududlari', 'Регионы повышенного внимания', 'Elevated Risk Regional Hotspots')}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  {t('p_reports', lang)} →
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {result.forecast.regionalHotspots.map((spot, i) => (
                  <div
                    key={`${spot.regionName}-${i}`}
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--text)]">{spot.regionName}</span>
                      <span className={`font-mono font-extrabold tabular-nums ${riskColor(spot.riskScore)}`}>
                        {spot.riskScore}/100
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] font-semibold text-[var(--accent)]">
                      {spot.primaryVector}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--secondary-text)]">
                      {spot.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
