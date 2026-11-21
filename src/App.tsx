import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AdminPanelPage } from './components/AdminPanelPage';
import { AiAssistantPage } from './components/AiAssistantPage';
import { AuthGate } from './components/AuthGate';
import { CaseDossierPage } from './components/CaseDossierPage';
import { CaseSimulatorPage } from './components/CaseSimulatorPage';
import { ArticleDetailPage, CatalogPage } from './components/CatalogAndArticlePages';
import { ShortcutsModal } from './components/CommonUI';
import {
  DeadEndPage,
  EvidencePage,
  ExpertPage,
  LawPage,
  RejectPage,
  UniversalPage,
  WizardPage,
} from './components/CoreWorkflowPages';
import { DashboardPage } from './components/DashboardPage';
import { DigitalForensicsPage } from './components/DigitalForensicsPage';
import { EvidenceCenterPage } from './components/EvidenceCenterPage';
import { FloatingAiWidget } from './components/FloatingAiWidget';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { IntelligenceGraphPage } from './components/IntelligenceGraphPage';
import { InteractiveMapPage } from './components/InteractiveMapPage';
import { KnowledgeBasePage } from './components/KnowledgeBasePage';
import { LayoutShell } from './components/LayoutShell';
import { OsintLabPage } from './components/OsintLabPage';
import { ProfileDashboardPage } from './components/ProfileDashboardPage';
import { ReportGeneratorPage } from './components/ReportGeneratorPage';
import { TestCenterPage } from './components/TestCenterPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { Lang, PageId, RouteState, ThemeMode } from './types';
import { t } from './utils/i18n';
import { lsGet, lsJSON, lsSet, lsSetJSON } from './utils/storage';

const VALID_PAGES: PageId[] = [
  'dashboard',
  'catalog',
  'art',
  'wizard',
  'universal',
  'evidence',
  'evidenceCenter',
  'case',
  'graph',
  'knowledge',
  'law',
  'expert',
  'dead',
  'reject',
  'ai',
  'osint',
  'forensics',
  'simulator',
  'map',
  'tests',
  'profile',
  'reports',
  'admin',
];

function parseHashRoute(): RouteState {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return { page: 'dashboard' };
  const params = new URLSearchParams(raw);
  const p = (params.get('p') || 'dashboard') as PageId;
  const page = VALID_PAGES.includes(p) ? p : 'dashboard';
  return {
    page,
    a: params.get('a') || undefined,
    m: params.get('m') || undefined,
    view: params.get('view') || undefined,
    id: params.get('id') || undefined,
    tab: params.get('tab') || undefined,
  };
}

function buildHash(r: RouteState): string {
  const params = new URLSearchParams();
  params.set('p', r.page);
  if (r.a) params.set('a', r.a);
  if (r.m) params.set('m', r.m);
  if (r.view) params.set('view', r.view);
  if (r.id) params.set('id', r.id);
  if (r.tab) params.set('tab', r.tab);
  return `#${params.toString()}`;
}

