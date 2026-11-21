import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import {
  ART,
  DEAD_END_ROWS,
  EV,
  WZ,
  findMethod,
  keysOfMethod,
} from '../data/crimeData';
import {
  EXPERT_CT_QUESTIONS,
  EXPERT_EXTRA_SECTIONS,
  EXPERT_OTHER_TYPES,
} from '../data/platformData';
import type { Lang, PageId, ReportDraft } from '../types';
import { artLabel, pickText, t, tx } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { CaseBar, PageHeader } from './CommonUI';

interface BasePageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId, opts?: { a?: string; m?: string }) => void;
  onToast: (msg: string) => void;
}

/* =========================== WIZARD PAGE =========================== */
export const WizardPage: React.FC<BasePageProps> = ({
  lang,
  canGoBack,
  onBack,
  onNavigate,
}) => {
  const [node, setNode] = useState<string>('start');
  const [history, setHistory] = useState<string[]>([]);

  const handleChoose = (target: string) => {
    if (target.startsWith('p:')) {
      onNavigate(target.slice(2) as PageId);
      return;
    }
    setHistory((prev) => [...prev, node]);
    setNode(target);
  };

  const handleStepBack = () => {
    if (history.length > 0) {
      const prevNode = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setNode(prevNode);
    } else {
      onBack();
    }
  };

  const isResult = node.startsWith('r:');
  const resultIds = isResult ? node.slice(2).split(';') : [];
  const currentQuestion = !isResult ? WZ[node] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_wizard', lang)}
        title={t('p_wizard', lang)}
        subtitle={t('wzLead', lang)}
        canGoBack={canGoBack || history.length > 0}
        onBack={handleStepBack}
        actions={
          <button
            type="button"
            onClick={() => {
              setNode('start');
              setHistory([]);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t('wzRestart', lang)}</span>
          </button>
        }
      />

      {currentQuestion && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <div className="mb-2 font-mono text-xs font-semibold text-[var(--accent)]">
            {lang === 'ru' ? `Шаг ${history.length + 1}` : lang === 'en' ? `Step ${history.length + 1}` : `${history.length + 1}-qadam`}
          </div>
          <h2 className="text-lg font-bold text-[var(--text)]">{tx(currentQuestion.q, lang)}</h2>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {currentQuestion.o.map(([label, target]) => (
              <button
                key={label}
                type="button"
                onClick={() => handleChoose(target)}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-3 text-left text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
              >
                <span>{tx(label, lang)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {isResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-4 text-xs leading-relaxed text-[var(--text)]">
            <div className="font-bold text-[var(--accent)]">{t('wzResH', lang)}</div>
            <p className="mt-1">{t('wzResNote', lang)}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {resultIds.map((aid) => {
              const a = ART.find((item) => item.id === aid);
              if (!a) return null;
              return (
                <div key={a.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
                  <div className="font-mono text-xs font-bold text-[var(--accent)]">
                    {artLabel(a.code, lang)}
                  </div>
                  <h3 className="mt-1 text-base font-bold text-[var(--text)]">{tx(a.title, lang)}</h3>
                  <p className="mt-1.5 text-xs text-[var(--secondary-text)]">{tx(a.about, lang)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {a.m.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onNavigate('art', { a: a.id, m: m.id })}
                        className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {tx(m.n, lang)} →
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================== UNIVERSAL PAGE =========================== */
export const UniversalPage: React.FC<Omit<BasePageProps, 'onToast'>> = ({
  lang,
  canGoBack,
  onBack,
}) => {
  const fourByFour: [string, string, string][] = [
    ['1. Пул изи', 'Карта, ҳамён, чек, ID, банкка сўров', 'Биринчи 30 дақиқада муздатиш; 2–3 босқич ўтказмани излаш'],
    ['2. Алоқа канали', 'Рақам, аккаунт ID, URL, домен, IMEI', 'Username эмас, ID; 1 соатда сақлаш (ўчирилади)'],
    ['3. Қурилма', 'Самолёт режими, APK, ёзишма, хэш', 'Зарарли файлни ўчирмаслик; мутахассис билан кўздан кечириш'],
    ['4. Серия', 'Реквизитлар базасида солиштириш', 'Битта дроп/АПК/бот = ўнлаб иш'],
  ];

  const tenSteps: string[] = [
    'Аризачидан чек, сана-вақт, карта/ҳамён рақами, транзакция ID, ёзишма ва файлни олиш',
    'Пул тушган карта/ҳамёнга 30 дақиқа ичида антифрод орқали муздатиш сўрови юбориш',
    'Жабрланувчи картаси, банк иловаси ва Telegram сессияларини хавфсизлантириш',
    'Саҳифа, канал, пост ёки эълонни URL ва ID билан 1 соатда видео-фиксация қилиш',
    'Агар АПК ўрнатилган бўлса — телефонни тармоқдан ажратиш, ўчирмаслик, мутахассис билан кўздан кечириш',
    'Банк/тўлов тизимидан қабул қилувчи ПИНФЛ, IP, қурилма ID ва кейинги ўтказмаларни сўраш',
    'Тергов судьяси рухсати билан оператордан абонент, БС ва IMEI–SIM боғланишини олиш',
    'Дроп-карта эгасини 72 соатда сўроқ қилиш ва банкомат/филиал видеосини олиб қолиш',
    'Барча реквизитларни вилоят ва республика базасига киритиб серияни текшириш',
    'Тўпланган рақамли далилларни SHA-256 хэш, муҳр ва далил занжири билан расмийлаштириш',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_universal', lang)}
        title={t('p_universal', lang)}
        subtitle={tx('Ҳар бир киберариза бўйича биринчи соатда бажариладиган мажбурий минимал ҳаракатлар ва 4×4 матрица.', lang)}
        canGoBack={canGoBack}
        onBack={onBack}
      />

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="mb-3 text-base font-bold text-[var(--text)]">
          {tx('4×4 кибертергов матрицаси', lang)}
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {fourByFour.map(([title, what, why]) => (
            <div key={title} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
              <div className="text-sm font-bold text-[var(--accent)]">{tx(title, lang)}</div>
              <div className="mt-1 text-xs font-semibold text-[var(--text)]">{tx(what, lang)}</div>
              <div className="mt-1 text-xs text-[var(--secondary-text)]">{tx(why, lang)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="mb-3 text-base font-bold text-[var(--text)]">
          {tx('10 та мажбурий қадам', lang)}
        </h2>
        <ol className="space-y-2.5">
          {tenSteps.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-3 text-xs leading-relaxed text-[var(--text)] sm:text-sm"
            >
              <span className="font-mono font-bold text-[var(--accent)]">{String(i + 1).padStart(2, '0')}</span>
              <span>{tx(step, lang)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

/* =========================== EVIDENCE CHECKLIST PAGE =========================== */
interface EvidencePageProps extends BasePageProps {
  caseNo: string;
  onCaseNoChange: (val: string) => void;
  ticks: Record<string, boolean>;
  onToggleTick: (key: string) => void;
  onClearTicks: (keys: string[]) => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({
  lang,
  caseNo,
  onCaseNoChange,
  ticks,
  onToggleTick,
  onClearTicks,
  canGoBack,
  onBack,
  onToast,
}) => {
  const keys = EV.map((_, i) => `ev|${i}`);
  const doneCount = keys.filter((k) => ticks[k]).length;

  const handleCopy = async () => {
    const lines = [
      t('p_evidence', lang),
      caseNo ? `${t('caseWord', lang)} #${caseNo}` : '',
      '',
      ...EV.map((item, i) => `${ticks[`ev|${i}`] ? '[x]' : '[ ]'} ${tx(item, lang)}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      onToast(t('copied', lang));
    } catch {
      onToast(t('copyFail', lang));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        lang={lang}
        eyebrow={t('e_evidence', lang)}
        title={t('p_evidence', lang)}
        subtitle={t('evLead', lang)}
        canGoBack={canGoBack}
        onBack={onBack}
      />

      <CaseBar
        lang={lang}
        caseNo={caseNo}
        onCaseNoChange={onCaseNoChange}
        doneCount={doneCount}
        totalCount={keys.length}
        onCopy={handleCopy}
        onClear={() => {
          onClearTicks(keys);
          onToast(t('marksCleared', lang));
        }}
        onPrint={() => window.print()}
      />

      <div className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {EV.map((item, i) => {
          const key = `ev|${i}`;
          const checked = !!ticks[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleTick(key)}
              className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--hover-bg)]"
            >
              {checked ? (
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" />
              ) : (
                <Square className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
              )}
              <span className={`text-sm ${checked ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>
                {tx(item, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* =========================== CASE FILE PAGE =========================== */
interface CaseFilePageProps extends BasePageProps {
  caseNo: string;
  onCaseNoChange: (val: string) => void;
  ticks: Record<string, boolean>;
}

interface StoredCaseForm {
  number: string;
  date: string;
  title: string;
  details: string;
  evidence: string;
  tasks: string;
}

export const CaseFilePage: React.FC<CaseFilePageProps> = ({
  lang,
  caseNo,
  onCaseNoChange,
  ticks,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const initial = lsJSON<StoredCaseForm>('kiberCase', {
    number: caseNo || '',
    date: new Date().toISOString().slice(0, 10),
    title: '',
    details: '',
    evidence: '',
    tasks: '',
  });
  const [form, setForm] = useState<StoredCaseForm>({ ...initial, number: caseNo || initial.number });

  const updateField = (field: keyof StoredCaseForm, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (field === 'number') onCaseNoChange(val);
  };

  const handleSave = () => {
    lsSetJSON('kiberCase', form);
    logActivity('case', `Saved case file ${form.number || 'draft'}`);
    onToast(t('saved', lang));
  };

  const handleClear = () => {
    const empty: StoredCaseForm = {
      number: caseNo,
      date: '',
      title: '',
      details: '',
      evidence: '',
      tasks: '',
    };
    setForm(empty);
    lsSetJSON('kiberCase', empty);
    onToast(t('cleared', lang));
  };

  const handleSendToReport = () => {
    lsSetJSON('kiberCase', form);
    const existing = lsJSON<ReportDraft>('kj_report_draft', {
      template: 'investigation',
      title:
        form.title ||
        (lang === 'ru'
          ? 'Отчёт о расследовании'
          : lang === 'en'
            ? 'Investigation Report'
            : 'Tergov hisoboti'),
      caseNumber: form.number || caseNo,
      investigator:
        lang === 'ru'
          ? 'Стажёр-следователь'
          : lang === 'en'
            ? 'Trainee Investigator'
            : 'Tergovchi-stajyor',
      date: form.date || new Date().toISOString().slice(0, 10),
      summary: form.details,
      evidenceText: form.evidence,
      timelineText: '',
      conclusions: '',
      recommendations: form.tasks,
    });
    lsSetJSON('kj_report_draft', {
      ...existing,
      title: form.title || existing.title,
      caseNumber: form.number || existing.caseNumber,
      date: form.date || existing.date,
      summary: form.details || existing.summary,
      evidenceText: form.evidence || existing.evidenceText,
      recommendations: form.tasks || existing.recommendations,
    });
    onToast(t('saved', lang));
    onNavigate('reports');
  };

  const progressByMethod = useMemo(() => {
    const map: Record<string, number> = {};
    Object.keys(ticks).forEach((k) => {
      if (!ticks[k] || !k.includes('|') || k.startsWith('ev|')) return;
      const mid = k.split('|')[0];
      map[mid] = (map[mid] || 0) + 1;
    });
    return Object.entries(map)
      .map(([mid, cnt]) => {
        const found = findMethod(mid);
        if (!found) return null;
        const [art, meth] = found;
        const total = keysOfMethod(meth).length;
        return { art, meth, cnt, total };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [ticks]);

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_case', lang)}
        title={t('p_case', lang)}
        subtitle={t('caseDesc', lang)}
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <button
            type="button"
            onClick={handleSendToReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t('sendToReport', lang)}</span>
          </button>
        }
      />

      <div className="rounded-xl border border-[var(--orange)]/40 bg-[var(--orange)]/10 px-4 py-3 text-xs text-[var(--text)]">
        {t('privacy', lang)}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
            <span>{t('caseNumber', lang)}</span>
            <input
              type="text"
              value={form.number}
              onChange={(e) => updateField('number', e.target.value)}
              placeholder="2026-123"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
          <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
            <span>{t('caseDate', lang)}</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
          <span>{t('caseName', lang)}</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder={t('caseNamePh', lang)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </label>

        <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
          <span>{t('caseDetails', lang)}</span>
          <textarea
            rows={4}
            value={form.details}
            onChange={(e) => updateField('details', e.target.value)}
            placeholder={t('caseDetailsPh', lang)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </label>

        <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
          <span>{t('caseEvidence', lang)}</span>
          <textarea
            rows={3}
            value={form.evidence}
            onChange={(e) => updateField('evidence', e.target.value)}
            placeholder={t('caseEvidencePh', lang)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </label>

        <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
          <span>{t('caseTasks', lang)}</span>
          <textarea
            rows={3}
            value={form.tasks}
            onChange={(e) => updateField('tasks', e.target.value)}
            placeholder={t('caseTasksPh', lang)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
          >
            {t('save', lang)}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-4 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
          >
            {t('print', lang)}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-4 py-2 text-xs font-semibold text-[var(--red)] hover:border-[var(--red)]"
          >
            {t('clear', lang)}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="mb-3 text-base font-bold text-[var(--text)]">{t('progH', lang)}</h2>
        {progressByMethod.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">{t('progNone', lang)}</p>
        ) : (
          <div className="space-y-2.5">
            {progressByMethod.map(({ art, meth, cnt, total }) => (
              <div
                key={meth.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-2.5 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-[var(--accent)]">
                    {artLabel(art.code, lang)}
                  </span>{' '}
                  <span className="font-semibold text-[var(--text)]">{tx(meth.n, lang)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold tabular-nums text-[var(--text)]">
                    {cnt}/{total}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('art', { a: art.id, m: meth.id })}
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    {t('open', lang)} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

/* =========================== LAW PAGE =========================== */
export const LawPage: React.FC<Omit<BasePageProps, 'onToast'>> = ({
  lang,
  canGoBack,
  onBack,
}) => {
  const cpcRows: [string, string, string][] = [
    ['ЖПК 70-м.', 'Мутахассис иштироки', 'Рақамли қурилма ва ёзишмаларни кўздан кечиришда техник мутахассис жалб этиш'],
    ['ЖПК 140-м.', 'Кўздан кечириш баённомаси', 'Сайт, мессенжер, қурилма ичини видео ва хэш билан қайд этиш'],
    ['ЖПК 158-1–158-3', 'Тинтув ва олиб қўйиш', 'Электрон ташувчилар ва шахсий маълумотни тергов судьяси рухсати билан олиш'],
    ['ЖПК 169–169-2', 'Тезкор-техник тадбирлар', 'Тергов судьяси санкцияси билан сўзлашув ва трафик маълумотлари'],
    ['ЖПК 290–291', 'Мол-мулкни хатлаш', 'Зарарни қоплаш учун крипто-актив, ҳисоб ва мол-мулкни хатлаш'],
    ['ПҚ-153 (2025)', 'Кибержиноятларга қарши чоралар', 'Антифрод алмашинуви, тезкор муздатиш ва профилактика механизмлари'],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_law', lang)}
        title={t('p_law', lang)}
        subtitle={tx('Амалдаги ЖПК нормалари, ПҚ-153, антифрод ва қонун лойиҳалари (lex.uz дан жорий таҳрирни текширинг).', lang)}
        canGoBack={canGoBack}
        onBack={onBack}
      />

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[11px] font-bold uppercase text-[var(--muted)]">
              <th className="py-2.5 pr-4">{lang === 'ru' ? 'Норма' : lang === 'en' ? 'Norm' : 'Norma'}</th>
              <th className="py-2.5 pr-4">{lang === 'ru' ? 'Институт' : lang === 'en' ? 'Scope' : 'Mazmuni'}</th>
              <th className="py-2.5">{lang === 'ru' ? 'Применение' : lang === 'en' ? 'Application' : 'Qo‘llanilishi'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {cpcRows.map(([norm, inst, desc]) => (
              <tr key={norm} className="hover:bg-[var(--hover-bg)]">
                <td className="py-3 pr-4 font-mono font-bold text-[var(--accent)] whitespace-nowrap">{tx(norm, lang)}</td>
                <td className="py-3 pr-4 font-semibold text-[var(--text)]">{tx(inst, lang)}</td>
                <td className="py-3 text-[var(--secondary-text)]">{tx(desc, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* =========================== EXPERT PAGE (EXPANDED & INTERACTIVE) =========================== */
export const ExpertPage: React.FC<BasePageProps> = ({
  lang,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const [expandedCt, setExpandedCt] = useState<Record<string, boolean>>({ ct_1: true });
  const [expandedOther, setExpandedOther] = useState<Record<string, boolean>>({ oth_ling: true });
  const [expandedExtra, setExpandedExtra] = useState<Record<string, boolean>>({ ext_mobile: true });
  const [petitionQuestions, setPetitionQuestions] = useState<string[]>(() =>
    lsJSON<string[]>('kj_expert_petition', [
      EXPERT_CT_QUESTIONS[0].question,
      EXPERT_CT_QUESTIONS[1].question,
    ])
  );
  const [customQuestion, setCustomQuestion] = useState('');

  const updatePetition = (next: string[]) => {
    setPetitionQuestions(next);
    lsSetJSON('kj_expert_petition', next);
  };

  const addQuestionToPetition = (q: string) => {
    if (petitionQuestions.includes(q)) {
      onToast(lang === 'ru' ? 'Уже в списке ходатайства' : lang === 'en' ? 'Already in petition' : 'Savol allaqachon ro‘yxatda');
      return;
    }
    const next = [...petitionQuestions, q];
    updatePetition(next);
    logActivity('expert', 'Added forensic question to petition builder');
    onToast(lang === 'ru' ? 'Добавлено в постановление' : lang === 'en' ? 'Added to petition' : 'Qaror loyihasiga qo‘shildi');
  };

  const handleCopyPetition = async () => {
    const header =
      lang === 'ru'
        ? 'ВОПРОСЫ ДЛЯ НАЗНАЧЕНИЯ СУДЕБНОЙ ЭКСПЕРТИЗЫ:'
        : lang === 'en'
          ? 'FORENSIC EXAMINATION PETITION QUESTIONS:'
          : 'SUD EKSPERTIZASI TAYINLASH UCHUN SAVOLLAR:';
    const text = [header, '', ...petitionQuestions.map((q, i) => `${i + 1}. ${tx(q, lang)}`)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onToast(t('copied', lang));
    } catch {
      onToast(t('copyFail', lang));
    }
  };

  const handleSendToReport = () => {
    const existing = lsJSON<ReportDraft>('kj_report_draft', {
      template: 'evidence',
      title:
        lang === 'ru'
          ? 'Сводка по судебной экспертизе'
          : lang === 'en'
            ? 'Forensic Examination Summary'
            : 'Sud ekspertizasi xulosasi',
      caseNumber: '',
      investigator:
        lang === 'ru'
          ? 'Стажёр-следователь'
          : lang === 'en'
            ? 'Trainee Investigator'
            : 'Tergovchi-stajyor',
      date: new Date().toISOString().slice(0, 10),
      summary: '',
      evidenceText: '',
      timelineText: '',
      conclusions: '',
      recommendations: '',
    });
    const block = petitionQuestions.map((q, i) => `${i + 1}. ${tx(q, lang)}`).join('\n');
    lsSetJSON('kj_report_draft', {
      ...existing,
      recommendations: existing.recommendations
        ? `${existing.recommendations}\n\n${block}`
        : block,
    });
    onNavigate('reports');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_expert', lang)}
        title={t('p_expert', lang)}
        subtitle={tx(
          'Компьютер-техник, мобил, тармоқ, блокчейн ва бошқа экспертизалар учун намунавий саволлар ҳамда интерактив экспертиза қарори конструктори.',
          lang
        )}
        canGoBack={canGoBack}
        onBack={onBack}
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main Interactive Forensic Sections */}
        <div className="space-y-6 xl:col-span-2">
          {/* 1. Computer-Technical Examination (All 7 sample questions preserved & interactive) */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--text)]">
                {tx('Компьютер-техник экспертиза учун намунавий саволлар', lang)}
              </h2>
              <span className="font-mono text-xs font-bold text-[var(--accent)]">
                {EXPERT_CT_QUESTIONS.length} {lang === 'ru' ? 'вопросов' : lang === 'en' ? 'questions' : 'savol'}
              </span>
            </div>

            <div className="space-y-2.5">
              {EXPERT_CT_QUESTIONS.map((item, idx) => {
                const open = !!expandedCt[item.id];
                const added = petitionQuestions.includes(item.question);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3 p-3.5">
                      <button
                        type="button"
                        onClick={() => setExpandedCt((p) => ({ ...p, [item.id]: !open }))}
                        className="flex flex-1 items-start gap-2.5 text-left"
                      >
                        {open ? (
                          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                        )}
                        <span className="text-xs font-semibold leading-relaxed text-[var(--text)] sm:text-sm">
                          <span className="mr-1.5 font-mono text-[var(--accent)]">0{idx + 1}.</span>
                          {tx(item.question, lang)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => addQuestionToPetition(item.question)}
                        className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          added
                            ? 'bg-[var(--ok)]/15 text-[var(--ok)]'
                            : 'bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]'
                        }`}
                      >
                        {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        <span>{added ? (lang === 'ru' ? 'В списке' : lang === 'en' ? 'Added' : 'Qo‘shildi') : t('add', lang)}</span>
                      </button>
                    </div>

                    {open && (
                      <div className="border-t border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-xs space-y-2">
                        <div>
                          <span className="font-bold text-[var(--accent)]">
                            {lang === 'ru' ? 'Цель: ' : lang === 'en' ? 'Purpose: ' : 'Maqsad: '}
                          </span>
                          <span className="text-[var(--secondary-text)]">{pickText(item.purpose, lang)}</span>
                        </div>
                        <div>
                          <span className="font-bold text-[var(--text)]">
                            {lang === 'ru' ? 'Объекты: ' : lang === 'en' ? 'Objects: ' : 'Obyektlar: '}
                          </span>
                          <span className="text-[var(--secondary-text)]">{pickText(item.objects, lang)}</span>
                        </div>
                        <div>
                          <span className="font-bold text-[var(--text)]">
                            {lang === 'ru' ? 'Ожидаемые артефакты: ' : lang === 'en' ? 'Artifacts: ' : 'Kutilayotgan izlar: '}
                          </span>
                          <span className="font-mono text-[var(--secondary-text)]">{pickText(item.expected, lang)}</span>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => onNavigate('art', { a: item.relatedArticle })}
                            className="font-semibold text-[var(--accent)] hover:underline"
                          >
                            {lang === 'ru' ? 'Открыть алгоритм статьи' : lang === 'en' ? 'Open related article' : 'Tegishli modda algoritmi'} →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Other Examinations (All 5 preserved & made fully interactive) */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 text-base font-bold text-[var(--text)]">
              {tx('Бошқа экспертизалар', lang)}
            </h2>
            <div className="space-y-2.5">
              {EXPERT_OTHER_TYPES.map((oth) => {
                const open = !!expandedOther[oth.id];
                return (
                  <div
                    key={oth.id}
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedOther((p) => ({ ...p, [oth.id]: !open }))}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-[var(--accent)]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                        )}
                        <div>
                          <span className="text-sm font-bold text-[var(--text)]">{tx(oth.title, lang)}</span>
                          <span className="mx-2 text-[var(--muted)]">—</span>
                          <span className="text-xs text-[var(--secondary-text)]">{tx(oth.subtitle, lang)}</span>
                        </div>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-[var(--line)] bg-[var(--panel)] px-4 py-3.5 text-xs space-y-2.5">
                        <p className="text-[var(--secondary-text)]">{pickText(oth.purpose, lang)}</p>
                        <div>
                          <span className="font-bold text-[var(--text)]">
                            {lang === 'ru' ? 'Объекты: ' : lang === 'en' ? 'Submitted Objects: ' : 'Taqdim etiladigan obyektlar: '}
                          </span>
                          <span className="text-[var(--secondary-text)]">{pickText(oth.objects, lang)}</span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <div className="font-bold text-[var(--accent)]">
                            {lang === 'ru' ? 'Образцы вопросов:' : lang === 'en' ? 'Sample Questions:' : 'Namuna savollar:'}
                          </div>
                          {oth.sampleQuestions.map((sq) => (
                            <div
                              key={sq}
                              className="flex items-start justify-between gap-2 rounded-lg bg-[var(--panel2)] px-3 py-2"
                            >
                              <span className="text-[var(--text)]">{tx(sq, lang)}</span>
                              <button
                                type="button"
                                onClick={() => addQuestionToPetition(sq)}
                                className="shrink-0 rounded bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                              >
                                + {t('add', lang)}
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {oth.relatedArticles.map((aid) => {
                            const found = ART.find((x) => x.id === aid);
                            if (!found) return null;
                            return (
                              <button
                                key={aid}
                                type="button"
                                onClick={() => onNavigate('art', { a: aid })}
                                className="font-mono text-[11px] font-semibold text-[var(--accent)] hover:underline"
                              >
                                {artLabel(found.code, lang)} →
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. Added Specialized Forensic Sections */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 text-base font-bold text-[var(--text)]">
              {lang === 'ru'
                ? 'Специализированные направления цифровой экспертизы'
                : lang === 'en'
                  ? 'Specialized Digital Forensic Domains'
                  : 'Ixtisoslashtirilgan raqamli ekspertiza yo‘nalishlari'}
            </h2>
            <div className="space-y-3">
              {EXPERT_EXTRA_SECTIONS.map((sec) => {
                const open = !!expandedExtra[sec.id];
                return (
                  <div
                    key={sec.id}
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedExtra((p) => ({ ...p, [sec.id]: !open }))}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-[var(--accent)]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                        )}
                        <span className="text-sm font-bold text-[var(--text)]">
                          {tx(pickText(sec.title, lang), lang)}
                        </span>
                      </div>
                    </button>
                    {open && (
                      <div className="border-t border-[var(--line)] bg-[var(--panel)] px-4 py-3.5 text-xs space-y-2.5">
                        <p className="text-[var(--secondary-text)]">{pickText(sec.description, lang)}</p>
                        <div>
                          <span className="font-bold text-[var(--text)]">
                            {lang === 'ru' ? 'Объекты: ' : lang === 'en' ? 'Objects: ' : 'Obyektlar: '}
                          </span>
                          <span className="text-[var(--secondary-text)]">{pickText(sec.objects, lang)}</span>
                        </div>
                        <div>
                          <span className="font-bold text-[var(--text)]">
                            {lang === 'ru' ? 'Артефакты: ' : lang === 'en' ? 'Key Artifacts: ' : 'Asosiy artefaktlar: '}
                          </span>
                          <span className="font-mono text-[var(--accent)]">{pickText(sec.artifacts, lang)}</span>
                        </div>
                        <div className="space-y-1.5">
                          {sec.sampleQuestions.map((sq) => (
                            <div
                              key={sq}
                              className="flex items-start justify-between gap-2 rounded-lg bg-[var(--panel2)] px-3 py-2"
                            >
                              <span className="text-[var(--text)]">{tx(sq, lang)}</span>
                              <button
                                type="button"
                                onClick={() => addQuestionToPetition(sq)}
                                className="shrink-0 rounded bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                              >
                                + {t('add', lang)}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Forensic Question Petition Builder */}
        <aside className="noprint space-y-4">
          <div className="sticky top-20 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[var(--accent)]">
                {lang === 'ru' ? 'КОНСТРУКТОР' : lang === 'en' ? 'BUILDER' : 'KONSTRUKTOR'}
              </div>
              <h3 className="mt-1 text-base font-bold text-[var(--text)]">
                {lang === 'ru'
                  ? 'Вопросы к экспертизе'
                  : lang === 'en'
                    ? 'Examination Petition Builder'
                    : 'Ekspertiza savollari ro‘yxati'}
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {lang === 'ru'
                  ? 'Соберите итоговый список вопросов для постановления или отчёта.'
                  : lang === 'en'
                    ? 'Assemble selected questions into your petition or export to Report Generator.'
                    : 'Tanlangan savollarni yig‘ing, nusxalang yoki hisobot generatoriga uzating.'}
              </p>
            </div>

            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {petitionQuestions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--line)] p-4 text-center text-xs text-[var(--muted)]">
                  {lang === 'ru' ? 'Список пуст' : lang === 'en' ? 'No questions added yet' : 'Hali savol qo‘shilmagan'}
                </div>
              ) : (
                petitionQuestions.map((q, idx) => (
                  <div
                    key={q}
                    className="flex items-start justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-2.5 text-xs"
                  >
                    <span className="leading-relaxed text-[var(--text)]">
                      <span className="mr-1 font-mono font-bold text-[var(--accent)]">{idx + 1}.</span>
                      {tx(q, lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => updatePetition(petitionQuestions.filter((x) => x !== q))}
                      aria-label={t('delete', lang)}
                      className="shrink-0 text-[var(--muted)] hover:text-[var(--red)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = customQuestion.trim();
                if (!val) return;
                addQuestionToPetition(val);
                setCustomQuestion('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder={lang === 'ru' ? 'Добавить свой вопрос...' : lang === 'en' ? 'Add custom question...' : 'O‘z savolingizni qo‘shing...'}
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--panel2)] border border-[var(--line)] px-2.5 py-1.5 text-xs font-bold text-[var(--text)] hover:border-[var(--accent)]"
              >
                +
              </button>
            </form>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyPetition}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{t('cbCopy', lang)}</span>
              </button>
              <button
                type="button"
                onClick={handleSendToReport}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-xs font-bold text-[var(--text)] hover:border-[var(--accent)]"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{t('sendToReport', lang)}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

/* =========================== DEAD END & REJECT PAGES =========================== */
export const DeadEndPage: React.FC<Omit<BasePageProps, 'onToast'>> = ({
  lang,
  canGoBack,
  onBack,
}) => (
  <div className="space-y-6">
    <PageHeader
      lang={lang}
      eyebrow={t('e_dead', lang)}
      title={t('p_dead', lang)}
      subtitle={tx('Тергов тўхтаб қолганда қўлланиладиган муқобил излаш ва сериализация усуллари.', lang)}
      canGoBack={canGoBack}
      onBack={onBack}
    />
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
      {DEAD_END_ROWS.map(([situation, solution]) => (
        <div key={situation} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="text-sm font-bold text-[var(--orange)]">{tx(situation, lang)}</div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text)] sm:text-sm">{tx(solution, lang)}</p>
        </div>
      ))}
    </div>
  </div>
);

export const RejectPage: React.FC<Omit<BasePageProps, 'onToast'>> = ({
  lang,
  canGoBack,
  onBack,
  onNavigate,
}) => {
  const checks = [
    'Аризачи пулни адашиб бошқа рақамга ўтказганми (жиноят аломати йўқ — фуқаролик-ҳуқуқий тартиб)?',
    'Картадан ечиб олинган маблағни оила аъзоси, фарзанди ёки таниши унинг рухсати билан ишлатмаганми?',
    'Банк иловасидаги техник носозлик ёки икки марта ечиш (қайтариш сўрови) эмасми?',
    'Рад этишдан олдин банкдан транзакция статуси ва олувчи тўлиқ текширилганми?',
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_reject', lang)}
        title={t('p_reject', lang)}
        subtitle={tx('Жиноят иши қўзғатишни рад этишдан олдин мажбурий текшириладиган ҳолатлар.', lang)}
        canGoBack={canGoBack}
        onBack={onBack}
      />
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
        {checks.map((c, idx) => (
          <div key={c} className="flex items-start gap-3 rounded-xl bg-[var(--panel2)] px-4 py-3 text-xs sm:text-sm text-[var(--text)]">
            <span className="font-mono font-bold text-[var(--accent)]">0{idx + 1}</span>
            <span>{tx(c, lang)}</span>
          </div>
        ))}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate('wizard')}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)]"
          >
            {t('p_wizard', lang)} →
          </button>
        </div>
      </div>
    </div>
  );
};
