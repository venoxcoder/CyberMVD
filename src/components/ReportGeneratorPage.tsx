import React, { useState } from 'react';
import {
  Download,
  FileDown,
  Import,
  Printer,
  RotateCcw,
} from 'lucide-react';
import type {
  EvidenceItem,
  ForensicTimelineEvent,
  Lang,
  OsintSavedItem,
  ReportDraft,
} from '../types';
import { exportReportToDocx, exportReportToPdf } from '../utils/exportUtils';
import { t, tx } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

interface ReportGeneratorPageProps {
  lang: Lang;
  caseNo: string;
  canGoBack: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}

const emptyDraft = (caseNo: string, lang: Lang): ReportDraft => ({
  template: 'incident',
  title:
    lang === 'ru'
      ? 'Отчёт о киберинциденте и цифровых доказательствах'
      : lang === 'en'
        ? 'Cybercrime Incident & Digital Evidence Report'
        : 'Kiberhodisa va raqamli dalillar bo‘yicha hisobot',
  caseNumber: caseNo || '2026-123',
  investigator:
    lang === 'ru'
      ? 'Стажёр-следователь'
      : lang === 'en'
        ? 'Investigator Trainee'
        : 'Tergovchi amaliyotchisi',
  date: new Date().toISOString().slice(0, 10),
  summary: '',
  evidenceText: '',
  timelineText: '',
  conclusions: '',
  recommendations: '',
});

