import type { ActivityLogItem, PageId } from '../types';

export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage quota errors
  }
}

export function lsDel(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function lsJSON<T>(key: string, fallback: T): T {
  try {
    const raw = lsGet(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function lsSetJSON(key: string, value: unknown): void {
  lsSet(key, JSON.stringify(value));
}

export function logActivity(module: PageId, action: string): void {
  const list = lsJSON<ActivityLogItem[]>('kj_activity_log', []);
  const item: ActivityLogItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    module,
    action,
  };
  const next = [item, ...list].slice(0, 60);
  lsSetJSON('kj_activity_log', next);
}
