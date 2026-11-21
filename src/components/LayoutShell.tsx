import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  ArrowUp,
  Award,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  CheckSquare,
  Compass,
  FileText,
  Globe,
  HardDrive,
  Home,
  Keyboard,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  Microscope,
  Network,
  Pin,
  Scale,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Lang, PageId, RouteState, ThemeMode } from '../types';
import { deptLabel, localizeRecordText, t, tr } from '../utils/i18n';
import { AmbientCyberBackground } from './AmbientCyberBackground';

interface LayoutShellProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  route: RouteState;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (
    page: PageId,
    opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
  ) => void;
  onOpenSearch: () => void;
  onOpenShortcuts: () => void;
  toastMessage: string | null;
  children: React.ReactNode;
}

interface NavItemDef {
  id: PageId;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  reqPerm?:
    | 'evidence_read'
    | 'ai_use'
    | 'osint_use'
    | 'users_manage'
    | 'audit_read'
    | 'reports_export';
}

interface NavGroup {
  labelKey: string;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'grpMain',
    items: [
      { id: 'dashboard', labelKey: 'p_dashboard', icon: Home },
      { id: 'case', labelKey: 'p_case', icon: Briefcase },
      { id: 'evidenceCenter', labelKey: 'p_evidenceCenter', icon: HardDrive, reqPerm: 'evidence_read' },
      { id: 'graph', labelKey: 'p_graph', icon: Network },
      { id: 'catalog', labelKey: 'p_catalog', icon: LayoutGrid },
      { id: 'wizard', labelKey: 'p_wizard', icon: Compass },
    ],
  },
  {
    labelKey: 'grpLabs',
    items: [
      { id: 'ai', labelKey: 'p_ai', icon: Bot, reqPerm: 'ai_use' },
      { id: 'osint', labelKey: 'p_osint', icon: Globe, reqPerm: 'osint_use' },
      { id: 'forensics', labelKey: 'p_forensics', icon: Microscope },
      { id: 'simulator', labelKey: 'p_simulator', icon: Sparkles },
      { id: 'map', labelKey: 'p_map', icon: MapPin },
    ],
  },
  {
    labelKey: 'grpWork',
    items: [
      { id: 'universal', labelKey: 'p_universal', icon: Activity },
      { id: 'evidence', labelKey: 'p_evidence', icon: CheckSquare },
      { id: 'expert', labelKey: 'p_expert', icon: Shield },
      { id: 'tests', labelKey: 'p_tests', icon: Award },
      { id: 'reports', labelKey: 'p_reports', icon: FileText },
      { id: 'knowledge', labelKey: 'p_knowledge', icon: BookOpen },
      { id: 'profile', labelKey: 'p_profile', icon: UserCheck },
    ],
  },
  {
    labelKey: 'grpRef',
    items: [
      { id: 'law', labelKey: 'p_law', icon: Scale },
      { id: 'dead', labelKey: 'p_dead', icon: LifeBuoy },
      { id: 'reject', labelKey: 'p_reject', icon: ShieldAlert },
      { id: 'admin', labelKey: 'p_admin', icon: Settings },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((g) => g.items);

export const LayoutShell: React.FC<LayoutShellProps> = ({
  lang,
  onLangChange,
  theme,
  onThemeChange,
  route,
  canGoBack,
  onBack,
  onNavigate,
  onOpenSearch,
  onOpenShortcuts,
  toastMessage,
  children,
}) => {
  const {
    user,
    permissions,
    prefs,
    notifications,
    logout,
    setDensity,
    togglePinPage,
    setShowHints,
    applyWorkspacePreset,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!notifOpen && !settingsOpen && !profileOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (settingsOpen && settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setSettingsOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notifOpen, settingsOpen, profileOpen]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setShowScrollTop(y > 220);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeNavId: PageId = route.page === 'art' ? 'catalog' : route.page;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const isNavAllowed = (item: NavItemDef): boolean => {
    if (!item.reqPerm || !permissions) return true;
    return Boolean(permissions[item.reqPerm]);
  };

  const roleBadgeText = (role?: string) => {
    const map: Record<string, Record<Lang, string>> = {
      admin: { uz: 'Administrator', ru: 'Администратор', en: 'Administrator' },
      department_head: { uz: 'Bo‘lim boshlig‘i', ru: 'Рук. подразделения', en: 'Dept. Head' },
      officer: { uz: 'Xodim', ru: 'Сотрудник', en: 'Officer' },
      analyst: { uz: 'Tahlilchi', ru: 'Аналитик', en: 'Analyst' },
      observer: { uz: 'Kuzatuvchi', ru: 'Наблюдатель', en: 'Observer' },
    };
    return (role && map[role]?.[lang]) || role || 'User';
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          onNavigate('dashboard');
          setMobileOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onNavigate('dashboard');
            setMobileOpen(false);
          }
        }}
        className="flex cursor-pointer items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 transition-colors hover:bg-[var(--hover-bg)]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-1">
          <img
            src="./assets/aistudio/logo_e89a7120.svg"
            alt="KIBERJINOYATLAR"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-extrabold tracking-wider text-[var(--text)]">
            KIBERJINOYATLAR
          </div>
          <div className="truncate text-[9px] font-bold tracking-[0.14em] text-[var(--accent)]">
            {t('brandSub', lang)}
          </div>
        </div>
      </div>

      {/* Pinned & Recent strip */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {prefs.pinnedPages.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between px-2.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--muted)]">
              <span>{lang === 'ru' ? 'Закреплено' : lang === 'en' ? 'Pinned' : 'Qadalgan'}</span>
              <Pin className="h-3 w-3" />
            </div>
            <div className="space-y-0.5">
              {prefs.pinnedPages.map((pid) => {
                const def = FLAT_NAV.find((i) => i.id === pid);
                if (!def || !isNavAllowed(def)) return null;
                const Icon = def.icon;
                const isActive = activeNavId === def.id;
                return (
                  <button
                    key={`pin_${pid}`}
                    type="button"
                    onClick={() => {
                      onNavigate(pid);
                      setMobileOpen(false);
                    }}
                    className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${
                      isActive
                        ? 'font-semibold text-[var(--accent)]'
                        : 'text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-pin-active"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-[var(--accent-soft)]"
                      />
                    )}
                    <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" />
                    <span className="relative z-10 truncate">{t(def.labelKey, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isNavAllowed);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.labelKey}>
              <div className="mb-1 px-2.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--muted)]">
                {t(group.labelKey, lang)}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNavId === item.id;
                  const isPinned = prefs.pinnedPages.includes(item.id);
                  return (
                    <div key={item.id} className="group flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(item.id);
                          setMobileOpen(false);
                        }}
                        className={`relative flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors ${
                          isActive
                            ? 'font-semibold text-[var(--accent)]'
                            : 'text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-nav-active"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            className="absolute inset-0 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-soft)]"
                          />
                        )}
                        <Icon
                          className={`relative z-10 h-4 w-4 shrink-0 ${
                            isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                          }`}
                        />
                        <span className="relative z-10 truncate">{t(item.labelKey, lang)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePinPage(item.id)}
                        title={lang === 'ru' ? 'Закрепить модуль' : lang === 'en' ? 'Pin module' : 'Qadash'}
                        className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                          isPinned ? 'opacity-100 text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {prefs.favorites.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between px-2.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--muted)]">
              <span>{lang === 'ru' ? 'Избранное' : lang === 'en' ? 'Favorites' : 'Saralangan'}</span>
              <Star className="h-3 w-3" />
            </div>
            <div className="space-y-0.5">
              {prefs.favorites.slice(0, 5).map((fav) => (
                <button
                  key={`${fav.kind}_${fav.id}`}
                  type="button"
                  onClick={() => {
                    onNavigate(fav.page, fav.routeOpts);
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[11px] text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
                >
                  <Star className="h-3 w-3 shrink-0 text-[var(--orange)]" />
                  <span className="truncate">{fav.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-[var(--line)] px-4 py-2.5 text-[11px] text-[var(--muted)]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[var(--text)]">{t('mode', lang)}</span>
          <span className="font-mono text-[10px] text-[var(--accent)]">RBAC v2</span>
        </div>
        {user && (
          <div className="mt-1 truncate font-mono text-[10px]">
            {user.badgeNumber} · {roleBadgeText(user.role)}
          </div>
        )}
      </div>
    </div>
  );

  const pageLabel = route.page === 'art' ? t('p_catalog', lang) : t(`p_${route.page}`, lang);

  return (
    <div className="relative flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AmbientCyberBackground />

      {/* Desktop Sidebar */}
      <aside className="noprint relative z-10 hidden lg:flex lg:w-[264px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--line)] lg:bg-[var(--sidebar-bg)] lg:backdrop-blur-md lg:sticky lg:top-0 lg:h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="noprint fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="relative z-10 flex w-[272px] max-w-[85vw] flex-col border-r border-[var(--line)] bg-[var(--panel-solid)] backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute top-3.5 right-3 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
              >
                <X className="h-4 w-4" />
              </button>
              {renderSidebarContent()}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="noprint sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--topbar-bg)] px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--text)] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            {canGoBack && (
              <button
                type="button"
                onClick={onBack}
                title={t('back', lang)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">{t('back', lang)}</span>
              </button>
            )}

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--muted)]">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="hidden shrink-0 font-semibold text-[var(--secondary-text)] hover:text-[var(--accent)] sm:inline"
              >
                KIBERJINOYATLAR
              </button>
              <span className="hidden sm:inline">/</span>
              <span className="truncate font-semibold text-[var(--text)]">{pageLabel}</span>
              {route.a && (
                <>
                  <span>/</span>
                  <span className="font-mono text-[11px] text-[var(--accent)]">{route.a}</span>
                </>
              )}
              {route.id && (
                <>
                  <span>/</span>
                  <span className="font-mono text-[11px] text-[var(--accent)]">{route.id}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs text-[var(--secondary-text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              <Search className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="hidden md:inline">
                {lang === 'ru' ? 'Поиск...' : lang === 'en' ? 'Search...' : 'Qidirish...'}
              </span>
              <kbd className="hidden rounded border border-[var(--line)] bg-[var(--panel2)] px-1 font-mono text-[10px] text-[var(--muted)] sm:inline">
                Ctrl+K
              </kbd>
            </button>

            {/* Shortcuts */}
            <button
              type="button"
              onClick={onOpenShortcuts}
              title={tr(lang, 'Klaviatura yorliqlari (?)', 'Горячие клавиши (?)', 'Keyboard shortcuts (?)')}
              className="hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)] sm:inline-flex"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setSettingsOpen(false);
                  setProfileOpen(false);
                }}
                aria-label={tr(lang, 'Bildirishnomalar', 'Уведомления', 'Notifications')}
                title={tr(lang, 'Bildirishnomalar', 'Уведомления', 'Notifications')}
                className="relative rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <Bell className="h-3.5 w-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 font-mono text-[9px] font-bold text-[var(--accent-ink)]">
                    {unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 z-40 mt-2 w-80 origin-top-right rounded-xl border border-[var(--line)] bg-[var(--panel-solid)] p-3 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-[var(--line)] pb-2 text-xs">
                      <span className="font-bold text-[var(--text)]">
                        {lang === 'ru' ? 'Уведомления' : lang === 'en' ? 'Notifications' : 'Bildirishnomalar'}
                      </span>
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                      >
                        {lang === 'ru' ? 'Прочитано' : lang === 'en' ? 'Mark read' : 'O‘qildi'}
                      </button>
                    </div>
                    <div className="max-h-64 space-y-1.5 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="py-4 text-center text-xs text-[var(--muted)]">
                          {lang === 'ru' ? 'Нет новых уведомлений.' : lang === 'en' ? 'No new notifications.' : 'Yangi bildirishnomalar yo‘q.'}
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.targetPage) onNavigate(n.targetPage, n.routeOpts);
                              setNotifOpen(false);
                            }}
                            className={`block w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                              n.read
                                ? 'border-[var(--line)] bg-[var(--panel2)] opacity-75'
                                : 'border-[var(--accent)]/40 bg-[var(--accent-soft)]'
                            }`}
                          >
                            <div className="font-bold text-[var(--text)]">{localizeRecordText(n.title, lang)}</div>
                            <div className="mt-0.5 text-[11px] text-[var(--secondary-text)]">{localizeRecordText(n.body, lang)}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Workspace Quick Settings (Density, Preset, Theme, Lang, Hints) */}
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen((o) => !o);
                  setNotifOpen(false);
                  setProfileOpen(false);
                }}
                aria-label={tr(lang, 'Ish maydoni sozlamalari', 'Настройки рабочей области', 'Workspace settings')}
                title={tr(lang, 'Ish maydoni sozlamalari', 'Настройки рабочей области', 'Workspace settings')}
                className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 z-40 mt-2 w-72 origin-top-right space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel-solid)] p-3.5 text-xs shadow-2xl backdrop-blur-xl"
                  >
                    <div className="border-b border-[var(--line)] pb-2 font-bold text-[var(--text)]">
                      {lang === 'ru' ? 'Настройка рабочей области' : lang === 'en' ? 'Workspace Settings' : 'Ish maydoni sozlamalari'}
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[var(--muted)]">
                        {lang === 'ru' ? 'Язык интерфейса' : lang === 'en' ? 'Language' : 'Til'}
                      </label>
                      <select
                        value={lang}
                        onChange={(e) => onLangChange(e.target.value as Lang)}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <option value="uz">O‘zbekcha</option>
                        <option value="ru">Русский</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[var(--muted)]">
                        {lang === 'ru' ? 'Тема оформления' : lang === 'en' ? 'Theme' : 'Mavzu'}
                      </label>
                      <select
                        value={theme}
                        onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <option value="dark">{lang === 'ru' ? 'Тёмная (ведомственная)' : lang === 'en' ? 'Dark (Institutional)' : 'Tungi'}</option>
                        <option value="light">{lang === 'ru' ? 'Светлая' : lang === 'en' ? 'Light' : 'Kunduzgi'}</option>
                        <option value="system">{lang === 'ru' ? 'Системная' : lang === 'en' ? 'System' : 'Tizim'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[var(--muted)]">
                        {lang === 'ru' ? 'Плотность таблиц и карточек' : lang === 'en' ? 'Interface Density' : 'Zichlik'}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['standard', 'compact'] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDensity(d)}
                            className={`rounded-lg border py-1.5 font-semibold transition-all ${
                              prefs.density === d
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'border-[var(--line)] text-[var(--secondary-text)]'
                            }`}
                          >
                            {d === 'standard'
                              ? lang === 'ru'
                                ? 'Стандарт'
                                : lang === 'en'
                                  ? 'Standard'
                                  : 'Standart'
                              : lang === 'ru'
                                ? 'Компакт'
                                : lang === 'en'
                                  ? 'Compact'
                                  : 'Ixcham'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[var(--muted)]">
                        {lang === 'ru' ? 'Профиль модулей' : lang === 'en' ? 'Workspace Preset' : 'Modul profili'}
                      </label>
                      <select
                        value={prefs.workspacePreset}
                        onChange={(e) =>
                          applyWorkspacePreset(e.target.value as typeof prefs.workspacePreset)
                        }
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs"
                      >
                        <option value="investigator">{lang === 'ru' ? 'Следователь / Офицер' : lang === 'en' ? 'Investigator' : 'Tergovchi'}</option>
                        <option value="analyst">{lang === 'ru' ? 'OSINT / Кибер-аналитик' : lang === 'en' ? 'Cyber Analyst' : 'Tahlilchi'}</option>
                        <option value="supervisor">{lang === 'ru' ? 'Руководитель / Аудит' : lang === 'en' ? 'Supervisor' : 'Rahbar'}</option>
                      </select>
                    </div>
                    <label className="flex cursor-pointer items-center justify-between pt-1">
                      <span className="text-[var(--secondary-text)]">
                        {lang === 'ru' ? 'Показывать подсказки' : lang === 'en' ? 'Show onboarding hints' : 'Ko‘rsatmalar'}
                      </span>
                      <input
                        type="checkbox"
                        checked={prefs.showHints}
                        onChange={(e) => setShowHints(e.target.checked)}
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile Popover */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                  setSettingsOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold hover:border-[var(--accent)]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent-soft)] font-mono text-[10px] font-bold text-[var(--accent)]">
                  {(user?.name || 'U').slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-[110px] truncate sm:inline">{user?.name}</span>
              </button>
              <AnimatePresence>
                {profileOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-xl border border-[var(--line)] bg-[var(--panel-solid)] p-3.5 text-xs shadow-2xl backdrop-blur-xl"
                  >
                    <div className="font-bold text-[var(--text)]">{user.name}</div>
                    <div className="font-mono text-[11px] text-[var(--muted)]">{user.email}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5 border-y border-[var(--line)] py-2 font-mono text-[10px]">
                      <span className="text-[var(--accent)]">{roleBadgeText(user.role)}</span>
                      <span>·</span>
                      <span>{deptLabel(user.departmentId, lang)}</span>
                      <span>·</span>
                      <span>{user.badgeNumber}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('profile');
                          setProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--hover-bg)]"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span>{t('p_profile', lang)}</span>
                      </button>
                      {permissions?.audit_read && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('admin');
                            setProfileOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--hover-bg)]"
                        >
                          <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <span>{t('p_admin', lang)}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[var(--red)] hover:bg-[var(--red)]/10"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{lang === 'ru' ? 'Выйти из сессии' : lang === 'en' ? 'Sign out' : 'Chiqish'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1340px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 14, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.85 }}
            whileHover={{ y: -2, scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={tr(lang, 'Yuqoriga qaytish', 'Наверх', 'Scroll to top')}
            title={tr(lang, 'Yuqoriga', 'Наверх', 'Top')}
            className="noprint fixed right-5 bottom-20 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-solid)] text-[var(--accent)] shadow-lg backdrop-blur-md hover:border-[var(--accent)] hover:bg-[var(--panel2)]"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="noprint fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--accent)] bg-[var(--panel-solid)] px-4 py-2.5 text-xs font-semibold text-[var(--text)] shadow-xl backdrop-blur-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
