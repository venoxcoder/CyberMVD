import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEST_QUESTIONS } from '../data/platformData';
import type { Lang, TestQuestion, TestResult } from '../types';
import { generateCertificatePdf } from '../utils/exportUtils';
import { pickText, t } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

interface TestCenterPageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const TestCenterPage: React.FC<TestCenterPageProps> = ({
  lang,
  canGoBack,
  onBack,
  onToast,
}) => {
  const { token } = useAuth();
  const customQuestions = lsJSON<TestQuestion[]>('kj_admin_tests', []);
  const questionPool = useMemo(() => [...TEST_QUESTIONS, ...customQuestions], [customQuestions]);

  const [difficulty, setDifficulty] = useState<'mixed' | 'junior' | 'middle' | 'senior'>('mixed');
  const [category, setCategory] = useState<'all' | 'qualification' | 'forensics' | 'osint' | 'law'>('all');
  const [activeQuestions, setActiveQuestions] = useState<TestQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startTimeMs, setStartTimeMs] = useState(0);
  const [recipientName, setRecipientName] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [history, setHistory] = useState<TestResult[]>(() =>
    lsJSON<TestResult[]>('kj_test_history', [])
  );

  const diffLabel = (d: string) =>
    d === 'junior'
      ? lang === 'ru'
        ? 'Базовый (Junior)'
        : lang === 'en'
          ? 'Junior'
          : 'Boshlang‘ich (Junior)'
      : d === 'middle'
        ? lang === 'ru'
          ? 'Средний (Middle)'
          : lang === 'en'
            ? 'Middle'
            : 'O‘rta (Middle)'
        : d === 'senior'
          ? lang === 'ru'
            ? 'Продвинутый (Senior)'
            : lang === 'en'
              ? 'Senior'
              : 'Yuqori (Senior)'
          : lang === 'ru'
            ? 'Смешанный'
            : lang === 'en'
              ? 'Mixed'
              : 'Aralash';

  const catLabel = (c: TestQuestion['category']) =>
    c === 'qualification'
      ? lang === 'ru'
        ? 'Квалификация УК'
        : lang === 'en'
          ? 'Qualification'
          : 'JK kvalifikatsiya'
      : c === 'forensics'
        ? lang === 'ru'
          ? 'Криминалистика'
          : lang === 'en'
            ? 'Digital Forensics'
            : 'Kriminalistika'
        : c === 'osint'
          ? 'OSINT'
          : lang === 'ru'
            ? 'Право и УПК'
            : lang === 'en'
              ? 'Law & CPC'
              : 'Huquq va JPK';

  useEffect(() => {
    if (!activeQuestions || submitted || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeQuestions, submitted, secondsLeft]);

  const finishQuiz = (qs: TestQuestion[], currentAnswers: Record<string, number>) => {
    if (submitted) return;
    const score = qs.reduce(
      (sum, q) => (currentAnswers[q.id] === q.correctIndex ? sum + 1 : sum),
      0
    );
    const total = qs.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const durationSec = Math.max(1, Math.round((Date.now() - startTimeMs) / 1000));
    const result: TestResult = {
      id: `tr_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      difficulty,
      category,
      score,
      total,
      percentage: pct,
      durationSec,
      passed: pct >= 60,
    };
    const next = [result, ...history].slice(0, 25);
    setHistory(next);
    lsSetJSON('kj_test_history', next);
    logActivity('tests', `Completed ${difficulty} test: ${score}/${total} (${pct}%)`);
    setSubmitted(true);
  };

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (activeQuestions && !submitted && secondsLeft === 0 && startTimeMs > 0) {
      finishQuiz(activeQuestions, answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const startQuiz = () => {
    const filtered = questionPool.filter((q) => {
      if (difficulty !== 'mixed' && q.difficulty !== difficulty) return false;
      if (category !== 'all' && q.category !== category) return false;
      return true;
    });
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 8);
    if (shuffled.length === 0) {
      onToast(lang === 'ru' ? 'Нет вопросов для этого фильтра' : lang === 'en' ? 'No questions match filter' : 'Bu filtr bo‘yicha savollar yo‘q');
      return;
    }
    setActiveQuestions(shuffled);
    setAnswers({});
    setSubmitted(false);
    setSecondsLeft(shuffled.length * 45);
    setStartTimeMs(Date.now());
  };

  const handleAiGenerateQuiz = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lang,
          difficulty: difficulty === 'mixed' ? 'middle' : difficulty,
          topic: category === 'all' ? 'Cybercrime Investigation, OSINT & Digital Forensics' : category,
          count: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(
          data?.error === 'AI_UNCONFIGURED'
            ? lang === 'ru'
              ? 'GEMINI_API_KEY не задан на сервере — используйте встроенный банк вопросов'
              : lang === 'en'
                ? 'GEMINI_API_KEY not configured on server — use built-in question bank'
                : 'Serverda GEMINI_API_KEY sozlanmagan — ichki savollar bankidan foydalaning'
            : data?.message || (lang === 'ru' ? 'Ошибка генерации теста' : lang === 'en' ? 'Error generating test' : 'Test tuzishda xatolik')
        );
        return;
      }
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const mapped: TestQuestion[] = data.questions.map((q: {
          question: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }, i: number) => ({
          id: `ai_q_${Date.now()}_${i}`,
          difficulty: difficulty === 'mixed' ? 'middle' : difficulty,
          category: category === 'all' ? 'forensics' : category,
          question: { uz: q.question, ru: q.question, en: q.question },
          options: { uz: q.options, ru: q.options, en: q.options },
          correctIndex: Number(q.correctIndex) || 0,
          explanation: { uz: q.explanation, ru: q.explanation, en: q.explanation },
        }));
        setActiveQuestions(mapped);
        setAnswers({});
        setSubmitted(false);
        setSecondsLeft(mapped.length * 45);
        setStartTimeMs(Date.now());
      }
    } catch {
      onToast(
        lang === 'ru'
          ? 'Ошибка сети при обращении к /api/ai/generate-test'
          : lang === 'en'
            ? 'Network error contacting /api/ai/generate-test'
            : '/api/ai/generate-test bilan bog‘lanishda tarmoq xatosi'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentScore = activeQuestions
    ? activeQuestions.reduce((acc, q) => (answers[q.id] === q.correctIndex ? acc + 1 : acc), 0)
    : 0;
  const currentPct =
    activeQuestions && activeQuestions.length > 0
      ? Math.round((currentScore / activeQuestions.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_tests', lang)}
        title={t('p_tests', lang)}
        subtitle={
          lang === 'ru'
            ? 'Тестирование по уровням сложности с таймером, разбором ответов, историей результатов и генерацией PDF-сертификата.'
            : lang === 'en'
              ? 'Timed multi-tier assessment with instant explanations, score history, and downloadable PDF completion certificates.'
              : 'Darajalar bo‘yicha taymerli testlar, tushuntirishlar, natijalar tarixi va PDF sertifikat yuklab olish.'
        }
        canGoBack={canGoBack || !!activeQuestions}
        onBack={() => {
          if (activeQuestions) setActiveQuestions(null);
          else onBack();
        }}
      />

      {!activeQuestions ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 space-y-5 lg:col-span-2">
            <h2 className="text-base font-bold text-[var(--text)]">
              {lang === 'ru' ? 'Настройка теста' : lang === 'en' ? 'Configure Assessment' : 'Test parametrlarini tanlash'}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs font-semibold text-[var(--secondary-text)]">
                <span>{lang === 'ru' ? 'Уровень сложности' : lang === 'en' ? 'Difficulty Tier' : 'Qiyinlik darajasi'}</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--text)]"
                >
                  <option value="mixed">{lang === 'ru' ? 'Смешанный (все уровни)' : lang === 'en' ? 'Mixed (All Tiers)' : 'Aralash (barcha darajalar)'}</option>
                  <option value="junior">{diffLabel('junior')}</option>
                  <option value="middle">{diffLabel('middle')}</option>
                  <option value="senior">{diffLabel('senior')}</option>
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-semibold text-[var(--secondary-text)]">
                <span>{lang === 'ru' ? 'Тематика' : lang === 'en' ? 'Topic' : 'Yo‘nalish'}</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--text)]"
                >
                  <option value="all">{lang === 'ru' ? 'Все темы' : lang === 'en' ? 'All Topics' : 'Barcha mavzular'}</option>
                  <option value="qualification">{lang === 'ru' ? 'Квалификация УК' : lang === 'en' ? 'Criminal Qualification' : 'JK kvalifikatsiya'}</option>
                  <option value="forensics">{lang === 'ru' ? 'Криминалистика' : lang === 'en' ? 'Digital Forensics' : 'Kriminalistika'}</option>
                  <option value="osint">OSINT</option>
                  <option value="law">{lang === 'ru' ? 'Право и УПК' : lang === 'en' ? 'Law & CPC' : 'Huquq va JPK'}</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
              >
                <Play className="h-4 w-4" />
                <span>{lang === 'ru' ? 'Начать тест' : lang === 'en' ? 'Start Test' : 'Testni boshlash'}</span>
              </button>

              <button
                type="button"
                disabled={aiLoading}
                onClick={handleAiGenerateQuiz}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-2.5 text-xs font-bold text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                <span>
                  {aiLoading
                    ? '...'
                    : lang === 'ru'
                      ? 'Сгенерировать через ИИ'
                      : lang === 'en'
                        ? 'Generate via AI'
                        : 'AI orqali test tuzish'}
                </span>
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text)]">
              {lang === 'ru' ? 'История результатов' : lang === 'en' ? 'Score History' : 'Natijalar tarixi'}
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                {lang === 'ru' ? 'Тесты ещё не пройдены.' : lang === 'en' ? 'No completed tests yet.' : 'Hali test topshirilmagan.'}
              </p>
            ) : (
              <div className="max-h-[260px] space-y-2 overflow-y-auto">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-bold uppercase text-[var(--text)]">{diffLabel(h.difficulty)}</div>
                      <div className="font-mono text-[11px] text-[var(--muted)]">{h.date}</div>
                    </div>
                    <div className={`font-mono font-bold tabular-nums ${h.passed ? 'text-[var(--ok)]' : 'text-[var(--red)]'}`}>
                      {h.score}/{h.total} ({h.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Timer & Progress Sticky Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-3.5">
            <div className="font-mono text-xs font-bold text-[var(--accent)]">
              {Object.keys(answers).length}/{activeQuestions.length} {lang === 'ru' ? 'ответов' : lang === 'en' ? 'answered' : 'javob'}
            </div>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-1.5 font-mono text-sm font-extrabold tabular-nums text-[var(--text)]">
                <Clock className="h-4 w-4 text-[var(--orange)]" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
              {!submitted ? (
                <button
                  type="button"
                  onClick={() => finishQuiz(activeQuestions, answers)}
                  className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-[var(--accent-ink)]"
                >
                  {lang === 'ru' ? 'Завершить' : lang === 'en' ? 'Submit' : 'Yakunlash'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveQuestions(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t('wzRestart', lang)}</span>
                </button>
              )}
            </div>
          </div>

          {submitted && (
            <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--panel)] p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-[var(--text)]">
                      {currentPct >= 60
                        ? lang === 'ru'
                          ? 'Тест успешно сдан!'
                          : lang === 'en'
                            ? 'Assessment Passed!'
                            : 'Test muvaffaqiyatli topshirildi!'
                        : lang === 'ru'
                          ? 'Нужно повторить материал'
                          : lang === 'en'
                            ? 'Review Recommended'
                            : 'Mavzuni qayta ko‘rib chiqing'}
                    </div>
                    <div className="font-mono text-sm font-bold text-[var(--accent)] tabular-nums">
                      {currentScore} / {activeQuestions.length} ({currentPct}%)
                    </div>
                  </div>
                </div>

                {currentPct >= 60 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={lang === 'ru' ? 'ФИО для сертификата' : lang === 'en' ? 'Name on certificate' : 'Sertifikat uchun F.I.Sh.'}
                      className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5 text-xs text-[var(--text)]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        generateCertificatePdf({
                          recipientName:
                            recipientName.trim() ||
                            (lang === 'ru'
                              ? 'Стажёр-следователь'
                              : lang === 'en'
                                ? 'Investigator Trainee'
                                : 'Tergovchi amaliyotchisi'),
                          score: currentScore,
                          total: activeQuestions.length,
                          percentage: currentPct,
                          difficulty,
                          date: new Date().toISOString().slice(0, 10),
                          lang,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{lang === 'ru' ? 'Скачать сертификат (PDF)' : lang === 'en' ? 'Download Certificate (PDF)' : 'Sertifikatni yuklash (PDF)'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Cards */}
          <div className="space-y-4">
            {activeQuestions.map((q, idx) => {
              const opts = q.options?.[lang] || q.options?.ru || q.options?.uz || [];
              const picked = answers[q.id];
              return (
                <div key={q.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[var(--muted)]">
                    <span className="font-bold text-[var(--accent)]">
                      {lang === 'ru' ? `Вопрос ${idx + 1}` : lang === 'en' ? `Q${idx + 1}` : `${idx + 1}-savol`} · {diffLabel(q.difficulty)}
                    </span>
                    <span>{catLabel(q.category)}</span>
                  </div>
                  <h3 className="text-sm font-bold leading-relaxed text-[var(--text)]">
                    {pickText(q.question, lang)}
                  </h3>
                  <div className="space-y-2">
                    {opts.map((opt, oi) => {
                      const isPicked = picked === oi;
                      const isCorrect = q.correctIndex === oi;
                      let styleClass = 'border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] hover:border-[var(--accent)]';
                      if (submitted) {
                        if (isCorrect) styleClass = 'border-[var(--ok)] bg-[var(--ok)]/10 text-[var(--text)]';
                        else if (isPicked && !isCorrect) styleClass = 'border-[var(--red)] bg-[var(--red)]/10 text-[var(--text)]';
                      } else if (isPicked) {
                        styleClass = 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]';
                      }

                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={submitted}
                          onClick={() => setAnswers((p) => ({ ...p, [q.id]: oi }))}
                          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs sm:text-sm ${styleClass}`}
                        >
                          <span>{opt}</span>
                          {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ok)]" />}
                          {submitted && isPicked && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-[var(--red)]" />}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <div className="rounded-xl bg-[var(--panel2)] px-3.5 py-2.5 text-xs text-[var(--secondary-text)]">
                      {pickText(q.explanation, lang)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
