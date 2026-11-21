import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  FileText,
  HardDrive,
  History,
  Scale,
  Search,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ART } from '../data/crimeData';
import { KB_ARTICLES } from '../data/platformData';
import type { GlobalSearchResultItem, Lang, PageId } from '../types';
import { pickText, tx } from '../utils/i18n';
import { lsJSON, lsSetJSON } from '../utils/storage';
import { StatusBadge } from './CommonUI';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  onNavigate: (
    page: PageId,
    opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
  ) => void;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={idx} className="hl">
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  open,
  onClose,
  lang,
  onNavigate,
}) => {
  const { apiFetch, aiConfigured, permissions } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | GlobalSearchResultItem['kind']>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [serverResults, setServerResults] = useState<GlobalSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [recentQueries, setRecentQueries] = useState<string[]>(() =>
    lsJSON<string[]>('kj_recent_searches', ['APK', 'TRN-2026-014', 'SHA-256', '278-6'])
  );

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (typeFilter !== 'all') params.set('type', typeFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
        const data = await apiFetch<{ results: GlobalSearchResultItem[] }>(
          `/api/search?${params.toString()}`
        );
        if (!cancelled) setServerResults(data.results || []);
      } catch {
        if (!cancelled) setServerResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, typeFilter, statusFilter, fromDate, toDate, apiFetch]);

  // Client-side reference search across KB 2.0 and Criminal Code 25 articles / 41 methods
  const referenceResults = useMemo<GlobalSearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const out: GlobalSearchResultItem[] = [];

    if (typeFilter === 'all' || typeFilter === 'catalog') {
      for (const a of ART) {
        const title = `${a.code} — ${tx(a.title, lang)}`;
        const about = tx(a.about, lang);
        if (!q || `${title} ${about}`.toLowerCase().includes(q)) {
          out.push({
            id: `cat_${a.id}`,
            kind: 'catalog',
            title,
            snippet: about.slice(0, 140),
            targetPage: 'art',
            routeOpts: { a: a.id, m: a.m[0]?.id },
          });
        }
        for (const m of a.m) {
          const mTitle = `${tx(m.n, lang)} (ст. ${a.code})`;
          const mMech = tx(m.mech, lang);
          if (q && `${mTitle} ${mMech}`.toLowerCase().includes(q)) {
            out.push({
              id: `meth_${a.id}_${m.id}`,
              kind: 'catalog',
              title: mTitle,
              snippet: mMech.slice(0, 140),
              targetPage: 'art',
              routeOpts: { a: a.id, m: m.id },
            });
          }
        }
      }
    }

    if (typeFilter === 'all' || typeFilter === 'kb') {
      for (const kb of KB_ARTICLES) {
        const title = pickText(kb.title, lang);
        const sum = pickText(kb.summary, lang);
        const body = pickText(kb.content, lang);
        if (!q || `${title} ${sum} ${body} ${kb.tags.join(' ')}`.toLowerCase().includes(q)) {
          out.push({
            id: `kb_${kb.id}`,
            kind: 'kb',
            title,
            snippet: sum,
            targetPage: 'knowledge',
          });
        }
      }
    }

    return out.slice(0, q ? 20 : 6);
  }, [query, typeFilter, lang]);

  const combinedResults = useMemo(
    () => [...serverResults, ...referenceResults].slice(0, 50),
    [serverResults, referenceResults]
  );

  const suggestions = useMemo(() => {
    const base = ['TRN-2026-014', 'APK', '278-6', 'EV-2026-001', 'SIM-Box', '185.220.101.44'];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q);
  }, [query]);

  const handleSelectResult = (item: GlobalSearchResultItem) => {
    if (query.trim()) {
      const next = [query.trim(), ...recentQueries.filter((x) => x !== query.trim())].slice(0, 6);
      setRecentQueries(next);
      lsSetJSON('kj_recent_searches', next);
    }
    onNavigate(item.targetPage, item.routeOpts);
    onClose();
  };

  const handleAiAssist = async () => {
    if (!query.trim() || !aiConfigured || !permissions?.ai_use) return;
    setAiLoading(true);
    setAiHint(null);
    try {
      const res = await apiFetch<{ hint: string }>('/api/ai/search-assist', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), lang }),
      });
      setAiHint(res.hint);
    } catch {
      setAiHint(null);
    } finally {
      setAiLoading(false);
    }
  };

  if (!open) return null;

  const kindIcon = (kind: GlobalSearchResultItem['kind']) => {
    switch (kind) {
      case 'case':
        return Briefcase;
      case 'evidence':
        return HardDrive;
      case 'material':
      case 'report':
        return FileText;
      case 'catalog':
        return Scale;
      case 'kb':
        return BookOpen;
      case 'audit':
        return Shield;
      default:
        return FileText;
    }
  };

  const kindLabel = (kind: GlobalSearchResultItem['kind']) => {
    const map: Record<GlobalSearchResultItem['kind'], Record<Lang, string>> = {
      case: { uz: 'Ish', ru: 'Дело', en: 'Case' },
      material: { uz: 'Material', ru: 'Материал', en: 'Material' },
      evidence: { uz: 'Dalil', ru: 'Доказательство', en: 'Evidence' },
      kb: { uz: 'Bilimlar bazasi', ru: 'База знаний', en: 'KB 2.0' },
      catalog: { uz: 'JK / Usul', ru: 'УК / Способ', en: 'Article / Method' },
      report: { uz: 'Hisobot', ru: 'Отчёт', en: 'Report' },
      audit: { uz: 'Audit', ru: 'Аудит', en: 'Audit' },
    };
    return map[kind][lang];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-12 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <Search className="h-4.5 w-4.5 shrink-0 text-[var(--accent)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === 'ru'
                ? 'Поиск по делам, материалам, SHA-256, статьям УК, базе знаний, отчётам...'
                : lang === 'en'
                  ? 'Search across accessible cases, evidence, SHA-256, Criminal Code, KB, reports...'
                  : 'Ishlar, dalillar, SHA-256, JK moddalari va bilimlar bazasidan qidirish...'
            }
            className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          {aiConfigured && permissions?.ai_use && query.trim().length > 2 && (
            <button
              type="button"
              onClick={handleAiAssist}
              disabled={aiLoading}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
            >
              <Sparkles className="h-3 w-3" />
              <span>{aiLoading ? '...' : 'AI'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel2)]/50 px-4 py-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 text-xs"
          >
            <option value="all">{lang === 'ru' ? 'Все типы' : lang === 'en' ? 'All types' : 'Barcha turlar'}</option>
            <option value="case">{kindLabel('case')}</option>
            <option value="evidence">{kindLabel('evidence')}</option>
            <option value="material">{kindLabel('material')}</option>
            <option value="catalog">{kindLabel('catalog')}</option>
            <option value="kb">{kindLabel('kb')}</option>
            <option value="report">{kindLabel('report')}</option>
            {permissions?.audit_read && <option value="audit">{kindLabel('audit')}</option>}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 text-xs"
          >
            <option value="all">{lang === 'ru' ? 'Любой статус' : lang === 'en' ? 'Any status' : 'Istalgan holat'}</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="pending_review">pending_review</option>
            <option value="verified">verified</option>
            <option value="pending">pending</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="From date"
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[11px]"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="To date"
            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[11px]"
          />

          <span className="ml-auto font-mono text-[10px] text-[var(--muted)]">
            {lang === 'ru'
              ? 'Только доступные по RBAC'
              : lang === 'en'
                ? 'RBAC-scoped results'
                : 'RBAC bo‘yicha cheklangan'}
          </span>
        </div>

        {/* Recent & Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] px-4 py-2 text-[11px]">
          <History className="h-3.5 w-3.5 text-[var(--muted)]" />
          {recentQueries.slice(0, 4).map((rq) => (
            <button
              key={rq}
              type="button"
              onClick={() => setQuery(rq)}
              className="rounded border border-[var(--line)] bg-[var(--panel2)] px-2 py-0.5 font-mono text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              {rq}
            </button>
          ))}
          {suggestions.slice(0, 3).map((sg) => (
            <button
              key={sg}
              type="button"
              onClick={() => setQuery(sg)}
              className="rounded border border-dashed border-[var(--line)] px-2 py-0.5 font-mono text-[var(--muted)] hover:text-[var(--accent)]"
            >
              + {sg}
            </button>
          ))}
        </div>

        {aiHint && (
          <div className="border-b border-[var(--line)] bg-[var(--accent-soft)] px-4 py-2.5 text-xs text-[var(--text)]">
            <span className="mr-1.5 font-mono font-bold text-[var(--accent)]">[AI]:</span>
            {aiHint}
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--line)]">
          {loading && combinedResults.length === 0 ? (
            <div className="space-y-2 p-4">
              <div className="skeleton-block h-12 w-full" />
              <div className="skeleton-block h-12 w-full" />
              <div className="skeleton-block h-12 w-full" />
            </div>
          ) : combinedResults.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-[var(--muted)]">
              {lang === 'ru'
                ? 'Совпадений в доступном контуре не найдено.'
                : lang === 'en'
                  ? 'No accessible records matched your query.'
                  : 'Ruxsat etilgan doirada mos yozuvlar topilmadi.'}
            </div>
          ) : (
            combinedResults.map((item) => {
              const Icon = kindIcon(item.kind);
              return (
                <button
                  key={`${item.kind}_${item.id}`}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hover-bg)]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--line)] bg-[var(--panel2)] text-[var(--accent)]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase text-[var(--muted)]">
                          {kindLabel(item.kind)}
                        </span>
                        <span className="truncate text-xs font-bold text-[var(--text)]">
                          <HighlightText text={item.title} query={query} />
                        </span>
                        {item.status && <StatusBadge status={item.status} lang={lang} />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--secondary-text)]">
                        <HighlightText text={item.snippet} query={query} />
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
                    {item.date && <span>{item.date.slice(0, 10)}</span>}
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--accent)]" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
