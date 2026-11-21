import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { SIM_CASES } from '../data/platformData';
import type { Lang, PageId, ReportDraft, SimCase, SimChoice, SimCompletion } from '../types';
import { pickText, t } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

interface CaseSimulatorPageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId, opts?: { a?: string }) => void;
  onToast: (msg: string) => void;
}

export const CaseSimulatorPage: React.FC<CaseSimulatorPageProps> = ({
  lang,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const customCases = lsJSON<SimCase[]>('kj_admin_cases', []);
  const allCases = useMemo(() => [...SIM_CASES, ...customCases], [customCases]);

  const [completions, setCompletions] = useState<SimCompletion[]>(() =>
    lsJSON<SimCompletion[]>('kj_sim_completions', [])
  );
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosenLog, setChosenLog] = useState<{ stepPrompt: string; choice: SimChoice }[]>([]);
  const [lastFeedback, setLastFeedback] = useState<SimChoice | null>(null);
  const [finished, setFinished] = useState(false);

  const activeCase = allCases.find((c) => c.id === activeCaseId) || null;

  const startCase = (c: SimCase) => {
    setActiveCaseId(c.id);
    setStepIdx(0);
    setScore(0);
    setChosenLog([]);
    setLastFeedback(null);
    setFinished(false);
  };

  const handleSelectChoice = (choice: SimChoice) => {
    if (!activeCase || lastFeedback) return;
    const step = activeCase.steps[stepIdx];
    const nextScore = score + choice.points;
    setScore(nextScore);
    setChosenLog((p) => [...p, { stepPrompt: pickText(step.prompt, lang), choice }]);
    setLastFeedback(choice);
  };

  const handleNextStep = () => {
    if (!activeCase) return;
    if (stepIdx + 1 < activeCase.steps.length) {
      setStepIdx((p) => p + 1);
      setLastFeedback(null);
    } else {
      const maxScore = activeCase.steps.reduce(
        (sum, st) => sum + Math.max(...st.choices.map((c) => c.points)),
        0
      );
      const record: SimCompletion = {
        caseId: activeCase.id,
        score,
        maxScore,
        completedAt: new Date().toISOString(),
        decisions: chosenLog.map((l) => pickText(l.choice.label, lang)),
      };
      const next = [record, ...completions.filter((c) => c.caseId !== activeCase.id)];
      setCompletions(next);
      lsSetJSON('kj_sim_completions', next);
      logActivity('simulator', `Completed ${activeCase.code} (${score}/${maxScore})`);
      setFinished(true);
    }
  };

  const ptsLabel = lang === 'ru' ? 'б.' : lang === 'en' ? 'pts' : 'ball';
  const diffLabel = (d: SimCase['difficulty']) =>
    d === 'junior'
      ? lang === 'ru'
        ? 'Базовый'
        : lang === 'en'
          ? 'Junior'
          : 'Boshlang‘ich'
      : d === 'middle'
        ? lang === 'ru'
          ? 'Средний'
          : lang === 'en'
            ? 'Middle'
            : 'O‘rta'
        : lang === 'ru'
          ? 'Продвинутый'
          : lang === 'en'
            ? 'Senior'
            : 'Yuqori';

  const handleExportDebrief = () => {
    if (!activeCase) return;
    const existing = lsJSON<ReportDraft>('kj_report_draft', {
      template: 'investigation',
      title: `${activeCase.code}: ${pickText(activeCase.title, lang)}`,
      caseNumber: activeCase.code,
      investigator:
        lang === 'ru'
          ? 'Стажёр-следователь'
          : lang === 'en'
            ? 'Simulator Trainee'
            : 'Simulyator amaliyotchisi',
      date: new Date().toISOString().slice(0, 10),
      summary: '',
      evidenceText: '',
      timelineText: '',
      conclusions: '',
      recommendations: '',
    });
    const decisionLines = chosenLog
      .map(
        (entry, i) =>
          `${i + 1}. ${entry.stepPrompt}\n   -> ${pickText(entry.choice.label, lang)} (${entry.choice.points} ${ptsLabel})`
      )
      .join('\n');

    lsSetJSON('kj_report_draft', {
      ...existing,
      title: `${activeCase.code}: ${pickText(activeCase.title, lang)}`,
      caseNumber: activeCase.code,
      summary: pickText(activeCase.briefing, lang),
      evidenceText: activeCase.artifacts
        .map((a) => `${pickText(a.label, lang)} (${a.kind}): ${a.content}`)
        .join('\n'),
      conclusions: decisionLines,
    });
    onToast(t('saved', lang));
    onNavigate('reports');
  };

  const handleBackAction = () => {
    if (activeCase) {
      setActiveCaseId(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_simulator', lang)}
        title={activeCase ? `${activeCase.code}: ${pickText(activeCase.title, lang)}` : t('p_simulator', lang)}
        subtitle={
          activeCase
            ? pickText(activeCase.briefing, lang)
            : lang === 'ru'
              ? 'Изучайте учебные вымышленные дела, оценивайте улики, принимайте тактические решения и получайте итоговый разбор.'
              : lang === 'en'
                ? 'Investigate fictional cybercrime scenarios, inspect artifacts, choose tactical actions, and earn a debrief score.'
                : 'O‘quv jinoyat ishlarini o‘rganing, raqamli dalillarni tahlil qiling va tergov qarorlari bo‘yicha baho oling.'
        }
        canGoBack={canGoBack || !!activeCase}
        onBack={handleBackAction}
        actions={
          activeCase && (
            <button
              type="button"
              onClick={() => startCase(activeCase)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('wzRestart', lang)}</span>
            </button>
          )
        }
      />

      <div className="rounded-xl border border-[var(--blue)]/40 bg-[var(--blue)]/10 px-4 py-2.5 text-xs font-semibold text-[var(--text)]">
        {t('trainingBadge', lang)} —{' '}
        {lang === 'ru'
          ? 'Все фабулы и артефакты в симуляторе являются вымышленными учебными сценариями.'
          : lang === 'en'
            ? 'All cases and artifacts in the simulator are fictional training scenarios.'
            : 'Simulyatordagi barcha ishlar va artefaktlar o‘quv maqsadida modellashtirilgan.'}
      </div>

      {!activeCase ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allCases.map((c) => {
            const done = completions.find((x) => x.caseId === c.id);
            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--accent)]">{c.code}</span>
                    <span className="uppercase text-[var(--muted)]">{diffLabel(c.difficulty)}</span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text)]">{pickText(c.title, lang)}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--secondary-text)]">
                    {pickText(c.briefing, lang)}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                  <span className="font-mono text-xs text-[var(--ok)]">
                    {done
                      ? `${done.score}/${done.maxScore} ${ptsLabel}`
                      : `${c.steps.length} ${lang === 'ru' ? 'этап.' : lang === 'en' ? 'stages' : 'bosqich'}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => startCase(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{lang === 'ru' ? 'Начать' : lang === 'en' ? 'Start' : 'Boshlash'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Case Artifacts Panel */}
          <aside className="space-y-3 lg:col-span-1">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 space-y-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--accent)]">
                {lang === 'ru' ? 'Материалы дела' : lang === 'en' ? 'Case Artifacts' : 'Ish materiallari'}
              </h3>
              {activeCase.artifacts.map((art, i) => (
                <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[var(--text)]">
                    <span>{pickText(art.label, lang)}</span>
                    <span className="font-mono text-[10px] text-[var(--accent)]">{art.kind}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--secondary-text)]">
                    {art.content}
                  </pre>
                </div>
              ))}
              {activeCase.relatedArticleId && (
                <button
                  type="button"
                  onClick={() => onNavigate('art', { a: activeCase.relatedArticleId })}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  {lang === 'ru' ? 'См. алгоритм в каталоге →' : lang === 'en' ? 'Reference Algorithm →' : 'Katalogdagi algoritm →'}
                </button>
              )}
            </div>
          </aside>

          {/* Decision Engine / Debrief */}
          <section className="lg:col-span-2">
            {!finished ? (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 space-y-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-[var(--accent)]">
                    {lang === 'ru' ? 'Этап' : lang === 'en' ? 'Stage' : 'Bosqich'} {stepIdx + 1}/{activeCase.steps.length}
                  </span>
                  <span className="text-[var(--text)] font-bold tabular-nums">
                    {lang === 'ru' ? 'Баллы' : lang === 'en' ? 'Score' : 'Ball'}: {score}
                  </span>
                </div>

                <h2 className="text-base font-bold leading-relaxed text-[var(--text)]">
                  {pickText(activeCase.steps[stepIdx].prompt, lang)}
                </h2>

                <div className="space-y-2.5">
                  {activeCase.steps[stepIdx].choices.map((ch) => {
                    const selected = lastFeedback?.id === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={!!lastFeedback}
                        onClick={() => handleSelectChoice(ch)}
                        className={`w-full rounded-xl border p-4 text-left text-xs leading-relaxed transition-colors sm:text-sm ${
                          selected
                            ? ch.isOptimal
                              ? 'border-[var(--ok)] bg-[var(--ok)]/10 text-[var(--text)]'
                              : 'border-[var(--red)] bg-[var(--red)]/10 text-[var(--text)]'
                            : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] hover:border-[var(--accent)]'
                        }`}
                      >
                        {pickText(ch.label, lang)}
                      </button>
                    );
                  })}
                </div>

                {lastFeedback && (
                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {lastFeedback.isOptimal ? (
                        <CheckCircle2 className="h-4 w-4 text-[var(--ok)]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[var(--red)]" />
                      )}
                      <span className={lastFeedback.isOptimal ? 'text-[var(--ok)]' : 'text-[var(--red)]'}>
                        +{lastFeedback.points} {ptsLabel}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--text)]">
                      {pickText(lastFeedback.feedback, lang)}
                    </p>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)]"
                    >
                      <span>
                        {stepIdx + 1 < activeCase.steps.length
                          ? lang === 'ru'
                            ? 'Следующий этап'
                            : lang === 'en'
                              ? 'Next Stage'
                              : 'Keyingi bosqich'
                          : lang === 'ru'
                            ? 'Завершить расследование'
                            : lang === 'en'
                              ? 'Finish Investigation'
                              : 'Tergovni yakunlash'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[var(--text)]">
                      {lang === 'ru' ? 'Итоговый отчёт расследования' : lang === 'en' ? 'Investigation Debrief' : 'Yakuniy tergov xulosasi'}
                    </h2>
                    <div className="font-mono text-sm font-bold text-[var(--accent)]">
                      {lang === 'ru' ? 'Итоговый балл' : lang === 'en' ? 'Total Score' : 'Umumiy ball'}: {score} / {activeCase.steps.reduce((s, st) => s + Math.max(...st.choices.map((c) => c.points)), 0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {chosenLog.map((entry, idx) => (
                    <div key={idx} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5 text-xs space-y-1">
                      <div className="font-bold text-[var(--text)]">{entry.stepPrompt}</div>
                      <div className={entry.choice.isOptimal ? 'text-[var(--ok)]' : 'text-[var(--orange)]'}>
                        → {pickText(entry.choice.label, lang)} ({entry.choice.points} {ptsLabel})
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportDebrief}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t('sendToReport', lang)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startCase(activeCase)}
                    className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-4 py-2 text-xs font-semibold text-[var(--text)]"
                  >
                    {t('wzRestart', lang)}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
