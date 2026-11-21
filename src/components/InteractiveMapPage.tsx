import React, { useMemo, useState } from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';
import { HOME_STATS } from '../data/crimeData';
import { MAP_INCIDENTS } from '../data/platformData';
import type { Lang, MapIncident, PageId } from '../types';
import { pickText, t, tx } from '../utils/i18n';
import { PageHeader } from './CommonUI';

interface InteractiveMapPageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId, opts?: { a?: string }) => void;
}

type ThreatFilter = 'all' | MapIncident['threatType'];

export const InteractiveMapPage: React.FC<InteractiveMapPageProps> = ({
  lang,
  canGoBack,
  onBack,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<ThreatFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(MAP_INCIDENTS[0].id);

  const visibleIncidents = useMemo(
    () => MAP_INCIDENTS.filter((inc) => filter === 'all' || inc.threatType === filter),
    [filter]
  );

  const selected =
    visibleIncidents.find((i) => i.id === selectedId) || visibleIncidents[0] || null;

  const filters: { id: ThreatFilter; label: string }[] = [
    { id: 'all', label: lang === 'ru' ? 'Все типы' : lang === 'en' ? 'All Threats' : 'Barchasi' },
    { id: 'apk', label: lang === 'ru' ? 'APK-трояны' : lang === 'en' ? 'APK Malware' : 'APK zararli dastur' },
    { id: 'simbox', label: 'SIM-Box' },
    { id: 'phishing', label: lang === 'ru' ? 'Фишинг' : lang === 'en' ? 'Phishing' : 'Fishing' },
    { id: 'crypto', label: lang === 'ru' ? 'Крипто / P2P' : lang === 'en' ? 'Crypto / P2P' : 'Kripto / P2P' },
    { id: 'leak', label: lang === 'ru' ? 'Утечка данных' : lang === 'en' ? 'Data Leak' : 'Ma’lumot sizishi' },
    { id: 'ransomware', label: lang === 'ru' ? 'Вымогатели' : lang === 'en' ? 'Ransomware' : 'Tovlamachi dastur' },
  ];

  const severityLabel = (sev: MapIncident['severity']) =>
    sev === 'critical'
      ? lang === 'ru'
        ? 'Критический'
        : lang === 'en'
          ? 'Critical'
          : 'Kritik'
      : sev === 'high'
        ? lang === 'ru'
          ? 'Высокий'
          : lang === 'en'
            ? 'High'
            : 'Yuqori'
        : lang === 'ru'
          ? 'Средний'
          : lang === 'en'
            ? 'Medium'
            : 'O‘rta';

  const pinColor = (sev: MapIncident['severity']) =>
    sev === 'critical' ? '#ff6b78' : sev === 'high' ? '#ffb45e' : '#36d6c3';

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_map', lang)}
        title={t('p_map', lang)}
        subtitle={
          lang === 'ru'
            ? 'Интерактивная карта учебных киберинцидентов с фильтрами по типам угроз и отдельным блоком официальной региональной статистики.'
            : lang === 'en'
              ? 'Interactive map of fictional training cyber incidents with threat filters and clearly separated official reference statistics.'
              : 'O‘quv kiber-hodisalar interaktiv xaritasi va alohida ajratilgan rasmiy hududiy statistika.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
      />

      {/* Explicit separation notice */}
      <div className="flex items-start gap-3 rounded-xl border border-[var(--blue)]/40 bg-[var(--blue)]/10 p-3.5 text-xs text-[var(--text)]">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" />
        <div>
          <span className="font-mono font-bold text-[var(--blue)]">{t('trainingBadge', lang)}: </span>
          {lang === 'ru'
            ? 'Точки на карте представляют вымышленные учебные кибер-узлы для отработки навыков атрибуции. Официальная статистика представлена отдельно ниже.'
            : lang === 'en'
              ? 'Map pins represent simulated training threat nodes. Official reference statistics are displayed separately in the bottom panel.'
              : 'Xaritadagi nuqtalar o‘quv mashg‘ulotlari uchun modellashtirilgan. Rasmiy statistika quyida alohida berilgan.'}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f.id
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'border-[var(--line)] bg-[var(--panel)] text-[var(--secondary-text)] hover:text-[var(--text)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* SVG Map Canvas */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[var(--accent)]">
              {lang === 'ru'
                ? 'ГЕО-КИБЕР РАЗВЕДКА [УЧЕБНАЯ МОДЕЛЬ]'
                : lang === 'en'
                  ? 'GEO-CYBER INTELLIGENCE VIEW [SIMULATION]'
                  : 'GEO-KIBER RAZVEDKA [O‘QUV MODELI]'}
            </span>
            <span className="text-[var(--muted)]">
              {visibleIncidents.length} {lang === 'ru' ? 'узлов' : lang === 'en' ? 'nodes' : 'tugun'}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[#071120]">
            <svg viewBox="0 0 1000 500" className="h-auto w-full block">
              {/* Latitude/Longitude Grid */}
              {[100, 200, 300, 400].map((y) => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#1b2d47" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              {[200, 400, 600, 800].map((x) => (
                <line key={x} x1={x} y1="0" x2={x} y2="500" stroke="#1b2d47" strokeWidth="1" strokeDasharray="4 4" />
              ))}

              {/* Simplified World Continent Silhouettes */}
              {/* North America */}
              <path d="M90,85 L275,75 L315,155 L260,225 L210,245 L170,225 L120,165 Z" fill="#13233b" stroke="#284266" strokeWidth="1.5" />
              {/* South America */}
              <path d="M235,260 L325,275 L350,340 L300,445 L255,435 L235,340 Z" fill="#13233b" stroke="#284266" strokeWidth="1.5" />
              {/* Europe */}
              <path d="M445,85 L575,75 L595,145 L540,175 L465,165 L440,130 Z" fill="#13233b" stroke="#284266" strokeWidth="1.5" />
              {/* Africa */}
              <path d="M460,185 L580,185 L615,265 L560,395 L495,385 L455,275 Z" fill="#13233b" stroke="#284266" strokeWidth="1.5" />
              {/* Asia + Central Asia */}
              <path d="M580,75 L880,90 L905,195 L825,265 L715,260 L635,220 L585,155 Z" fill="#13233b" stroke="#284266" strokeWidth="1.5" />
              {/* Australia */}
              <path d="M775,325 L885,330 L895,405 L795,410 L765,365 Z" fill="#13233b" stroke="#284266" strokeWidth="1.5" />

              {/* Connection Arcs to Tashkent node */}
              {visibleIncidents.map((inc) => {
                const cx = (inc.coords[0] / 100) * 1000;
                const cy = (inc.coords[1] / 100) * 500;
                if (inc.id === 'map_1') return null;
                return (
                  <line
                    key={`arc_${inc.id}`}
                    x1={cx}
                    y1={cy}
                    x2={682}
                    y2={172.5}
                    stroke="#36d6c3"
                    strokeOpacity="0.28"
                    strokeWidth="1.4"
                    strokeDasharray="5 4"
                  />
                );
              })}

              {/* Incident Pins */}
              {visibleIncidents.map((inc) => {
                const cx = (inc.coords[0] / 100) * 1000;
                const cy = (inc.coords[1] / 100) * 500;
                const isSel = selected?.id === inc.id;
                const col = pinColor(inc.severity);
                return (
                  <g
                    key={inc.id}
                    onClick={() => setSelectedId(inc.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSel ? 18 : 11}
                      fill={col}
                      fillOpacity={isSel ? 0.28 : 0.16}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSel ? 7.5 : 5.5}
                      fill={col}
                      stroke="#ffffff"
                      strokeWidth={isSel ? 2 : 1}
                    />
                    <text
                      x={cx + 11}
                      y={cy + 4}
                      fill="#e2e8f0"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {inc.threatType.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Incident Dossier */}
        <aside className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[var(--accent)]">{t('trainingBadge', lang)}</span>
                <span className="uppercase text-[var(--orange)]">{severityLabel(selected.severity)}</span>
              </div>
              <h2 className="text-base font-bold text-[var(--text)]">
                {pickText(selected.title, lang)}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{selected.country} · {selected.date}</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--secondary-text)]">
                {pickText(selected.summary, lang)}
              </p>
              <div>
                <div className="mb-1.5 text-xs font-bold text-[var(--text)]">
                  {lang === 'ru' ? 'Индикаторы компрометации (IOC):' : lang === 'en' ? 'IOC Indicators:' : 'IOC indikatorlari:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.iocs.map((ioc) => (
                    <code key={ioc} className="rounded bg-[var(--panel2)] px-2 py-1 font-mono text-[11px] text-[var(--accent)]">
                      {ioc}
                    </code>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('art', { a: selected.relatedArticleId })}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
              >
                {lang === 'ru' ? 'Открыть алгоритм расследования →' : lang === 'en' ? 'Open Investigation Algorithm →' : 'Tergov algoritmini ochish →'}
              </button>
            </>
          ) : null}

          <div className="border-t border-[var(--line)] pt-3 space-y-1.5">
            {visibleIncidents.map((inc) => (
              <button
                key={inc.id}
                type="button"
                onClick={() => setSelectedId(inc.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs ${
                  selected?.id === inc.id
                    ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                    : 'text-[var(--secondary-text)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                <span className="truncate pr-2">{pickText(inc.title, lang)}</span>
                <span className="font-mono text-[10px] uppercase">{inc.threatType}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* Official Reference Statistics Panel (Explicitly separated from fictional map nodes) */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[var(--text)]">{t('statsTitle', lang)}</h2>
          <span className="font-mono text-[11px] font-bold uppercase text-[var(--ok)]">
            {t('officialBadge', lang)}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HOME_STATS.map(([val, label]) => (
            <div key={val + label} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <div className="font-mono text-xl font-extrabold tabular-nums text-[var(--accent)]">{tx(val, lang)}</div>
              <div className="mt-1 text-xs text-[var(--secondary-text)]">{tx(label, lang)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
