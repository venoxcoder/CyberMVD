import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Copy,
  Eraser,
  Inbox,
  Keyboard,
  Printer,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { Lang } from '../types';
import { t } from '../utils/i18n';

interface PageHeaderProps {
  lang: Lang;
  eyebrow: string;
  title: string;
  subtitle?: string;
  canGoBack: boolean;
  onBack: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  lang,
  eyebrow,
  title,
  subtitle,
  canGoBack,
  onBack,
  backLabel,
  actions,
}) => {
  return (
    <div className="mb-5 border-b border-[var(--line)] pb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="noprint inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>{backLabel || t('back', lang)}</span>
            </button>
          )}
          <span className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--accent)]">
            {eyebrow}
          </span>
        </div>
        {actions && <div className="noprint flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)] sm:text-2xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--secondary-text)] sm:text-[13px]">
          {subtitle}
        </p>
      )}
    </div>
  );
};

interface CaseBarProps {
  lang: Lang;
  caseNo: string;
  onCaseNoChange: (val: string) => void;
  doneCount: number;
  totalCount: number;
  onCopy: () => void;
  onClear: () => void;
  onPrint?: () => void;
}

export const CaseBar: React.FC<CaseBarProps> = ({
  lang,
  caseNo,
  onCaseNoChange,
  doneCount,
  totalCount,
  onCopy,
  onClear,
  onPrint,
}) => {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  return (
    <div className="noprint mb-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-[var(--text)]">{t('cbTitle', lang)}</span>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>{t('cbNo', lang)}</span>
            <input
              type="text"
              value={caseNo}
              onChange={(e) => onCaseNoChange(e.target.value)}
              placeholder={t('cbPh', lang)}
              className="w-36 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1 text-xs font-medium text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
          <span className="font-mono text-xs font-semibold tabular-nums text-[var(--accent)]">
            {t('cbDone', lang, doneCount, totalCount)} ({pct}%)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{t('cbCopy', lang)}</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>{t('cbClear', lang)}</span>
          </button>
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t('print', lang)}</span>
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel2)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/* ======================== SHARED INSTITUTIONAL PRIMITIVES ======================== */

