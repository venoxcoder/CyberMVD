import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { CONCEPTS } from '../data/crimeData';
import { KB_ARTICLES } from '../data/platformData';
import type { KBArticle, Lang } from '../types';
import { pickText, t } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

interface KnowledgeBasePageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}

type KbFilter = 'all' | 'cybercrime' | 'evidence' | 'osint' | 'security' | 'standards' | 'glossary' | 'bookmarks';

export const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({
  lang,
  canGoBack,
  onBack,
  onToast,
}) => {
  const customArticles = lsJSON<KBArticle[]>('kj_admin_kb', []);
  const allArticles = useMemo(() => [...KB_ARTICLES, ...customArticles], [customArticles]);

  const [category, setCategory] = useState<KbFilter>('all');
  const [query, setQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<string[]>(() =>
    lsJSON<string[]>('kj_kb_bookmarks', [])
  );
  const [readIds, setReadIds] = useState<string[]>(() =>
    lsJSON<string[]>('kj_kb_read', [])
  );
  const [selectedId, setSelectedId] = useState<string>(allArticles[0]?.id || '');

  const toggleBookmark = (id: string) => {
    const next = bookmarks.includes(id)
      ? bookmarks.filter((x) => x !== id)
      : [...bookmarks, id];
    setBookmarks(next);
    lsSetJSON('kj_kb_bookmarks', next);
    onToast(
      bookmarks.includes(id)
        ? lang === 'ru'
          ? 'Удалено из закладок'
          : lang === 'en'
            ? 'Removed from bookmarks'
            : 'Xatcho‘pdan olib tashlandi'
        : lang === 'ru'
          ? 'Добавлено в закладки'
          : lang === 'en'
            ? 'Bookmarked'
            : 'Xatcho‘pga saqlandi'
    );
  };

  const markRead = (id: string) => {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    lsSetJSON('kj_kb_read', next);
    logActivity('knowledge', `Read KB article ${id}`);
  };

  const qLower = query.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    return allArticles.filter((a) => {
      if (category === 'bookmarks' && !bookmarks.includes(a.id)) return false;
      if (category !== 'all' && category !== 'bookmarks' && a.category !== category) return false;
      if (!qLower) return true;
      const hay = [
        pickText(a.title, lang),
        pickText(a.summary, lang),
        pickText(a.content, lang),
        ...a.tags,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(qLower);
    });
  }, [allArticles, category, bookmarks, qLower, lang]);

  const filteredConcepts = useMemo(() => {
    if (category !== 'all' && category !== 'glossary') return [];
    const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
    return CONCEPTS.filter(([term, def]) => {
      if (!qLower) return true;
      return `${term[idx]} ${def[idx]}`.toLowerCase().includes(qLower);
    });
  }, [category, qLower, lang]);

  const activeArticle =
    filteredArticles.find((a) => a.id === selectedId) || filteredArticles[0] || null;

  const cats: { id: KbFilter; label: string }[] = [
    { id: 'all', label: lang === 'ru' ? 'Все' : lang === 'en' ? 'All' : 'Barchasi' },
    { id: 'cybercrime', label: lang === 'ru' ? 'Киберпреступления' : lang === 'en' ? 'Cybercrimes' : 'Kiberjinoyatlar' },
    { id: 'evidence', label: lang === 'ru' ? 'Цифровые улики' : lang === 'en' ? 'Digital Evidence' : 'Raqamli dalillar' },
    { id: 'osint', label: 'OSINT' },
    { id: 'security', label: lang === 'ru' ? 'Кибербезопасность' : lang === 'en' ? 'Security' : 'Kiberxavfsizlik' },
    { id: 'standards', label: lang === 'ru' ? 'Стандарты' : lang === 'en' ? 'Standards' : 'Standartlar' },
    { id: 'glossary', label: lang === 'ru' ? 'Глоссарий' : lang === 'en' ? 'Glossary' : 'Lug‘at' },
    { id: 'bookmarks', label: `${lang === 'ru' ? 'Закладки' : lang === 'en' ? 'Bookmarks' : 'Xatcho‘plar'} (${bookmarks.length})` },
  ];

  const catLabel = (catId: KBArticle['category']) =>
    cats.find((c) => c.id === catId)?.label || catId;

  const langIdx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_knowledge', lang)}
        title={t('p_knowledge', lang)}
        subtitle={
          lang === 'ru'
            ? 'Киберпреступления, виды цифровых доказательств, инструменты OSINT, международные стандарты и глоссарий.'
            : lang === 'en'
              ? 'Cybercrime taxonomy, digital evidence, OSINT methodology, cybersecurity, international standards, and glossary.'
              : 'Kiberjinoyatlar, raqamli dalillar, OSINT vositalari, xalqaro standartlar va atamalar lug‘ati.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
      />

      {/* Search & Category Controls */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'ru' ? 'Поиск по базе знаний и глоссарию...' : lang === 'en' ? 'Search articles, standards, glossary...' : 'Bilimlar bazasi va lug‘atdan qidirish...'}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] py-2 pr-3 pl-9 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === c.id
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'bg-[var(--panel2)] text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Master-Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-2.5 lg:col-span-1">
          {filteredArticles.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 text-center text-xs text-[var(--muted)]">
              {t('noResults', lang)}
            </div>
          ) : (
            filteredArticles.map((art) => {
              const active = activeArticle?.id === art.id;
              const isBookmarked = bookmarks.includes(art.id);
              const isRead = readIds.includes(art.id);
              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(art.id);
                    markRead(art.id);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] font-mono">
                    <span className="uppercase text-[var(--accent)]">{catLabel(art.category)}</span>
                    <span className="text-[var(--muted)]">
                      {art.readMinutes} {lang === 'ru' ? 'мин' : lang === 'en' ? 'min' : 'daq'} {isRead ? '· ✓' : ''} {isBookmarked ? '· ★' : ''}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[var(--text)]">{pickText(art.title, lang)}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-[var(--secondary-text)]">
                    {pickText(art.summary, lang)}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2">
          {activeArticle && (
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs font-bold uppercase text-[var(--accent)]">
                    {catLabel(activeArticle.category)} · {activeArticle.tags.join(' · ')}
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold text-[var(--text)]">
                    {pickText(activeArticle.title, lang)}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleBookmark(activeArticle.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      bookmarks.includes(activeArticle.id)
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--text)]'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>
                      {bookmarks.includes(activeArticle.id)
                        ? lang === 'ru'
                          ? 'В закладках'
                          : lang === 'en'
                            ? 'Saved'
                            : 'Saqlangan'
                        : lang === 'ru'
                          ? 'В закладки'
                          : lang === 'en'
                            ? 'Bookmark'
                            : 'Xatcho‘p'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markRead(activeArticle.id);
                      onToast(lang === 'ru' ? 'Отмечено как изученное' : lang === 'en' ? 'Marked as read' : 'O‘qildi deb belgilandi');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--panel2)] border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ok)]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {readIds.includes(activeArticle.id)
                        ? lang === 'ru'
                          ? 'Изучено'
                          : lang === 'en'
                            ? 'Completed'
                            : 'O‘qildi'
                        : lang === 'ru'
                          ? 'Отметить изученным'
                          : lang === 'en'
                            ? 'Mark Read'
                            : 'O‘qildi deb belgilash'}
                    </span>
                  </button>
                </div>
              </div>

              <p className="text-sm font-medium text-[var(--secondary-text)]">
                {pickText(activeArticle.summary, lang)}
              </p>

              <div className="border-t border-[var(--line)] pt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                {pickText(activeArticle.content, lang)}
              </div>
            </article>
          )}
        </div>
      </div>

      {/* Preserved Core Glossary Concepts */}
      {filteredConcepts.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
            <BookOpen className="h-4.5 w-4.5 text-[var(--accent)]" />
            <span>{lang === 'ru' ? 'Базовые термины криминалистики' : lang === 'en' ? 'Core Forensics Glossary' : 'Asosiy kriminalistik atamalar'}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredConcepts.map(([term, def]) => (
              <div key={term[0]} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
                <div className="text-sm font-bold text-[var(--accent)]">{term[langIdx]}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--secondary-text)]">
                  {def[langIdx]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
