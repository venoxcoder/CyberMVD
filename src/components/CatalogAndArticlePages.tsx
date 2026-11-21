import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Printer,
  Search,
  Square,
} from 'lucide-react';
import { ART, expandSteps, keysOfMethod, stepsOfMethod } from '../data/crimeData';
import type { Lang, PageId } from '../types';
import { artLabel, t, tx } from '../utils/i18n';
import { CaseBar, PageHeader } from './CommonUI';

function renderHighlighted(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="hl">{match}</mark>
      {after}
    </>
  );
}

interface CatalogPageProps {
  lang: Lang;
  initialView?: string;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId, opts?: { a?: string; m?: string; view?: string }) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  lang,
  initialView,
  canGoBack,
  onBack,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'articles' | 'methods'>(
    initialView === 'methods' ? 'methods' : 'articles'
  );

  const groups = useMemo(() => Array.from(new Set(ART.map((a) => a.g))), []);
  const qLower = query.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    return ART.filter((a) => {
      if (groupFilter !== 'ALL' && a.g !== groupFilter) return false;
      if (!qLower) return true;
      const fields = [
        a.code,
        a.title,
        a.about,
        ...a.qual,
        ...a.m.flatMap((m) => [m.n, m.mech, m.key, ...m.stages.flatMap((s) => expandSteps(s.s))]),
      ];
      const rawHay = fields.join(' ').toLowerCase();
      const txHay = fields.map((f) => tx(f, lang)).join(' ').toLowerCase();
      return rawHay.includes(qLower) || txHay.includes(qLower);
    });
  }, [groupFilter, qLower, lang]);

  const allMethods = useMemo(() => {
    const rows: { article: (typeof ART)[number]; method: (typeof ART)[number]['m'][number] }[] = [];
    for (const a of filteredArticles) {
      for (const m of a.m) {
        if (!qLower) {
          rows.push({ article: a, method: m });
          continue;
        }
        const fields = [
          a.code,
          a.title,
          m.n,
          m.mech,
          m.key,
          ...m.stages.flatMap((s) => expandSteps(s.s)),
        ];
        const rawHay = fields.join(' ').toLowerCase();
        const txHay = fields.map((f) => tx(f, lang)).join(' ').toLowerCase();
        if (rawHay.includes(qLower) || txHay.includes(qLower)) {
          rows.push({ article: a, method: m });
        }
      }
    }
    return rows;
  }, [filteredArticles, qLower, lang]);

  return (
    <div>
      <PageHeader
        lang={lang}
        eyebrow={t('e_catalog', lang)}
        title={t('p_catalog', lang)}
        subtitle={t('catDesc', lang)}
        canGoBack={canGoBack}
        onBack={onBack}
      />

      {/* Search & Mode Bar */}
      <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('catSearch', lang)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] py-2 pr-3 pl-9 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="ALL">{t('allGroups', lang)}</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {tx(g, lang)}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('articles')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'articles'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              {t('viewArticles', lang)}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('methods')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'methods'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              {t('viewMethods', lang)}
            </button>
          </div>
        </div>
        <div className="mt-2.5 font-mono text-xs text-[var(--muted)]">
          {t('foundN', lang, viewMode === 'articles' ? filteredArticles.length : allMethods.length)}
        </div>
      </div>

      {viewMode === 'articles' ? (
        filteredArticles.length === 0 ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
            {t('noResults', lang)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredArticles.map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--accent)]"
              >
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[var(--accent)]">
                      {artLabel(a.code, lang)}
                    </span>
                    <span className="text-[var(--muted)]">
                      {t('nMethods', lang, a.m.length)} · {tx(a.g, lang)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text)]">
                    {renderHighlighted(tx(a.title, lang), query)}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--secondary-text)]">
                    {renderHighlighted(tx(a.about, lang), query)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
                  <div className="text-[11px] font-mono text-[var(--muted)]">
                    {t('pillCity', lang, tx(a.st.t, lang))} · {t('pillRegion', lang, tx(a.st.x, lang))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('art', { a: a.id, m: a.m[0]?.id })}
                    className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                  >
                    {t('open', lang)} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : allMethods.length === 0 ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
          {t('noResults', lang)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {allMethods.map(({ article, method }) => (
            <div
              key={method.id}
              className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--accent)]"
            >
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-bold text-[var(--accent)]">
                    {artLabel(article.code, lang)}
                  </span>
                  <span className="font-mono text-[var(--muted)]">
                    {stepsOfMethod(method).flat().length} {lang === 'ru' ? 'шагов' : lang === 'en' ? 'steps' : 'qadam'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--text)]">
                  {renderHighlighted(tx(method.n, lang), query)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--secondary-text)]">
                  {renderHighlighted(tx(method.mech, lang), query)}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                <span className="truncate pr-2 text-[11px] text-[var(--muted)]">
                  {tx(article.title, lang)}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('art', { a: article.id, m: method.id })}
                  className="shrink-0 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                >
                  {t('open', lang)} →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface ArticleDetailPageProps {
  lang: Lang;
  articleId: string;
  methodId?: string;
  caseNo: string;
  onCaseNoChange: (val: string) => void;
  ticks: Record<string, boolean>;
  onToggleTick: (key: string) => void;
  onClearTicks: (keys: string[]) => void;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId, opts?: { a?: string; m?: string }) => void;
  onToast: (msg: string) => void;
}

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({
  lang,
  articleId,
  methodId,
  caseNo,
  onCaseNoChange,
  ticks,
  onToggleTick,
  onClearTicks,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const article = ART.find((x) => x.id === articleId);
  const [openStages, setOpenStages] = useState<Record<number, boolean>>({ 0: true, 1: true });

  if (!article) {
    return (
      <div>
        <PageHeader
          lang={lang}
          eyebrow={t('e_art', lang)}
          title={t('notFound', lang)}
          canGoBack={canGoBack}
          onBack={onBack}
          backLabel={t('backToCat', lang)}
        />
      </div>
    );
  }

  const method = article.m.find((x) => x.id === methodId) || article.m[0];
  const stageSteps = method ? stepsOfMethod(method) : [];
  const methodKeys = method ? keysOfMethod(method) : [];
  const doneCount = methodKeys.filter((k) => ticks[k]).length;

  const handleCopyAlgorithm = async () => {
    if (!method) return;
    const lines = [
      `${artLabel(article.code, lang)} — ${tx(article.title, lang)}`,
      `${t('methodH', lang)} ${tx(method.n, lang)}`,
      caseNo ? `${t('caseWord', lang)} #${caseNo}` : '',
      '',
    ];
    method.stages.forEach((st, si) => {
      lines.push(`## ${tx(st.t, lang)}`);
      stageSteps[si].forEach((step, idx) => {
        const key = `${method.id}|${si}|${idx}`;
        lines.push(`${ticks[key] ? '[x]' : '[ ]'} ${tx(step, lang)}`);
      });
      lines.push('');
    });
    try {
      await navigator.clipboard.writeText(lines.filter((l) => l !== undefined).join('\n'));
      onToast(t('copied', lang));
    } catch {
      onToast(t('copyFail', lang));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={`${t('e_art', lang)} · ${tx(article.g, lang)}`}
        title={`${artLabel(article.code, lang)} — ${tx(article.title, lang)}`}
        subtitle={tx(article.about, lang)}
        canGoBack={canGoBack}
        onBack={onBack}
        backLabel={t('back', lang)}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{t('print', lang)}</span>
          </button>
        }
      />

      {/* Qualification & Regional stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 lg:col-span-2">
          <h2 className="mb-2.5 text-sm font-bold text-[var(--text)]">{t('qualH', lang)}</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[var(--secondary-text)]">
            {article.qual.map((q) => (
              <li key={q}>{tx(q, lang)}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-3 text-sm font-bold text-[var(--text)]">
            {lang === 'ru' ? 'Статистика' : lang === 'en' ? 'Statistics' : 'Statistika'}
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-lg bg-[var(--panel2)] px-3 py-2">
              <span className="text-[var(--muted)]">{lang === 'ru' ? 'г. Ташкент' : lang === 'en' ? 'Tashkent' : 'Toshkent sh.'}</span>
              <span className="font-mono font-bold text-[var(--accent)]">{tx(article.st.t, lang)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--panel2)] px-3 py-2">
              <span className="text-[var(--muted)]">{lang === 'ru' ? 'Область' : lang === 'en' ? 'Region' : 'Viloyat'}</span>
              <span className="font-mono font-bold text-[var(--text)]">{tx(article.st.x, lang)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Method Selector Tabs */}
      {article.m.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[var(--muted)]">{t('methodH', lang)}</span>
          {article.m.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onNavigate('art', { a: article.id, m: m.id })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                method?.id === m.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] bg-[var(--panel)] text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              {tx(m.n, lang)}
              {m.x ? ` (${tx(m.x, lang)})` : ''}
            </button>
          ))}
        </div>
      )}

      {method && (
        <>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--accent)]">{t('mechH', lang)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{tx(method.mech, lang)}</p>
            </div>
            {method.extra && (
              <div className="rounded-lg bg-[var(--panel2)] p-3.5 text-xs leading-relaxed text-[var(--secondary-text)]">
                <span className="font-bold text-[var(--text)]">{t('extraH', lang)}: </span>
                {tx(method.extra, lang)}
              </div>
            )}
            <div>
              <h3 className="mb-2 text-sm font-bold text-[var(--text)]">{t('versH', lang)}</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {method.vers.map(([title, desc]) => (
                  <div key={title} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                    <div className="text-xs font-bold text-[var(--text)]">{tx(title, lang)}</div>
                    <div className="mt-0.5 text-xs text-[var(--secondary-text)]">{tx(desc, lang)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <CaseBar
            lang={lang}
            caseNo={caseNo}
            onCaseNoChange={onCaseNoChange}
            doneCount={doneCount}
            totalCount={methodKeys.length}
            onCopy={handleCopyAlgorithm}
            onClear={() => {
              onClearTicks(methodKeys);
              onToast(t('marksCleared', lang));
            }}
            onPrint={() => window.print()}
          />

          {/* Interactive Stages */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[var(--text)]">{t('algH', lang)}</h3>
            {method.stages.map((st, si) => {
              const isOpen = openStages[si] ?? true;
              const steps = stageSteps[si] || [];
              return (
                <div key={st.t + si} className="rounded-xl border border-[var(--line)] bg-[var(--panel)]">
                  <button
                    type="button"
                    onClick={() => setOpenStages((prev) => ({ ...prev, [si]: !isOpen }))}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-[var(--accent)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                      )}
                      <span className="text-sm font-bold text-[var(--text)]">{tx(st.t, lang)}</span>
                    </div>
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {t('stepsN', lang, steps.length)}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                      {steps.map((step, idx) => {
                        const key = `${method.id}|${si}|${idx}`;
                        const checked = !!ticks[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onToggleTick(key)}
                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hover-bg)]"
                          >
                            {checked ? (
                              <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" />
                            ) : (
                              <Square className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                            )}
                            <span
                              className={`text-xs leading-relaxed sm:text-sm ${
                                checked ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'
                              }`}
                            >
                              {tx(step, lang)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Key, Mistakes, Examinations */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="mb-1.5 text-xs font-bold uppercase text-[var(--accent)]">{t('keyH', lang)}</div>
              <p className="text-xs leading-relaxed text-[var(--text)]">{tx(method.key, lang)}</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="mb-1.5 text-xs font-bold uppercase text-[var(--orange)]">{t('errH', lang)}</div>
              <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--secondary-text)]">
                {method.err.map((e) => (
                  <li key={e}>{tx(e, lang)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[var(--blue)]">{t('expH', lang)}</span>
                <button
                  type="button"
                  onClick={() => onNavigate('expert')}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                >
                  {t('p_expert', lang)} →
                </button>
              </div>
              <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--secondary-text)]">
                {method.exp.map((ex) => (
                  <li key={ex}>{tx(ex, lang)}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