function WorkspaceApp() {
  const { user } = useAuth();

  const [lang, setLang] = useState<Lang>(() => {
    const saved = lsGet('kiberLanguage');
    return saved === 'uz' || saved === 'ru' || saved === 'en' ? saved : 'ru';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = lsGet('kiberTheme');
    return saved === 'system' || saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const [route, setRoute] = useState<RouteState>(() => parseHashRoute());
  const [navHistory, setNavHistory] = useState<RouteState[]>([]);

  const [caseNo, setCaseNo] = useState<string>(() => lsGet('kj_case') || '');
  const [ticks, setTicks] = useState<Record<string, boolean>>(() =>
    lsJSON<Record<string, boolean>>(`kj_ticks_${lsGet('kj_case') || ''}`, {})
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    lsSet('kiberLanguage', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const pageKey = route.page === 'art' ? 'p_catalog' : `p_${route.page}`;
    document.title = `KIBERJINOYATLAR — ${t(pageKey, lang)}`;
  }, [lang, route.page]);

  useEffect(() => {
    lsSet('kiberTheme', theme);
    const apply = () => {
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark'
          : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const listener = () => apply();
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = useCallback(
    (
      page: PageId,
      opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
    ) => {
      const next: RouteState = {
        page,
        a: opts?.a,
        m: opts?.m,
        view: opts?.view,
        id: opts?.id,
        tab: opts?.tab,
      };
      setNavHistory((prev) => [...prev.slice(-24), route]);
      setRoute(next);
      window.location.hash = buildHash(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [route]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    if (!user) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setShortcutsOpen(false);
        return;
      }
      if (!inInput && e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleNavigate('dashboard');
        } else if (e.key === '2') {
          e.preventDefault();
          handleNavigate('case');
        } else if (e.key === '3') {
          e.preventDefault();
          handleNavigate('evidenceCenter');
        } else if (e.key === '4') {
          e.preventDefault();
          handleNavigate('graph');
        } else if (e.key === '5') {
          e.preventDefault();
          handleNavigate('catalog');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, handleNavigate]);

  const handleBack = useCallback(() => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory((list) => list.slice(0, -1));
      setRoute(prev);
      window.location.hash = buildHash(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (route.page === 'art') {
      handleNavigate('catalog');
      return;
    }
    if (route.page !== 'dashboard') {
      handleNavigate('dashboard');
    }
  }, [navHistory, route.page, handleNavigate]);

  const handleCaseNoChange = useCallback((val: string) => {
    setCaseNo(val);
    lsSet('kj_case', val);
    setTicks(lsJSON<Record<string, boolean>>(`kj_ticks_${val}`, {}));
  }, []);

  const handleToggleTick = useCallback(
    (key: string) => {
      setTicks((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        lsSetJSON(`kj_ticks_${caseNo}`, next);
        return next;
      });
    },
    [caseNo]
  );

  const handleClearTicks = useCallback(
    (keysToClear: string[]) => {
      setTicks((prev) => {
        const next = { ...prev };
        keysToClear.forEach((k) => delete next[k]);
        lsSetJSON(`kj_ticks_${caseNo}`, next);
        return next;
      });
    },
    [caseNo]
  );

  if (!user) {
    return (
      <AuthGate
        lang={lang}
        onLangChange={setLang}
        theme={theme}
        onThemeChange={setTheme}
      />
    );
  }

  const canGoBack = route.page !== 'dashboard' || navHistory.length > 0;

  const renderPage = () => {
    switch (route.page) {
      case 'dashboard':
        return <DashboardPage lang={lang} onNavigate={handleNavigate} />;
      case 'catalog':
        return (
          <CatalogPage
            lang={lang}
            initialView={route.view}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        );
      case 'art':
        return (
          <ArticleDetailPage
            lang={lang}
            articleId={route.a || ''}
            methodId={route.m}
            caseNo={caseNo}
            onCaseNoChange={handleCaseNoChange}
            ticks={ticks}
            onToggleTick={handleToggleTick}
            onClearTicks={handleClearTicks}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'wizard':
        return (
          <WizardPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'universal':
        return (
          <UniversalPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        );
      case 'evidence':
        return (
          <EvidencePage
            lang={lang}
            caseNo={caseNo}
            onCaseNoChange={handleCaseNoChange}
            ticks={ticks}
            onToggleTick={handleToggleTick}
            onClearTicks={handleClearTicks}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'evidenceCenter':
        return (
          <EvidenceCenterPage
            lang={lang}
            selectedEvidenceId={route.id}
            canGoBack={canGoBack}
            onBack={handleBack}
            onToast={showToast}
          />
        );
      case 'case':
        return (
          <CaseDossierPage
            lang={lang}
            selectedCaseId={route.id}
            initialTab={route.tab}
            caseNo={caseNo}
            onCaseNoChange={handleCaseNoChange}
            ticks={ticks}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'graph':
        return (
          <IntelligenceGraphPage
            lang={lang}
            initialCaseId={route.id}
            canGoBack={canGoBack}
            onBack={handleBack}
            onToast={showToast}
          />
        );
      case 'knowledge':
        return (
          <KnowledgeBasePage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onToast={showToast}
          />
        );
      case 'law':
        return (
          <LawPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        );
      case 'expert':
        return (
          <ExpertPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'dead':
        return (
          <DeadEndPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        );
      case 'reject':
        return (
          <RejectPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        );
      case 'ai':
        return (
          <AiAssistantPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onToast={showToast}
          />
        );
      case 'osint':
        return (
          <OsintLabPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'forensics':
        return (
          <DigitalForensicsPage
            lang={lang}
            caseNo={caseNo}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'simulator':
        return (
          <CaseSimulatorPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      case 'map':
        return (
          <InteractiveMapPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        );
      case 'tests':
        return (
          <TestCenterPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onToast={showToast}
          />
        );
      case 'profile':
        return (
          <ProfileDashboardPage
            lang={lang}
            ticks={ticks}
            canGoBack={canGoBack}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        );
      case 'reports':
        return (
          <ReportGeneratorPage
            lang={lang}
            caseNo={caseNo}
            canGoBack={canGoBack}
            onBack={handleBack}
            onToast={showToast}
          />
        );
      case 'admin':
        return (
          <AdminPanelPage
            lang={lang}
            canGoBack={canGoBack}
            onBack={handleBack}
            onToast={showToast}
          />
        );
      default:
        return <DashboardPage lang={lang} onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <LayoutShell
        lang={lang}
        onLangChange={setLang}
        theme={theme}
        onThemeChange={setTheme}
        route={route}
        canGoBack={canGoBack}
        onBack={handleBack}
        onNavigate={handleNavigate}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        toastMessage={toastMessage}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${route.page}-${route.a || ''}-${route.m || ''}-${route.view || ''}-${route.id || ''}`}
            initial={{ opacity: 0, y: 12, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.994 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </LayoutShell>

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        lang={lang}
        onNavigate={handleNavigate}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        lang={lang}
      />

      <FloatingAiWidget
        lang={lang}
        route={route}
        onNavigate={handleNavigate}
        onToast={showToast}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceApp />
    </AuthProvider>
  );
}
