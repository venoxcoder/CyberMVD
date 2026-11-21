import React from 'react';
import {
  Award,
  Bookmark,
  CheckCircle2,
  Clock,
  Globe,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { ART, keysOfMethod } from '../data/crimeData';
import { KB_ARTICLES, OSINT_TASKS, SIM_CASES } from '../data/platformData';
import type {
  ActivityLogItem,
  EvidenceItem,
  Lang,
  OsintSavedItem,
  PageId,
  SimCompletion,
  TestResult,
} from '../types';
import { pickText, t } from '../utils/i18n';
import { lsJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

interface ProfileDashboardPageProps {
  lang: Lang;
  ticks: Record<string, boolean>;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
}

export const ProfileDashboardPage: React.FC<ProfileDashboardPageProps> = ({
  lang,
  ticks,
  canGoBack,
  onBack,
  onNavigate,
}) => {
  const kbRead = lsJSON<string[]>('kj_kb_read', []);
  const kbBookmarks = lsJSON<string[]>('kj_kb_bookmarks', []);
  const simDone = lsJSON<SimCompletion[]>('kj_sim_completions', []);
  const testHistory = lsJSON<TestResult[]>('kj_test_history', []);
  const osintSolved = lsJSON<Record<string, boolean>>('kj_osint_solved', {});
  const osintSaved = lsJSON<OsintSavedItem[]>('kj_osint_saved', []);
  const evidenceItems = lsJSON<EvidenceItem[]>('kj_forensics_evidence', []);
  const activityLog = lsJSON<ActivityLogItem[]>('kj_activity_log', []);

  const totalAlgoSteps = ART.reduce(
    (sum, a) => sum + a.m.reduce((ms, m) => ms + keysOfMethod(m).length, 0),
    0
  );
  const completedAlgoSteps = Object.entries(ticks).filter(
    ([k, v]) => v && k.includes('|') && !k.startsWith('ev|')
  ).length;
  const osintSolvedCount = Object.values(osintSolved).filter(Boolean).length;
  const passedTests = testHistory.filter((x) => x.passed).length;

  const badges = [
    {
      id: 'b_first_steps',
      earned: completedAlgoSteps >= 5,
      icon: CheckCircle2,
      title: { uz: 'Algoritm ustasi', ru: 'Мастер алгоритмов', en: 'Algorithm Practitioner' },
      req: { uz: '5+ algoritm qadami bajarildi', ru: 'Выполнено 5+ шагов алгоритма', en: '5+ algorithm steps checked' },
    },
    {
      id: 'b_osint',
      earned: osintSolvedCount >= 2 || osintSaved.length >= 1,
      icon: Globe,
      title: { uz: 'OSINT Razvedkachi', ru: 'Аналитик OSINT', en: 'OSINT Investigator' },
      req: { uz: '2+ OSINT topshirig‘i yoki saqlangan tahlil', ru: '2+ задачи OSINT или сохранённый отчёт', en: '2+ OSINT tasks or saved lookup' },
    },
    {
      id: 'b_forensics',
      earned: evidenceItems.length >= 1,
      icon: HardDrive,
      title: { uz: 'Kriminalist', ru: 'Цифровой криминалист', en: 'Digital Forensic Analyst' },
      req: { uz: '1+ raqamli dalil ro‘yxatga olindi', ru: 'Зарегистрировано 1+ цифровое доказательство', en: 'Register 1+ evidence item' },
    },
    {
      id: 'b_sim',
      earned: simDone.length >= 1,
      icon: Sparkles,
      title: { uz: 'Tergovchi simulyator', ru: 'Следователь-практик', en: 'Case Simulator Closer' },
      req: { uz: '1+ simulyatsiya ishi yakunlandi', ru: 'Завершён 1+ учебный кейс', en: 'Complete 1+ simulation case' },
    },
    {
      id: 'b_cert',
      earned: passedTests >= 1,
      icon: Award,
      title: { uz: 'Sertifikatlangan mutaxassis', ru: 'Сертифицированный специалист', en: 'Certified Trainee' },
      req: { uz: 'Test markazidan o‘tish (>= 60%)', ru: 'Пройти тест (>= 60%)', en: 'Pass Test Center (>= 60%)' },
    },
  ];

  const bookmarkedArticles = KB_ARTICLES.filter((a) => kbBookmarks.includes(a.id));

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_profile', lang)}
        title={t('p_profile', lang)}
        subtitle={
          lang === 'ru'
            ? 'Прогресс обучения, завершённые дела, результаты тестов, достижения, закладки и журнал активности.'
            : lang === 'en'
              ? 'Learning progress, completed modules & cases, test history, earned badges, bookmarks, and recent activity.'
              : 'O‘qish progressi, yakunlangan ishlar, test natijalari, yutuqlar, xatcho‘plar va oxirgi faollik.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
      />

      {/* Progress KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">
            {lang === 'ru' ? 'Шаги алгоритмов' : lang === 'en' ? 'Algorithm Steps' : 'Algoritm qadamlari'}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[var(--accent)]">
            {completedAlgoSteps}/{totalAlgoSteps}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">
            {lang === 'ru' ? 'Изучено в Базе знаний' : lang === 'en' ? 'Knowledge Base Read' : 'Bilimlar bazasi'}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
            {kbRead.length}/{KB_ARTICLES.length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">
            {lang === 'ru' ? 'Симулятор и OSINT' : lang === 'en' ? 'Simulator & OSINT' : 'Simulyator va OSINT'}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[var(--text)]">
            {simDone.length}/{SIM_CASES.length} · {osintSolvedCount}/{OSINT_TASKS.length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">
            {lang === 'ru' ? 'Пройдено тестов' : lang === 'en' ? 'Tests Passed' : 'Topshirilgan testlar'}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[var(--ok)]">
            {passedTests} / {testHistory.length}
          </div>
        </div>
      </div>

      {/* Achievements / Badges */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
        <h2 className="text-base font-bold text-[var(--text)]">
          {lang === 'ru' ? 'Достижения и значки' : lang === 'en' ? 'Achievements & Badges' : 'Yutuqlar va nishonlar'}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`rounded-xl border p-4 text-xs transition-opacity ${
                  b.earned
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--line)] bg-[var(--panel2)] opacity-55'
                }`}
              >
                <Icon className={`h-5 w-5 ${b.earned ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
                <div className="mt-2 font-bold text-[var(--text)]">{pickText(b.title, lang)}</div>
                <div className="mt-1 text-[11px] text-[var(--secondary-text)]">{pickText(b.req, lang)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bookmarked Materials */}
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
              <Bookmark className="h-4 w-4 text-[var(--accent)]" />
              <span>{lang === 'ru' ? 'Сохранённые материалы' : lang === 'en' ? 'Bookmarked Materials' : 'Saqlangan materiallar'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('knowledge')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              {t('open', lang)} →
            </button>
          </div>
          {bookmarkedArticles.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              {lang === 'ru' ? 'Закладок пока нет.' : lang === 'en' ? 'No bookmarked articles yet.' : 'Hali xatcho‘plar yo‘q.'}
            </p>
          ) : (
            <div className="space-y-2">
              {bookmarkedArticles.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onNavigate('knowledge')}
                  className="block w-full rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-3.5 py-2.5 text-left text-xs hover:border-[var(--accent)]"
                >
                  <div className="font-bold text-[var(--text)]">{pickText(art.title, lang)}</div>
                  <div className="mt-0.5 text-[var(--muted)]">{pickText(art.summary, lang)}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity Log */}
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            <span>{lang === 'ru' ? 'Журнал активности' : lang === 'en' ? 'Recent Activity' : 'Oxirgi faollik'}</span>
          </h3>
          {activityLog.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              {lang === 'ru' ? 'Активность появится по мере работы с модулями.' : lang === 'en' ? 'Activity will appear as you explore modules.' : 'Modullardan foydalanganingiz sari faollik tarixi yoziladi.'}
            </p>
          ) : (
            <div className="max-h-[280px] space-y-2 overflow-y-auto">
              {activityLog.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--panel2)] px-3 py-2 text-xs"
                >
                  <span className="truncate text-[var(--text)]">
                    <span className="mr-1.5 font-mono font-bold uppercase text-[var(--accent)]">[{item.module}]</span>
                    {item.action}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
                    {item.timestamp.slice(11, 16)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