export const StatusBadge: React.FC<{
  status: string;
  lang: Lang;
}> = ({ status, lang }) => {
  const norm = status.toLowerCase();
  const labelMap: Record<string, Record<Lang, string>> = {
    open: { uz: 'Ochiq', ru: 'Открыто', en: 'Open' },
    in_progress: { uz: 'Jarayonda', ru: 'В работе', en: 'In Progress' },
    pending_review: { uz: 'Tekshiruvda', ru: 'На проверке', en: 'Pending Review' },
    closed: { uz: 'Yopilgan', ru: 'Закрыто', en: 'Closed' },
    archived: { uz: 'Arxivda', ru: 'В архиве', en: 'Archived' },
    verified: { uz: 'Tasdiqlangan', ru: 'Подтверждён', en: 'Verified' },
    pending: { uz: 'Kutilmoqda', ru: 'Ожидает проверки', en: 'Pending' },
    mismatch: { uz: 'Mos kelmadi', ru: 'Несовпадение', en: 'Mismatch' },
    confirmed: { uz: 'Tasdiqlangan fakt', ru: 'Подтверждённый факт', en: 'Confirmed Fact' },
    indirect: { uz: 'Bilvosita belgi', ru: 'Косвенный признак', en: 'Indirect Signal' },
    hypothesis: { uz: 'Tahliliy faraz', ru: 'Аналитическая гипотеза', en: 'Hypothesis' },
    active: { uz: 'Faol', ru: 'Активен', en: 'Active' },
    suspended: { uz: 'To‘xtatilgan', ru: 'Приостановлен', en: 'Suspended' },
    success: { uz: 'Muvaffaqiyatli', ru: 'Успешно', en: 'Success' },
    denied: { uz: 'Rad etildi', ru: 'Отказ', en: 'Denied' },
  };
  const label = labelMap[norm]?.[lang] || status;

  let toneClass = 'text-[var(--secondary-text)] border-[var(--line)] bg-[var(--panel2)]';
  let Icon = Clock;

  if (norm === 'verified' || norm === 'confirmed' || norm === 'active' || norm === 'success') {
    toneClass = 'text-[var(--ok)] border-[var(--ok)]/30 bg-[var(--ok)]/10';
    Icon = CheckCircle2;
  } else if (norm === 'mismatch' || norm === 'denied' || norm === 'suspended') {
    toneClass = 'text-[var(--red)] border-[var(--red)]/30 bg-[var(--red)]/10';
    Icon = ShieldAlert;
  } else if (norm === 'pending_review' || norm === 'pending' || norm === 'indirect' || norm === 'hypothesis') {
    toneClass = 'text-[var(--orange)] border-[var(--orange)]/30 bg-[var(--orange)]/10';
    Icon = AlertTriangle;
  } else if (norm === 'open' || norm === 'in_progress') {
    toneClass = 'text-[var(--blue)] border-[var(--blue)]/30 bg-[var(--blue)]/10';
    Icon = Clock;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase ${toneClass}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </span>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
    <div className="skeleton-block h-6 w-1/3" />
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((__, c) => (
          <div key={c} className="skeleton-block h-7" />
        ))}
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel2)]/40 px-6 py-10 text-center">
    <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]">
      <Inbox className="h-5 w-5" />
    </div>
    <div className="text-sm font-bold text-[var(--text)]">{title}</div>
    <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export interface DataColumn<T> {
  key: string;
  header: string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  defaultHidden?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyTitle,
  emptyDescription,
  pageSize = 8,
  lang,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyDescription: string;
  pageSize?: number;
  lang: Lang;
}) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!colPickerOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && colPickerRef.current && !colPickerRef.current.contains(target)) {
        setColPickerOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColPickerOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [colPickerOpen]);
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of columns) {
      if (c.defaultHidden) init[c.key] = true;
    }
    return init;
  });

  const visibleCols = useMemo(
    () => columns.filter((c) => !hiddenCols[c.key]),
    [columns, hiddenCols]
  );

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const col = columns.find((c) => c.key === sortCol);
    if (!col?.sortValue) return rows;
    const getVal = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, columns, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sortedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
        <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
          {lang === 'ru'
            ? `Записей: ${rows.length}`
            : lang === 'en'
              ? `Records: ${rows.length}`
              : `Yozuvlar: ${rows.length}`}
        </span>
        <div ref={colPickerRef} className="relative">
          <button
            type="button"
            onClick={() => setColPickerOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--panel2)] px-2 py-1 text-[11px] font-semibold text-[var(--secondary-text)] hover:text-[var(--text)]"
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>{lang === 'ru' ? 'Столбцы' : lang === 'en' ? 'Columns' : 'Ustunlar'}</span>
          </button>
          {colPickerOpen && (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2 shadow-xl">
              {columns.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenCols[c.key]}
                    onChange={() =>
                      setHiddenCols((prev) => ({ ...prev, [c.key]: !prev[c.key] }))
                    }
                  />
                  <span>{c.header}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="density-row border-b border-[var(--line)] bg-[var(--panel2)]/50 text-[10px] font-bold tracking-wider uppercase text-[var(--muted)]">
              {visibleCols.map((c) => (
                <th
                  key={c.key}
                  className={`px-3.5 py-2.5 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-[var(--text)]"
                    >
                      <span>{c.header}</span>
                      {sortCol === c.key &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-[var(--accent)]" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-[var(--accent)]" />
                        ))}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {pageRows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`density-row ${
                  onRowClick ? 'cursor-pointer hover:bg-[var(--hover-bg)]' : ''
                }`}
              >
                {visibleCols.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3.5 py-2.5 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--muted)]">
          <span className="font-mono tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded border border-[var(--line)] p-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded border border-[var(--line)] p-1 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const ShortcutsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  lang: Lang;
}> = ({ open, onClose, lang }) => {
  if (!open) return null;
  const rows: [string, string][] =
    lang === 'ru'
      ? [
          ['Ctrl + K / Cmd + K', 'Глобальный интеллектуальный поиск по платформе'],
          ['Alt + 1', 'Переход: Аналитический центр (Dashboard)'],
          ['Alt + 2', 'Переход: Дела и досье (Cases)'],
          ['Alt + 3', 'Переход: Центр цифровых доказательств'],
          ['Alt + 4', 'Переход: Граф связей'],
          ['Alt + 5', 'Переход: Каталог статей УК'],
          ['?', 'Открыть справку по горячим клавишам'],
          ['Esc', 'Закрыть модальное окно / поиск'],
        ]
      : lang === 'en'
        ? [
            ['Ctrl + K / Cmd + K', 'Open Global Intelligent Search'],
            ['Alt + 1', 'Go to Analytical Center'],
            ['Alt + 2', 'Go to Cases & Dossiers'],
            ['Alt + 3', 'Go to Digital Evidence Center'],
            ['Alt + 4', 'Go to Intelligence Graph'],
            ['Alt + 5', 'Go to Crime Catalog'],
            ['?', 'Open Keyboard Shortcuts'],
            ['Esc', 'Close active dialog'],
          ]
        : [
            ['Ctrl + K / Cmd + K', 'Global aqlli qidiruvni ochish'],
            ['Alt + 1', 'O‘tish: Tahliliy markaz'],
            ['Alt + 2', 'O‘tish: Ishlar reyestri va dosye'],
            ['Alt + 3', 'O‘tish: Raqamli dalillar markazi'],
            ['Alt + 4', 'O‘tish: Aloqalar grafi'],
            ['Alt + 5', 'O‘tish: Jinoyatlar katalogi'],
            ['?', 'Tezkor tugmalar ro‘yxati'],
            ['Esc', 'Oynani yopish'],
          ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
            <Keyboard className="h-4 w-4 text-[var(--accent)]" />
            <span>
              {lang === 'ru'
                ? 'Горячие клавиши рабочего места'
                : lang === 'en'
                  ? 'Workspace Keyboard Shortcuts'
                  : 'Tezkor boshqaruv tugmalari'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="divide-y divide-[var(--line)] text-xs">
          {rows.map(([keys, desc]) => (
            <div key={keys} className="flex items-center justify-between py-2.5">
              <span className="text-[var(--secondary-text)]">{desc}</span>
              <kbd className="rounded border border-[var(--line)] bg-[var(--panel2)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)]">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