export const ReportGeneratorPage: React.FC<ReportGeneratorPageProps> = ({
  lang,
  caseNo,
  canGoBack,
  onBack,
  onToast,
}) => {
  const [draft, setDraft] = useState<ReportDraft>(() =>
    lsJSON<ReportDraft>('kj_report_draft', emptyDraft(caseNo, lang))
  );
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);

  const updateDraft = (patch: Partial<ReportDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    lsSetJSON('kj_report_draft', next);
  };

  const importFromCaseFile = () => {
    const cf = lsJSON<{
      number?: string;
      date?: string;
      title?: string;
      details?: string;
      evidence?: string;
      tasks?: string;
    } | null>('kiberCase', null);
    if (!cf || (!cf.title && !cf.details && !cf.evidence)) {
      onToast(lang === 'ru' ? 'Карточка дела пуста' : lang === 'en' ? 'Case file is empty' : 'Ish varaqasi bo‘sh');
      return;
    }
    updateDraft({
      title: cf.title || draft.title,
      caseNumber: cf.number || draft.caseNumber,
      date: cf.date || draft.date,
      summary: cf.details || draft.summary,
      evidenceText: cf.evidence || draft.evidenceText,
      recommendations: cf.tasks || draft.recommendations,
    });
    onToast(lang === 'ru' ? 'Импортировано из карточки дела' : lang === 'en' ? 'Imported from Case File' : 'Ish varaqasidan yuklandi');
  };

  const importFromForensics = () => {
    const ev = lsJSON<EvidenceItem[]>('kj_forensics_evidence', []);
    const tl = lsJSON<ForensicTimelineEvent[]>('kj_forensics_timeline', []);
    if (ev.length === 0 && tl.length === 0) {
      onToast(lang === 'ru' ? 'Нет данных в лаборатории криминалистики' : lang === 'en' ? 'No Forensics data found' : 'Kriminalistika laboratoriyasida ma’lumot yo‘q');
      return;
    }
    updateDraft({
      evidenceText:
        ev.length > 0
          ? ev.map((e) => `• [${e.id}] ${e.name} (${e.type}) | Seal: ${e.sealNumber} | SHA-256: ${e.sha256}`).join('\n')
          : draft.evidenceText,
      timelineText:
        tl.length > 0
          ? tl.map((item) => `${item.timestamp} [${item.severity.toUpperCase()}] (${item.source}): ${item.description}`).join('\n')
          : draft.timelineText,
    });
    onToast(lang === 'ru' ? 'Импортировано из криминалистики' : lang === 'en' ? 'Imported Forensics & Timeline' : 'Kriminalistika va taymlayndan yuklandi');
  };

  const importFromOsintAndExpert = () => {
    const osint = lsJSON<OsintSavedItem[]>('kj_osint_saved', []);
    const expertQs = lsJSON<string[]>('kj_expert_petition', []);
    const osintBlock = osint.map((o) => `[OSINT ${o.kind.toUpperCase()}] ${o.target}: ${o.summary}`).join('\n');
    const expertBlock = expertQs.map((q, i) => `${i + 1}. ${tx(q, lang)}`).join('\n');
    updateDraft({
      summary: osintBlock ? `${draft.summary ? draft.summary + '\n\n' : ''}${osintBlock}` : draft.summary,
      recommendations: expertBlock ? `${draft.recommendations ? draft.recommendations + '\n\n' : ''}${expertBlock}` : draft.recommendations,
    });
    onToast(lang === 'ru' ? 'Импортировано из OSINT и Экспертизы' : lang === 'en' ? 'Imported OSINT & Expert Questions' : 'OSINT va Ekspertizadan yuklandi');
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      await exportReportToPdf(draft, lang);
      logActivity('reports', `Exported PDF report (${draft.caseNumber || 'draft'})`);
      onToast(lang === 'ru' ? 'PDF экспортирован' : lang === 'en' ? 'PDF exported' : 'PDF eksport qilindi');
    } catch {
      onToast(lang === 'ru' ? 'Ошибка экспорта PDF' : lang === 'en' ? 'PDF export error' : 'PDF eksport qilishda xatolik');
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocx = async () => {
    setExporting('docx');
    try {
      await exportReportToDocx(draft, lang);
      logActivity('reports', `Exported DOCX report (${draft.caseNumber || 'draft'})`);
      onToast(lang === 'ru' ? 'DOCX экспортирован' : lang === 'en' ? 'DOCX exported' : 'DOCX eksport qilindi');
    } catch {
      onToast(lang === 'ru' ? 'Ошибка экспорта DOCX' : lang === 'en' ? 'DOCX export error' : 'DOCX eksport qilishda xatolik');
    } finally {
      setExporting(null);
    }
  };

  const templateLabel = (tpl: ReportDraft['template']) =>
    tpl === 'incident'
      ? lang === 'ru'
        ? 'ОТЧЁТ ОБ ИНЦИДЕНТЕ'
        : lang === 'en'
          ? 'INCIDENT REPORT'
          : 'HODISA HISOBOTI'
      : tpl === 'evidence'
        ? lang === 'ru'
          ? 'ОТЧЁТ ПО ЦИФРОВЫМ ДОКАЗАТЕЛЬСТВАМ'
          : lang === 'en'
            ? 'DIGITAL EVIDENCE REPORT'
            : 'RAQAMLI DALILLAR HISOBOTI'
        : lang === 'ru'
          ? 'ИТОГОВЫЙ ОТЧЁТ РАССЛЕДОВАНИЯ'
          : lang === 'en'
            ? 'INVESTIGATION REPORT'
            : 'TERGOV HISOBOTI';

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_reports', lang)}
        title={t('p_reports', lang)}
        subtitle={
          lang === 'ru'
            ? 'Формирование отчётов об инциденте, цифровых доказательствах и хронологии с экспортом в PDF и DOCX.'
            : lang === 'en'
              ? 'Compile incident, digital evidence, timeline, and conclusions reports with real PDF and DOCX export.'
              : 'Hodisa, raqamli dalillar, xronologiya va xulosalar hisobotini PDF hamda DOCX formatida eksport qilish.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={exporting === 'pdf'}
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('exportPdf', lang)}</span>
            </button>
            <button
              type="button"
              disabled={exporting === 'docx'}
              onClick={handleExportDocx}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{t('exportDocx', lang)}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t('print', lang)}</span>
            </button>
          </div>
        }
      />

      {/* Quick Import Bar */}
      <div className="noprint flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
        <span className="mr-1 text-xs font-bold text-[var(--muted)]">
          {lang === 'ru' ? 'Автоимпорт данных:' : lang === 'en' ? 'Import Data:' : 'Ma’lumotlarni yuklash:'}
        </span>
        <button
          type="button"
          onClick={importFromCaseFile}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
        >
          <Import className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>{t('p_case', lang)}</span>
        </button>
        <button
          type="button"
          onClick={importFromForensics}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
        >
          <Import className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>{t('p_forensics', lang)}</span>
        </button>
        <button
          type="button"
          onClick={importFromOsintAndExpert}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
        >
          <Import className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>OSINT + {t('p_expert', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => updateDraft(emptyDraft(caseNo, lang))}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--red)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t('clear', lang)}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Form Editor */}
        <section className="noprint rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
              <span>{lang === 'ru' ? 'Шаблон' : lang === 'en' ? 'Template' : 'Shablon'}</span>
              <select
                value={draft.template}
                onChange={(e) => updateDraft({ template: e.target.value as ReportDraft['template'] })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              >
                <option value="incident">{lang === 'ru' ? 'Анализ инцидента' : lang === 'en' ? 'Incident Analysis' : 'Hodisa tahlili'}</option>
                <option value="evidence">{lang === 'ru' ? 'Цифровые доказательства' : lang === 'en' ? 'Digital Evidence' : 'Raqamli dalillar'}</option>
                <option value="investigation">{lang === 'ru' ? 'Итоговый отчёт' : lang === 'en' ? 'Full Investigation' : 'To‘liq tergov'}</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
              <span>{t('caseNumber', lang)}</span>
              <input
                type="text"
                value={draft.caseNumber}
                onChange={(e) => updateDraft({ caseNumber: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
              <span>{lang === 'ru' ? 'Дата' : lang === 'en' ? 'Date' : 'Sana'}</span>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => updateDraft({ date: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
              <span>{lang === 'ru' ? 'Заголовок отчёта' : lang === 'en' ? 'Report Title' : 'Hisobot sarlavhasi'}</span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
              <span>{lang === 'ru' ? 'Исполнитель' : lang === 'en' ? 'Investigator / Analyst' : 'Tergovchi / Tahlilchi'}</span>
              <input
                type="text"
                value={draft.investigator}
                onChange={(e) => updateDraft({ investigator: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
            <span>{lang === 'ru' ? '1. Описание инцидента и анализ' : lang === 'en' ? '1. Incident Summary & Analysis' : '1. Hodisa va dastlabki tahlil'}</span>
            <textarea
              rows={3}
              value={draft.summary}
              onChange={(e) => updateDraft({ summary: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-3 text-xs text-[var(--text)]"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
            <span>{lang === 'ru' ? '2. Цифровые доказательства и хеши' : lang === 'en' ? '2. Digital Evidence & Hashes' : '2. Raqamli dalillar va xeshlar'}</span>
            <textarea
              rows={3}
              value={draft.evidenceText}
              onChange={(e) => updateDraft({ evidenceText: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--text)]"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
            <span>{lang === 'ru' ? '3. Хронология событий' : lang === 'en' ? '3. Event Timeline' : '3. Hodisalar xronologiyasi'}</span>
            <textarea
              rows={3}
              value={draft.timelineText}
              onChange={(e) => updateDraft({ timelineText: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--text)]"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
            <span>{lang === 'ru' ? '4. Выводы и квалификация' : lang === 'en' ? '4. Conclusions & Qualification' : '4. Xulosa va kvalifikatsiya'}</span>
            <textarea
              rows={2}
              value={draft.conclusions}
              onChange={(e) => updateDraft({ conclusions: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-3 text-xs text-[var(--text)]"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold text-[var(--secondary-text)]">
            <span>{lang === 'ru' ? '5. Рекомендации и вопросы экспертизе' : lang === 'en' ? '5. Recommendations & Next Steps' : '5. Tavsiyalar va keyingi harakatlar'}</span>
            <textarea
              rows={3}
              value={draft.recommendations}
              onChange={(e) => updateDraft({ recommendations: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-3 text-xs text-[var(--text)]"
            />
          </label>
        </section>

        {/* Live Document Preview */}
        <section className="print-surface rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8 space-y-4">
          <div className="border-b border-[var(--line)] pb-4">
            <div className="font-mono text-[11px] font-bold uppercase text-[var(--accent)]">
              KIBERJINOYATLAR · {templateLabel(draft.template)}
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-[var(--text)]">{draft.title || '—'}</h2>
            <div className="mt-2 font-mono text-xs text-[var(--muted)]">
              {t('caseNumber', lang)}: {draft.caseNumber || '—'} · {draft.date} · {draft.investigator}
            </div>
          </div>

          {[
            [lang === 'ru' ? '1. Инцидент' : lang === 'en' ? '1. Summary' : '1. Hodisa', draft.summary],
            [lang === 'ru' ? '2. Цифровые доказательства' : lang === 'en' ? '2. Digital Evidence' : '2. Raqamli dalillar', draft.evidenceText],
            [lang === 'ru' ? '3. Временная шкала' : lang === 'en' ? '3. Timeline' : '3. Xronologiya', draft.timelineText],
            [lang === 'ru' ? '4. Выводы' : lang === 'en' ? '4. Conclusions' : '4. Xulosa', draft.conclusions],
            [lang === 'ru' ? '5. Рекомендации' : lang === 'en' ? '5. Recommendations' : '5. Tavsiyalar', draft.recommendations],
          ].map(([heading, body]) => (
            <div key={heading} className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{heading}</h3>
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--text)]">
                {body || '—'}
              </pre>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
