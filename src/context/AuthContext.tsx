import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  AppNotification,
  DensityMode,
  InstitutionalPermissionSet,
  InstitutionalUser,
  PageId,
  WorkspacePreferences,
} from '../types';
import { lsJSON, lsSetJSON } from '../utils/storage';
import { createStaticDemoUser, handleStaticApi } from '../utils/staticFallback';

const DEFAULT_PREFS: WorkspacePreferences = {
  density: 'standard',
  pinnedPages: ['dashboard', 'case', 'evidenceCenter', 'graph', 'catalog'],
  favorites: [],
  recentCases: [],
  savedFilters: [],
  showHints: true,
  workspacePreset: 'investigator',
};

interface AuthContextValue {
  user: InstitutionalUser | null;
  permissions: InstitutionalPermissionSet | null;
  token: string | null;
  bootstrapClaimed: boolean | null;
  requiresBootPasscode: boolean;
  aiConfigured: boolean;
  backendAvailable: boolean;
  authLoading: boolean;
  prefs: WorkspacePreferences;
  notifications: AppNotification[];
  apiFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
  refreshStatus: () => Promise<void>;
  enterStaticDemo: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setupAdmin: (params: {
    name: string;
    email: string;
    password: string;
    badgeNumber: string;
    bootPasscode?: string;
  }) => Promise<void>;
  registerObserver: (params: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setDensity: (d: DensityMode) => void;
  togglePinPage: (page: PageId) => void;
  toggleFavorite: (item: WorkspacePreferences['favorites'][number]) => void;
  recordRecentCase: (c: { id: string; caseNumber: string; title: string }) => void;
  addSavedFilter: (f: { name: string; page: PageId; query: string }) => void;
  removeSavedFilter: (id: string) => void;
  setShowHints: (v: boolean) => void;
  applyWorkspacePreset: (preset: WorkspacePreferences['workspacePreset']) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Security: Bearer token stored strictly in JS memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<InstitutionalUser | null>(null);
  const [permissions, setPermissions] = useState<InstitutionalPermissionSet | null>(null);
  const [bootstrapClaimed, setBootstrapClaimed] = useState<boolean | null>(null);
  const [requiresBootPasscode, setRequiresBootPasscode] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const [prefs, setPrefs] = useState<WorkspacePreferences>(() =>
    lsJSON<WorkspacePreferences>('kj_workspace_prefs', DEFAULT_PREFS)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const updatePrefs = useCallback((updater: (prev: WorkspacePreferences) => WorkspacePreferences) => {
    setPrefs((prev) => {
      const next = updater(prev);
      lsSetJSON('kj_workspace_prefs', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.density = prefs.density;
  }, [prefs.density]);

  const refreshStatus = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/status');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        setBackendAvailable(false);
        setBootstrapClaimed(true);
        setAiConfigured(false);
        return;
      }
      const data = (await res.json()) as {
        bootstrapClaimed: boolean;
        requiresBootPasscode?: boolean;
        aiConfigured: boolean;
      };
      setBackendAvailable(true);
      setBootstrapClaimed(Boolean(data.bootstrapClaimed));
      setRequiresBootPasscode(Boolean(data.requiresBootPasscode));
      setAiConfigured(Boolean(data.aiConfigured));
    } catch {
      setBackendAvailable(false);
      setBootstrapClaimed(true);
      setAiConfigured(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const apiFetch = useCallback(
    async <T = unknown>(url: string, init: RequestInit = {}): Promise<T> => {
      if (!backendAvailable) {
        return handleStaticApi<T>(url, init, user);
      }
      const headers = new Headers(init.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(url, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && token) {
        setToken(null);
        setUser(null);
        setPermissions(null);
      }
      if (!res.ok) {
        throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [token, backendAvailable, user]
  );

  const hydrateNotifications = useCallback(
    async (bearer: string, fallbackUser?: InstitutionalUser | null) => {
      try {
        let data: {
          metrics?: { pendingEvidenceCount?: number; openTasksCount?: number };
          pendingTasks?: { id: string; title: string; caseId: string; caseNumber: string; dueDate: string }[];
        };
        if (bearer === 'static-demo-token') {
          data = handleStaticApi('/api/dashboard/summary?period=30d', {}, fallbackUser || null);
        } else {
          const res = await fetch('/api/dashboard/summary?period=30d', {
            headers: { Authorization: `Bearer ${bearer}` },
          });
          if (!res.ok) return;
          data = (await res.json()) as typeof data;
        }
        const items: AppNotification[] = [];
        if ((data.metrics?.pendingEvidenceCount || 0) > 0) {
          items.push({
            id: 'notif_pending_ev',
            timestamp: new Date().toISOString(),
            severity: 'warning',
            title: 'Неподтверждённые материалы',
            body: `Ожидают проверки целостности (SHA-256): ${data.metrics?.pendingEvidenceCount}`,
            read: false,
            targetPage: 'evidenceCenter',
          });
        }
        for (const tk of (data.pendingTasks || []).slice(0, 3)) {
          items.push({
            id: `notif_${tk.id}`,
            timestamp: new Date().toISOString(),
            severity: 'info',
            title: `Задача ${tk.caseNumber}`,
            body: `${tk.title} (${tk.dueDate})`,
            read: false,
            targetPage: 'case',
            routeOpts: { id: tk.caseId, tab: 'tasks' },
          });
        }
        setNotifications(items);
      } catch {
        // Ignore transient failure
      }
    },
    []
  );

  const enterStaticDemo = useCallback(async () => {
    const demo = createStaticDemoUser('admin');
    setToken('static-demo-token');
    setUser(demo.user);
    setPermissions(demo.permissions);
    await hydrateNotifications('static-demo-token', demo.user);
  }, [hydrateNotifications]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!backendAvailable) {
        const demo = createStaticDemoUser('admin', { email, name: email.split('@')[0] || 'Investigator' });
        setToken('static-demo-token');
        setUser(demo.user);
        setPermissions(demo.permissions);
        await hydrateNotifications('static-demo-token', demo.user);
        return;
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      setToken(data.token);
      setUser(data.user);
      setPermissions(data.permissions);
      await hydrateNotifications(data.token);
    },
    [hydrateNotifications, backendAvailable]
  );

  const setupAdmin = useCallback(
    async (params: {
      name: string;
      email: string;
      password: string;
      badgeNumber: string;
      bootPasscode?: string;
    }) => {
      if (!backendAvailable) {
        const demo = createStaticDemoUser('admin', {
          name: params.name,
          email: params.email,
          badgeNumber: params.badgeNumber,
        });
        setBootstrapClaimed(true);
        setToken('static-demo-token');
        setUser(demo.user);
        setPermissions(demo.permissions);
        await hydrateNotifications('static-demo-token', demo.user);
        return;
      }
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Initial admin setup failed');
      }
      setBootstrapClaimed(true);
      setToken(data.token);
      setUser(data.user);
      setPermissions(data.permissions);
      await hydrateNotifications(data.token);
    },
    [hydrateNotifications, backendAvailable]
  );

  const registerObserver = useCallback(
    async (params: { name: string; email: string; password: string }) => {
      if (!backendAvailable) {
        const demo = createStaticDemoUser('observer', {
          name: params.name,
          email: params.email,
          badgeNumber: 'OBS-01',
        });
        setToken('static-demo-token');
        setUser(demo.user);
        setPermissions(demo.permissions);
        await hydrateNotifications('static-demo-token', demo.user);
        return;
      }
      const res = await fetch('/api/auth/register-observer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      setToken(data.token);
      setUser(data.user);
      setPermissions(data.permissions);
      await hydrateNotifications(data.token);
    },
    [hydrateNotifications, backendAvailable]
  );

  const logout = useCallback(async () => {
    if (token && backendAvailable) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    setToken(null);
    setUser(null);
    setPermissions(null);
    setNotifications([]);
  }, [token, backendAvailable]);

  const setDensity = useCallback(
    (d: DensityMode) => updatePrefs((p) => ({ ...p, density: d })),
    [updatePrefs]
  );

  const togglePinPage = useCallback(
    (page: PageId) =>
      updatePrefs((p) => {
        const exists = p.pinnedPages.includes(page);
        return {
          ...p,
          pinnedPages: exists
            ? p.pinnedPages.filter((x) => x !== page)
            : [...p.pinnedPages, page].slice(0, 8),
        };
      }),
    [updatePrefs]
  );

  const toggleFavorite = useCallback(
    (item: WorkspacePreferences['favorites'][number]) =>
      updatePrefs((p) => {
        const exists = p.favorites.some((f) => f.id === item.id && f.kind === item.kind);
        return {
          ...p,
          favorites: exists
            ? p.favorites.filter((f) => !(f.id === item.id && f.kind === item.kind))
            : [item, ...p.favorites].slice(0, 12),
        };
      }),
    [updatePrefs]
  );

  const recordRecentCase = useCallback(
    (c: { id: string; caseNumber: string; title: string }) =>
      updatePrefs((p) => ({
        ...p,
        recentCases: [
          { ...c, openedAt: new Date().toISOString() },
          ...p.recentCases.filter((x) => x.id !== c.id),
        ].slice(0, 8),
      })),
    [updatePrefs]
  );

  const addSavedFilter = useCallback(
    (f: { name: string; page: PageId; query: string }) =>
      updatePrefs((p) => ({
        ...p,
        savedFilters: [{ id: `flt_${Date.now()}`, ...f }, ...p.savedFilters].slice(0, 12),
      })),
    [updatePrefs]
  );

  const removeSavedFilter = useCallback(
    (id: string) =>
      updatePrefs((p) => ({
        ...p,
        savedFilters: p.savedFilters.filter((x) => x.id !== id),
      })),
    [updatePrefs]
  );

  const setShowHints = useCallback(
    (v: boolean) => updatePrefs((p) => ({ ...p, showHints: v })),
    [updatePrefs]
  );

  const applyWorkspacePreset = useCallback(
    (preset: WorkspacePreferences['workspacePreset']) => {
      const presetPins: Record<WorkspacePreferences['workspacePreset'], PageId[]> = {
        investigator: ['dashboard', 'case', 'evidenceCenter', 'catalog', 'wizard'],
        analyst: ['dashboard', 'graph', 'osint', 'forensics', 'ai'],
        supervisor: ['dashboard', 'case', 'evidenceCenter', 'reports', 'admin'],
      };
      updatePrefs((p) => ({
        ...p,
        workspacePreset: preset,
        pinnedPages: presetPins[preset],
      }));
    },
    [updatePrefs]
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const pushNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      setNotifications((prev) =>
        [
          {
            ...n,
            id: `notif_${Date.now()}`,
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ].slice(0, 20)
      );
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        token,
        bootstrapClaimed,
        requiresBootPasscode,
        aiConfigured,
        backendAvailable,
        authLoading,
        prefs,
        notifications,
        apiFetch,
        refreshStatus,
        enterStaticDemo,
        login,
        setupAdmin,
        registerObserver,
        logout,
        setDensity,
        togglePinPage,
        toggleFavorite,
        recordRecentCase,
        addSavedFilter,
        removeSavedFilter,
        setShowHints,
        applyWorkspacePreset,
        markNotificationRead,
        markAllNotificationsRead,
        pushNotification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
