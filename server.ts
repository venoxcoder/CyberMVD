import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response as ExpressResponse } from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type, type LiveServerMessage } from '@google/genai';
import {
  DEFAULT_ROLE_MATRIX,
  type StoredReportRecord,
  type StoredUserRecord,
  appendAuditLog,
  canAccessCase,
  canAccessEvidence,
  getUserPermissions,
  hashPassword,
  isValidStatusTransition,
  issueSessionToken,
  loadStore,
  revokeSessionToken,
  sanitizeUser,
  saveStore,
  verifyPassword,
  verifySessionToken,
} from './server/rbacStore';
import type {
  AccessLevel,
  CaseEntity,
  CaseKind,
  CaseMaterial,
  CaseRecord,
  CaseStatus,
  CaseTaskItem,
  CaseTimelineEntry,
  DepartmentId,
  EvidenceRecord,
  GraphEdge,
  GraphNode,
  GraphNodeType,
  IncidentCategory,
  InstitutionalPermissionSet,
  InstitutionalRole,
  LinkConfidence,
  VerificationStatus,
} from './src/types';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

interface AuthenticatedRequest extends Request {
  authUser?: StoredUserRecord;
  authPerms?: InstitutionalPermissionSet;
  authToken?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const norm = ip.toLowerCase();
  if (norm === '::1' || norm === '::') return true;
  if (norm.startsWith('fe80:') || norm.startsWith('fc') || norm.startsWith('fd')) return true;
  if (norm.startsWith('::ffff:')) {
    const v4 = norm.slice(7);
    if (net.isIPv4(v4)) return isPrivateOrReservedIPv4(v4);
  }
  return false;
}

function validateDomain(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (!clean || clean.length > 253) return null;
  if (clean === 'localhost' || clean.endsWith('.local') || clean.endsWith('.internal')) return null;
  const domainRegex = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  return domainRegex.test(clean) ? clean : null;
}

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Kiberjinoyatlar-OSINT-Lab/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const tok = auth.slice(7).trim();
  return tok || null;
}

function safeStr(val: unknown, maxLen = 400): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

const VALID_DEPARTMENTS: DepartmentId[] = ['dept_cyber', 'dept_forensics', 'dept_osint', 'dept_oversight'];
const VALID_ROLES: InstitutionalRole[] = ['admin', 'department_head', 'officer', 'analyst', 'observer'];
const VALID_CATEGORIES: IncidentCategory[] = [
  'apk_fraud',
  'phishing',
  'crypto_fraud',
  'data_breach',
  'simbox',
  'ransomware',
  'social_engineering',
];
const VALID_ACCESS_LEVELS: AccessLevel[] = ['training', 'department', 'restricted', 'confidential'];
const VALID_SHA256 = /^[a-f0-9]{64}$/i;
const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;

function requireAuth(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication token is required.' });
    return;
  }
  const user = verifySessionToken(token);
  if (!user) {
    res.status(401).json({ error: 'INVALID_SESSION', message: 'Session expired or invalid.' });
    return;
  }
  const store = loadStore();
  req.authUser = user;
  req.authPerms = getUserPermissions(store, user);
  req.authToken = token;
  next();
}

function requirePermission(perm: keyof InstitutionalPermissionSet) {
  return (req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): void => {
    if (!req.authUser || !req.authPerms) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required.' });
      return;
    }
    if (!req.authPerms[perm]) {
      const store = loadStore();
      appendAuditLog(store, {
        actorId: req.authUser.id,
        actorName: req.authUser.name,
        actorRole: req.authUser.role,
        departmentId: req.authUser.departmentId,
        action: `denied_${perm}`,
        resourceType: 'admin',
        resourceId: req.path,
        outcome: 'denied',
        details: `Access denied for permission ${perm} on ${req.method} ${req.path}`,
      });
      saveStore(store);
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Insufficient permissions: requires ${perm}.`,
      });
      return;
    }
    next();
  };
}

interface ChatAttachmentInput {
  name: string;
  mimeType: string;
  base64Data?: string;
  extractedText?: string;
}

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    const ai = getGeminiClient();
    const store = loadStore();
    res.json({
      ok: true,
      aiConfigured: Boolean(ai),
      bootstrapClaimed: store.bootstrapClaimed,
      model: 'gemini-4-hydrogen',
    });
  });

  /* ======================== AUTHENTICATION ======================== */

  app.get('/api/auth/status', (_req, res) => {
    const store = loadStore();
    res.json({
      bootstrapClaimed: store.bootstrapClaimed,
      requiresBootPasscode: Boolean(process.env.ADMIN_BOOT_PASSCODE?.trim()),
      aiConfigured: Boolean(getGeminiClient()),
    });
  });

  app.post('/api/auth/setup', (req, res) => {
    const store = loadStore();
    if (store.bootstrapClaimed) {
      res.status(409).json({
        error: 'BOOTSTRAP_ALREADY_CLAIMED',
        message: 'Initial administrator account has already been configured.',
      });
      return;
    }

    const { name, email, password, badgeNumber, bootPasscode } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      badgeNumber?: string;
      bootPasscode?: string;
    };

    const requiredBoot = process.env.ADMIN_BOOT_PASSCODE?.trim();
    if (requiredBoot) {
      const provided = String(bootPasscode ?? '');
      const a = Buffer.from(provided);
      const b = Buffer.from(requiredBoot);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(403).json({
          error: 'INVALID_BOOT_PASSCODE',
          message: 'Invalid bootstrap administrator passcode.',
        });
        return;
      }
    }

    const cleanName = safeStr(name, 80);
    const cleanEmail = safeStr(email, 120).toLowerCase();
    const cleanBadge = safeStr(badgeNumber || 'ADM-001', 32);
    const cleanPass = String(password ?? '');

    if (!cleanName || !cleanEmail.includes('@') || cleanPass.length < 8) {
      res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Valid name, email, and password (minimum 8 characters) are required.',
      });
      return;
    }

    const now = new Date().toISOString();
    const adminUser: StoredUserRecord = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      name: cleanName,
      email: cleanEmail,
      role: 'admin',
      departmentId: 'dept_oversight',
      badgeNumber: cleanBadge,
      status: 'active',
      createdAt: now,
      lastActive: now,
      passwordHash: hashPassword(cleanPass),
    };

    store.users.push(adminUser);
    store.bootstrapClaimed = true;
    appendAuditLog(store, {
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: 'admin',
      departmentId: adminUser.departmentId,
      action: 'admin_bootstrap_claimed',
      resourceType: 'auth',
      resourceId: adminUser.id,
      outcome: 'success',
      details: `Initial administrator account claimed (${adminUser.email}).`,
    });
    saveStore(store);

    const token = issueSessionToken(adminUser.id);
    res.status(201).json({
      token,
      user: sanitizeUser(adminUser),
      permissions: getUserPermissions(store, adminUser),
    });
  });

  app.post('/api/auth/register-observer', (req, res) => {
    const store = loadStore();
    if (!store.bootstrapClaimed) {
      res.status(400).json({
        error: 'SETUP_REQUIRED',
        message: 'Claim initial administrator account before observer registration.',
      });
      return;
    }

    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    const cleanName = safeStr(name, 80);
    const cleanEmail = safeStr(email, 120).toLowerCase();
    const cleanPass = String(password ?? '');

    if (!cleanName || !cleanEmail.includes('@') || cleanPass.length < 8) {
      res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Name, valid email, and password (min 8 chars) are required.',
      });
      return;
    }

    if (store.users.some((u) => u.email === cleanEmail)) {
      res.status(409).json({
        error: 'EMAIL_EXISTS',
        message: 'An account with this email already exists.',
      });
      return;
    }

    const now = new Date().toISOString();
    // Strict least privilege: self-registration ALWAYS assigns observer role & oversight dept
    const user: StoredUserRecord = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      name: cleanName,
      email: cleanEmail,
      role: 'observer',
      departmentId: 'dept_oversight',
      badgeNumber: `OBS-${String(store.users.length + 101)}`,
      status: 'active',
      createdAt: now,
      lastActive: now,
      passwordHash: hashPassword(cleanPass),
    };

    store.users.push(user);
    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: 'observer',
      departmentId: user.departmentId,
      action: 'observer_registered',
      resourceType: 'auth',
      resourceId: user.id,
      outcome: 'success',
      details: `Least-privilege observer registered (${user.email}).`,
    });
    saveStore(store);

    const token = issueSessionToken(user.id);
    res.status(201).json({
      token,
      user: sanitizeUser(user),
      permissions: getUserPermissions(store, user),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const store = loadStore();
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = safeStr(email, 120).toLowerCase();
    const cleanPass = String(password ?? '');

    const user = store.users.find((u) => u.email === cleanEmail);
    if (!user || !verifyPassword(cleanPass, user.passwordHash)) {
      appendAuditLog(store, {
        actorId: user?.id || 'anonymous',
        actorName: cleanEmail || 'unknown',
        actorRole: user?.role || 'anonymous',
        departmentId: user?.departmentId || 'none',
        action: 'login_failed',
        resourceType: 'auth',
        resourceId: cleanEmail || 'unknown',
        outcome: 'denied',
        details: 'Invalid credentials.',
      });
      saveStore(store);
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'active') {
      appendAuditLog(store, {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        departmentId: user.departmentId,
        action: 'login_suspended',
        resourceType: 'auth',
        resourceId: user.id,
        outcome: 'denied',
        details: 'Suspended account login attempt blocked.',
      });
      saveStore(store);
      res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'This account is suspended.' });
      return;
    }

    user.lastActive = new Date().toISOString();
    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'login_success',
      resourceType: 'auth',
      resourceId: user.id,
      outcome: 'success',
      details: `Authenticated session started (${user.role}).`,
    });
    saveStore(store);

    const token = issueSessionToken(user.id);
    res.json({
      token,
      user: sanitizeUser(user),
      permissions: getUserPermissions(store, user),
    });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.authToken) revokeSessionToken(req.authToken);
    if (req.authUser) {
      const store = loadStore();
      appendAuditLog(store, {
        actorId: req.authUser.id,
        actorName: req.authUser.name,
        actorRole: req.authUser.role,
        departmentId: req.authUser.departmentId,
        action: 'logout',
        resourceType: 'auth',
        resourceId: req.authUser.id,
        outcome: 'success',
        details: 'Session ended by user.',
      });
      saveStore(store);
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({
      user: sanitizeUser(req.authUser!),
      permissions: req.authPerms!,
    });
  });

  /* ======================== DASHBOARD SUMMARY ======================== */

  app.get('/api/dashboard/summary', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const period = safeStr(req.query.period || '30d', 16);
    const filterCat = safeStr(req.query.category || 'all', 40);
    const filterStatus = safeStr(req.query.status || 'all', 30);

    const nowMs = Date.now();
    const periodMs =
      period === '7d'
        ? 7 * 86400_000
        : period === '30d'
          ? 30 * 86400_000
          : period === '90d'
            ? 90 * 86400_000
            : Number.POSITIVE_INFINITY;

    const accessibleCases = store.cases.filter((c) => canAccessCase(store, user, c, 'read'));
    const filteredCases = accessibleCases.filter((c) => {
      if (filterCat !== 'all' && c.category !== filterCat) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (Number.isFinite(periodMs)) {
        const created = new Date(c.createdAt).getTime();
        if (nowMs - created > periodMs) return false;
      }
      return true;
    });

    const accessibleEvidence = store.evidence.filter((ev) => canAccessEvidence(store, user, ev, 'read'));

    const trainingCasesCount = filteredCases.filter((c) => c.kind === 'training').length;
    const workingCasesCount = filteredCases.filter((c) => c.kind === 'working').length;
    const pendingReviewCasesCount = filteredCases.filter((c) => c.status === 'pending_review').length;
    const pendingEvidenceCount = accessibleEvidence.filter((e) => e.verificationStatus === 'pending').length;

    const categoryMap = new Map<string, number>();
    for (const c of filteredCases) {
      categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);
    }

    const statusMap = new Map<string, number>();
    for (const c of filteredCases) {
      statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1);
    }

    // Dynamics buckets (by day for 7d/30d, by month for 90d/all)
    const buckets = new Map<string, { working: number; training: number }>();
    if (period === '7d' || period === '30d') {
      const days = period === '7d' ? 7 : 14;
      for (let i = days - 1; i >= 0; i--) {
        const key = new Date(nowMs - i * 86400_000).toISOString().slice(0, 10);
        buckets.set(key, { working: 0, training: 0 });
      }
      for (const c of filteredCases) {
        const key = c.createdAt.slice(0, 10);
        const cur = buckets.get(key);
        if (cur) {
          if (c.kind === 'working') cur.working += 1;
          else cur.training += 1;
        }
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        buckets.set(key, { working: 0, training: 0 });
      }
      for (const c of filteredCases) {
        const key = c.createdAt.slice(0, 7);
        const cur = buckets.get(key);
        if (cur) {
          if (c.kind === 'working') cur.working += 1;
          else cur.training += 1;
        }
      }
    }

    const pendingTasks = filteredCases
      .flatMap((c) =>
        c.tasks
          .filter((tk) => tk.status !== 'done')
          .map((tk) => ({
            ...tk,
            caseId: c.id,
            caseNumber: c.caseNumber,
          }))
      )
      .slice(0, 8);

    const recentCases = [...filteredCases]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        kind: c.kind,
        category: c.category,
        status: c.status,
        accessLevel: c.accessLevel,
        updatedAt: c.updatedAt,
        assignedOfficer: c.assignedOfficer,
      }));

    const latestEvidence = [...accessibleEvidence]
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, 6);

    const evidenceStatusCounts = {
      verified: accessibleEvidence.filter((e) => e.verificationStatus === 'verified').length,
      pending: accessibleEvidence.filter((e) => e.verificationStatus === 'pending').length,
      mismatch: accessibleEvidence.filter((e) => e.verificationStatus === 'mismatch').length,
      archived: accessibleEvidence.filter((e) => e.verificationStatus === 'archived').length,
    };

    const recentAudit = store.auditLog
      .filter((a) => {
        if (user.role === 'admin') return true;
        if (user.role === 'department_head') {
          return a.departmentId === user.departmentId || a.actorId === user.id;
        }
        return a.actorId === user.id;
      })
      .slice(0, 8);

    const userActivity =
      user.role === 'admin'
        ? store.users.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            departmentId: u.departmentId,
            lastActive: u.lastActive,
            status: u.status,
          }))
        : user.role === 'department_head'
          ? store.users
              .filter((u) => u.departmentId === user.departmentId)
              .map((u) => ({
                id: u.id,
                name: u.name,
                role: u.role,
                departmentId: u.departmentId,
                lastActive: u.lastActive,
                status: u.status,
              }))
          : [];

    res.json({
      systemStatus: {
        operational: true,
        aiConfigured: Boolean(getGeminiClient()),
        authEnforced: true,
        role: user.role,
        departmentId: user.departmentId,
      },
      metrics: {
        accessibleTotal: filteredCases.length,
        trainingCasesCount,
        workingCasesCount,
        pendingMaterialsCount: pendingReviewCasesCount + pendingEvidenceCount,
        pendingEvidenceCount,
        evidenceTotal: accessibleEvidence.length,
        openTasksCount: pendingTasks.length,
      },
      dynamics: Array.from(buckets.entries()).map(([label, counts]) => ({
        label,
        working: counts.working,
        training: counts.training,
      })),
      categoryDistribution: Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      })),
      statusDistribution: Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      evidenceStatusCounts,
      recentCases,
      pendingTasks,
      latestEvidence,
      recentAudit,
      userActivity,
    });
  });

  /* ======================== CASES & DOSSIER ======================== */

  app.get('/api/cases', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const kindFilter = safeStr(req.query.kind || 'all', 20);
    const statusFilter = safeStr(req.query.status || 'all', 30);
    const q = safeStr(req.query.q || '', 120).toLowerCase();

    const list = store.cases
      .filter((c) => canAccessCase(store, user, c, 'read'))
      .filter((c) => {
        if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (
          q &&
          !`${c.caseNumber} ${c.title} ${c.summary} ${c.assignedOfficer}`.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });

    res.json({ cases: list });
  });

  app.post('/api/cases', requireAuth, requirePermission('cases_create'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const body = req.body as Partial<CaseRecord>;

    const title = safeStr(body.title, 200);
    const caseNumber = safeStr(body.caseNumber, 40) || `CASE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`;
    const kind: CaseKind = body.kind === 'working' ? 'working' : 'training';
    const category: IncidentCategory = VALID_CATEGORIES.includes(body.category as IncidentCategory)
      ? (body.category as IncidentCategory)
      : 'apk_fraud';
    const requestedDept = VALID_DEPARTMENTS.includes(body.departmentId as DepartmentId)
      ? (body.departmentId as DepartmentId)
      : user.departmentId;
    const departmentId = user.role === 'admin' ? requestedDept : user.departmentId;
    const requestedAccess = VALID_ACCESS_LEVELS.includes(body.accessLevel as AccessLevel)
      ? (body.accessLevel as AccessLevel)
      : kind === 'training'
        ? 'training'
        : 'department';
    const accessLevel: AccessLevel =
      user.role === 'officer' && requestedAccess === 'confidential' ? 'department' : requestedAccess;

    if (!title) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Case title is required.' });
      return;
    }

    if (store.cases.some((c) => c.caseNumber.toLowerCase() === caseNumber.toLowerCase())) {
      res.status(409).json({ error: 'DUPLICATE_CASE_NUMBER', message: 'Case number already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const newCase: CaseRecord = {
      id: `case_${crypto.randomBytes(5).toString('hex')}`,
      caseNumber,
      title,
      kind,
      category,
      createdAt: now,
      updatedAt: now,
      status: 'open',
      departmentId,
      assignedOfficer: safeStr(body.assignedOfficer || user.name, 100),
      assignedUserIds: [user.id],
      accessLevel,
      relatedArticleId: safeStr(body.relatedArticleId || '', 32) || undefined,
      relatedMethodId: safeStr(body.relatedMethodId || '', 32) || undefined,
      summary: safeStr(body.summary, 2000),
      qualificationNotes: safeStr(body.qualificationNotes, 1000),
      timeline: [
        {
          id: `tl_${crypto.randomBytes(4).toString('hex')}`,
          timestamp: now,
          description: `Создана карточка дела ${caseNumber}.`,
          source: `${user.name} (${user.badgeNumber})`,
          severity: 'info',
          authorName: user.name,
        },
      ],
      entities: [],
      materials: [],
      tasks: [],
      linkedReportIds: [],
      history: [
        {
          id: `hist_${crypto.randomBytes(4).toString('hex')}`,
          timestamp: now,
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action: 'created_case',
          details: `Создано ${kind === 'training' ? 'учебное' : 'рабочее'} дело ${caseNumber} (уровень доступа: ${accessLevel}).`,
        },
      ],
    };

    store.cases.unshift(newCase);
    store.graphNodes.push({
      id: `gn_${newCase.id}`,
      type: 'case',
      label: newCase.caseNumber,
      subtitle: newCase.title.slice(0, 64),
      caseId: newCase.id,
      departmentId: newCase.departmentId,
      accessLevel: newCase.accessLevel,
      x: 240 + Math.floor(Math.random() * 280),
      y: 160 + Math.floor(Math.random() * 200),
      attributes: { Статус: newCase.status, Уровень: newCase.accessLevel },
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'created_case',
      resourceType: 'case',
      resourceId: newCase.caseNumber,
      outcome: 'success',
      details: `Created case ${newCase.caseNumber} (${newCase.accessLevel}).`,
    });
    saveStore(store);

    res.status(201).json({ caseRecord: newCase });
  });

  app.get('/api/cases/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id || c.caseNumber === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'read')) {
      appendAuditLog(store, {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        departmentId: user.departmentId,
        action: 'denied_case_read',
        resourceType: 'case',
        resourceId: found.caseNumber,
        outcome: 'denied',
        details: `Blocked cross-scope read on case ${found.caseNumber}.`,
      });
      saveStore(store);
      res.status(403).json({ error: 'FORBIDDEN', message: 'Access to this case dossier is restricted.' });
      return;
    }

    const linkedEvidence = store.evidence.filter(
      (ev) => ev.caseId === found.id && canAccessEvidence(store, user, ev, 'read')
    );
    const linkedReports = store.reports.filter((r) => r.caseId === found.id);
    res.json({ caseRecord: found, linkedEvidence, linkedReports });
  });

  app.patch('/api/cases/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'update')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to modify this case.' });
      return;
    }

    const body = req.body as Partial<CaseRecord>;
    const now = new Date().toISOString();
    const changes: string[] = [];

    if (typeof body.title === 'string' && body.title.trim()) {
      found.title = safeStr(body.title, 200);
      changes.push('title');
    }
    if (typeof body.summary === 'string') {
      found.summary = safeStr(body.summary, 3000);
      changes.push('summary');
    }
    if (typeof body.qualificationNotes === 'string') {
      found.qualificationNotes = safeStr(body.qualificationNotes, 1500);
      changes.push('qualificationNotes');
    }
    if (typeof body.assignedOfficer === 'string' && body.assignedOfficer.trim()) {
      found.assignedOfficer = safeStr(body.assignedOfficer, 100);
      changes.push('assignedOfficer');
    }
    if (body.category && VALID_CATEGORIES.includes(body.category)) {
      found.category = body.category;
      changes.push('category');
    }
    if (
      body.accessLevel &&
      VALID_ACCESS_LEVELS.includes(body.accessLevel) &&
      (user.role === 'admin' || user.role === 'department_head')
    ) {
      found.accessLevel = body.accessLevel;
      changes.push(`accessLevel->${body.accessLevel}`);
    }

    found.updatedAt = now;
    found.history.unshift({
      id: `hist_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'updated_case',
      field: changes.join(', '),
      details: `Обновлены поля: ${changes.join(', ') || 'метаданные'}.`,
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'updated_case',
      resourceType: 'case',
      resourceId: found.caseNumber,
      outcome: 'success',
      details: `Updated fields [${changes.join(', ')}] on ${found.caseNumber}.`,
    });
    saveStore(store);
    res.json({ caseRecord: found });
  });

  app.post('/api/cases/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'change_status')) {
      appendAuditLog(store, {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        departmentId: user.departmentId,
        action: 'denied_status_change',
        resourceType: 'case',
        resourceId: found.caseNumber,
        outcome: 'denied',
        details: `Role ${user.role} cannot change case status on ${found.caseNumber}.`,
      });
      saveStore(store);
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to change case status.' });
      return;
    }

    const { status, reason } = req.body as { status?: CaseStatus; reason?: string };
    if (!status || !isValidStatusTransition(found.status, status)) {
      res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid case status transition.' });
      return;
    }

    const prev = found.status;
    const now = new Date().toISOString();
    found.status = status;
    found.updatedAt = now;
    found.history.unshift({
      id: `hist_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'changed_status',
      field: 'status',
      details: `Статус изменён: ${prev} → ${status}${reason ? ` (${safeStr(reason, 200)})` : ''}.`,
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'changed_case_status',
      resourceType: 'case',
      resourceId: found.caseNumber,
      outcome: 'success',
      details: `Changed status ${prev} -> ${status} on ${found.caseNumber}.`,
    });
    saveStore(store);
    res.json({ caseRecord: found });
  });

  app.post('/api/cases/:id/timeline', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'update')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to modify timeline.' });
      return;
    }

    const { timestamp, description, source, severity } = req.body as Partial<CaseTimelineEntry>;
    const desc = safeStr(description, 600);
    const src = safeStr(source, 200);
    if (!desc || !src) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Description and source are required.' });
      return;
    }

    const now = new Date().toISOString();
    const item: CaseTimelineEntry = {
      id: `tl_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: timestamp ? safeStr(timestamp, 40) : now,
      description: desc,
      source: src,
      severity: severity === 'critical' || severity === 'warning' ? severity : 'info',
      authorName: user.name,
    };

    found.timeline.push(item);
    found.timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    found.updatedAt = now;
    found.history.unshift({
      id: `hist_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'added_timeline_event',
      details: `Добавлено событие таймлайна: "${desc.slice(0, 80)}" (${src}).`,
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'added_timeline_event',
      resourceType: 'case',
      resourceId: found.caseNumber,
      outcome: 'success',
      details: `Added timeline event to ${found.caseNumber}.`,
    });
    saveStore(store);
    res.status(201).json({ caseRecord: found, item });
  });

  app.post('/api/cases/:id/entities', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'update')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to add entities.' });
      return;
    }

    const { type, label, roleOrContext, confidence, source } = req.body as Partial<CaseEntity>;
    const cleanLabel = safeStr(label, 160);
    const cleanSource = safeStr(source, 160);
    if (!cleanLabel || !cleanSource) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Entity label and source are required.' });
      return;
    }

    const validEntityTypes: CaseEntity['type'][] = [
      'domain',
      'ip',
      'participant',
      'organization',
      'account',
      'wallet',
    ];
    const entType = validEntityTypes.includes(type as CaseEntity['type'])
      ? (type as CaseEntity['type'])
      : 'participant';
    const conf: LinkConfidence =
      confidence === 'confirmed' || confidence === 'indirect' ? confidence : 'hypothesis';

    const now = new Date().toISOString();
    const ent: CaseEntity = {
      id: `ent_${crypto.randomBytes(4).toString('hex')}`,
      type: entType,
      label: cleanLabel,
      roleOrContext: safeStr(roleOrContext, 240),
      confidence: conf,
      source: cleanSource,
      addedAt: now,
    };
    found.entities.push(ent);
    found.updatedAt = now;
    found.history.unshift({
      id: `hist_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'added_entity',
      details: `Добавлен объект (${entType}): ${cleanLabel} [источник: ${cleanSource}].`,
    });

    // Reflect into intelligence graph if node type maps cleanly
    const nodeTypeMap: Record<CaseEntity['type'], GraphNodeType> = {
      domain: 'domain',
      ip: 'ip',
      participant: 'participant',
      organization: 'organization',
      account: 'participant',
      wallet: 'file',
    };
    const newNodeId = `gn_${ent.id}`;
    store.graphNodes.push({
      id: newNodeId,
      type: nodeTypeMap[entType],
      label: cleanLabel,
      subtitle: ent.roleOrContext,
      caseId: found.id,
      departmentId: found.departmentId,
      accessLevel: found.accessLevel,
      x: 180 + Math.floor(Math.random() * 440),
      y: 120 + Math.floor(Math.random() * 280),
      attributes: { Источник: cleanSource, Достоверность: conf },
    });
    const caseNode = store.graphNodes.find((n) => n.caseId === found.id && n.type === 'case');
    if (caseNode) {
      store.graphEdges.push({
        id: `ge_${crypto.randomBytes(4).toString('hex')}`,
        sourceId: caseNode.id,
        targetId: newNodeId,
        relation: ent.roleOrContext || 'связанный объект',
        source: cleanSource,
        establishedAt: now,
        confidence: conf,
        caseId: found.id,
      });
    }

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'added_entity',
      resourceType: 'case',
      resourceId: found.caseNumber,
      outcome: 'success',
      details: `Added entity ${cleanLabel} to ${found.caseNumber}.`,
    });
    saveStore(store);
    res.status(201).json({ caseRecord: found, entity: ent });
  });

  app.post('/api/cases/:id/materials', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'update')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to add materials.' });
      return;
    }

    const { title, fileName, mimeType, fileSize, sha256, source, receivedAt, notes } =
      req.body as Partial<CaseMaterial>;
    const cleanTitle = safeStr(title, 180);
    const cleanFile = path.basename(safeStr(fileName, 140) || 'material.bin');
    const cleanHash = safeStr(sha256, 64).toLowerCase();
    const cleanSource = safeStr(source, 200);
    const size = Number(fileSize) || 0;

    if (!cleanTitle || !cleanSource || !VALID_SHA256.test(cleanHash)) {
      res.status(400).json({
        error: 'INVALID_MATERIAL',
        message: 'Title, source, and a valid 64-character SHA-256 digest are required.',
      });
      return;
    }
    if (size < 0 || size > MAX_EVIDENCE_BYTES) {
      res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'File size exceeds 25 MB limit.' });
      return;
    }

    const now = new Date().toISOString();
    const mat: CaseMaterial = {
      id: `mat_${crypto.randomBytes(4).toString('hex')}`,
      title: cleanTitle,
      fileName: cleanFile,
      mimeType: safeStr(mimeType || 'application/octet-stream', 100),
      fileSize: size,
      sha256: cleanHash,
      source: cleanSource,
      receivedAt: receivedAt ? safeStr(receivedAt, 40) : now,
      verificationStatus: 'pending',
      uploadedBy: user.name,
      notes: safeStr(notes, 500),
    };

    found.materials.unshift(mat);
    found.updatedAt = now;
    found.history.unshift({
      id: `hist_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'added_material',
      details: `Приобщён материал "${cleanTitle}" (${cleanFile}, SHA-256: ${cleanHash.slice(0, 16)}…).`,
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'added_material',
      resourceType: 'document',
      resourceId: found.caseNumber,
      outcome: 'success',
      details: `Added material ${cleanFile} to ${found.caseNumber}.`,
    });
    saveStore(store);
    res.status(201).json({ caseRecord: found, material: mat });
  });

  app.post('/api/cases/:id/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'update')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to manage case tasks.' });
      return;
    }

    const { title, assignee, dueDate, priority } = req.body as Partial<CaseTaskItem>;
    const cleanTitle = safeStr(title, 200);
    if (!cleanTitle) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Task title is required.' });
      return;
    }

    const now = new Date().toISOString();
    const task: CaseTaskItem = {
      id: `tsk_${crypto.randomBytes(4).toString('hex')}`,
      title: cleanTitle,
      assignee: safeStr(assignee || user.name, 100),
      dueDate: safeStr(dueDate || now.slice(0, 10), 20),
      priority: priority === 'high' || priority === 'low' ? priority : 'medium',
      status: 'todo',
      createdAt: now,
    };

    found.tasks.unshift(task);
    found.updatedAt = now;
    found.history.unshift({
      id: `hist_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'created_task',
      details: `Поставлена задача: "${cleanTitle}" (${task.assignee}).`,
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'created_case_task',
      resourceType: 'case',
      resourceId: found.caseNumber,
      outcome: 'success',
      details: `Created task "${cleanTitle}" on ${found.caseNumber}.`,
    });
    saveStore(store);
    res.status(201).json({ caseRecord: found, task });
  });

  app.patch('/api/cases/:id/tasks/:taskId', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const found = store.cases.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found.' });
      return;
    }
    if (!canAccessCase(store, user, found, 'update')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to update task.' });
      return;
    }
    const task = found.tasks.find((t) => t.id === req.params.taskId);
    if (!task) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Task not found.' });
      return;
    }
    const { status } = req.body as { status?: CaseTaskItem['status'] };
    if (status === 'todo' || status === 'in_progress' || status === 'done') {
      task.status = status;
      const now = new Date().toISOString();
      found.updatedAt = now;
      found.history.unshift({
        id: `hist_${crypto.randomBytes(4).toString('hex')}`,
        timestamp: now,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'updated_task',
        details: `Статус задачи "${task.title}": ${status}.`,
      });
      saveStore(store);
    }
    res.json({ caseRecord: found, task });
  });

  /* ======================== EVIDENCE CENTER ======================== */

  app.get('/api/evidence', requireAuth, requirePermission('evidence_read'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const statusFilter = safeStr(req.query.status || 'all', 24);
    const caseFilter = safeStr(req.query.caseId || 'all', 40);
    const q = safeStr(req.query.q || '', 120).toLowerCase();

    const list = store.evidence
      .filter((ev) => canAccessEvidence(store, user, ev, 'read'))
      .filter((ev) => {
        if (statusFilter !== 'all' && ev.verificationStatus !== statusFilter) return false;
        if (caseFilter !== 'all' && ev.caseId !== caseFilter) return false;
        if (
          q &&
          !`${ev.id} ${ev.name} ${ev.caseNumber} ${ev.sha256} ${ev.source} ${ev.custodian}`
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }
        return true;
      });

    res.json({ evidence: list });
  });

  app.post('/api/evidence', requireAuth, requirePermission('evidence_create'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const body = req.body as Partial<EvidenceRecord>;

    const targetCase = store.cases.find((c) => c.id === body.caseId || c.caseNumber === body.caseNumber);
    if (!targetCase) {
      res.status(400).json({ error: 'CASE_REQUIRED', message: 'Valid accessible case is required.' });
      return;
    }
    if (!canAccessCase(store, user, targetCase, 'read')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot register evidence for an inaccessible case.' });
      return;
    }

    const cleanName = path.basename(safeStr(body.name, 160));
    const cleanSha = safeStr(body.sha256, 64).toLowerCase();
    const cleanSource = safeStr(body.source, 200);
    const fileSize = Number(body.fileSize) || 0;

    if (!cleanName || !cleanSource || !VALID_SHA256.test(cleanSha)) {
      res.status(400).json({
        error: 'INVALID_EVIDENCE',
        message: 'File name, source, and valid 64-character SHA-256 digest are required.',
      });
      return;
    }
    if (fileSize < 0 || fileSize > MAX_EVIDENCE_BYTES) {
      res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'Evidence file exceeds 25 MB limit.' });
      return;
    }

    const now = new Date().toISOString();
    const id = `EV-${new Date().getFullYear()}-${String(store.evidence.length + 1).padStart(3, '0')}`;
    const record: EvidenceRecord = {
      id,
      caseId: targetCase.id,
      caseNumber: targetCase.caseNumber,
      departmentId: targetCase.departmentId,
      accessLevel: targetCase.accessLevel,
      name: cleanName,
      fileType: safeStr(body.fileType || 'application/octet-stream', 100),
      fileSize,
      sha256: cleanSha,
      receivedAt: safeStr(body.receivedAt || now, 40),
      source: cleanSource,
      custodian: safeStr(body.custodian || user.name, 100),
      sealNumber: safeStr(body.sealNumber || `SEAL-${id}`, 48),
      storageLocation: safeStr(body.storageLocation || 'Изолированный репозиторий', 120),
      verificationStatus: 'verified',
      metadata: {
        mimeType: safeStr(body.metadata?.mimeType || body.fileType || 'application/octet-stream', 100),
        lastModified: safeStr(body.metadata?.lastModified || '', 40),
        magicHeader: safeStr(body.metadata?.magicHeader || 'N/A', 80),
        extractedSummary: safeStr(body.metadata?.extractedSummary || '', 300),
      },
      workingCopyNotes: safeStr(body.workingCopyNotes, 600),
      workingCopyUpdatedAt: body.workingCopyNotes ? now : undefined,
      custodyHistory: [
        {
          id: `COC-${crypto.randomBytes(3).toString('hex')}`,
          evidenceId: id,
          timestamp: now,
          fromPerson: cleanSource,
          toPerson: safeStr(body.custodian || user.name, 100),
          purpose: 'Первичная фиксация оригинала и расчёт SHA-256',
          hashVerified: true,
        },
      ],
      accessLog: [
        {
          id: `eal_${crypto.randomBytes(4).toString('hex')}`,
          timestamp: now,
          actorName: user.name,
          actorRole: user.role,
          action: 'registered',
          details: `Зарегистрирован цифровой объект ${cleanName} (SHA-256: ${cleanSha.slice(0, 16)}…).`,
        },
      ],
    };

    store.evidence.unshift(record);
    const evNodeId = `gn_${record.id}`;
    store.graphNodes.push({
      id: evNodeId,
      type: 'evidence',
      label: record.id,
      subtitle: record.name,
      caseId: targetCase.id,
      departmentId: targetCase.departmentId,
      accessLevel: targetCase.accessLevel,
      x: 260 + Math.floor(Math.random() * 260),
      y: 140 + Math.floor(Math.random() * 200),
      attributes: { SHA256: `${record.sha256.slice(0, 12)}…`, Пломба: record.sealNumber },
    });
    const caseNode = store.graphNodes.find((n) => n.caseId === targetCase.id && n.type === 'case');
    if (caseNode) {
      store.graphEdges.push({
        id: `ge_${crypto.randomBytes(4).toString('hex')}`,
        sourceId: caseNode.id,
        targetId: evNodeId,
        relation: 'приобщено доказательство',
        source: 'Центр цифровых доказательств',
        establishedAt: now,
        confidence: 'confirmed',
        caseId: targetCase.id,
      });
    }

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'registered_evidence',
      resourceType: 'evidence',
      resourceId: record.id,
      outcome: 'success',
      details: `Registered ${record.id} (${record.name}) for ${record.caseNumber}.`,
    });
    saveStore(store);

    res.status(201).json({ evidence: record });
  });

  app.post('/api/evidence/:id/verify', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const ev = store.evidence.find((e) => e.id === req.params.id);
    if (!ev) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Evidence record not found.' });
      return;
    }
    if (!canAccessEvidence(store, user, ev, 'verify')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to verify this evidence.' });
      return;
    }

    const { sha256 } = req.body as { sha256?: string };
    const candidate = safeStr(sha256, 64).toLowerCase();
    if (!VALID_SHA256.test(candidate)) {
      res.status(400).json({ error: 'INVALID_HASH', message: 'Provide a valid 64-character SHA-256 hex string.' });
      return;
    }

    const match = candidate === ev.sha256.toLowerCase();
    const nextStatus: VerificationStatus = match ? 'verified' : 'mismatch';
    ev.verificationStatus = nextStatus; // NOTE: original ev.sha256 is NEVER overwritten!
    const now = new Date().toISOString();
    ev.accessLog.unshift({
      id: `eal_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorName: user.name,
      actorRole: user.role,
      action: 'verified',
      details: match
        ? `Контрольная сумма SHA-256 совпала (${candidate.slice(0, 16)}…).`
        : `ВНИМАНИЕ: несовпадение SHA-256! Предъявлено: ${candidate.slice(0, 16)}…, эталон сохранён без изменений.`,
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: match ? 'evidence_hash_verified' : 'evidence_hash_mismatch',
      resourceType: 'evidence',
      resourceId: ev.id,
      outcome: 'success',
      details: `Hash verification for ${ev.id}: ${nextStatus}.`,
    });
    saveStore(store);

    res.json({ evidence: ev, match });
  });

  app.post('/api/evidence/:id/transfer', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const ev = store.evidence.find((e) => e.id === req.params.id);
    if (!ev) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Evidence not found.' });
      return;
    }
    if (!canAccessEvidence(store, user, ev, 'transfer')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to transfer custody.' });
      return;
    }

    const { toPerson, purpose, hashVerified } = req.body as {
      toPerson?: string;
      purpose?: string;
      hashVerified?: boolean;
    };
    const cleanTo = safeStr(toPerson, 120);
    const cleanPurpose = safeStr(purpose, 240);
    if (!cleanTo || !cleanPurpose) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Recipient and transfer purpose are required.' });
      return;
    }

    const now = new Date().toISOString();
    const prevCustodian = ev.custodian;
    ev.custodian = cleanTo;
    ev.custodyHistory.unshift({
      id: `COC-${crypto.randomBytes(3).toString('hex')}`,
      evidenceId: ev.id,
      timestamp: now,
      fromPerson: prevCustodian,
      toPerson: cleanTo,
      purpose: cleanPurpose,
      hashVerified: Boolean(hashVerified),
    });
    ev.accessLog.unshift({
      id: `eal_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorName: user.name,
      actorRole: user.role,
      action: 'transferred',
      details: `Передача хранения: ${prevCustodian} → ${cleanTo} (${cleanPurpose}).`,
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'evidence_custody_transfer',
      resourceType: 'evidence',
      resourceId: ev.id,
      outcome: 'success',
      details: `Transferred ${ev.id} to ${cleanTo}.`,
    });
    saveStore(store);
    res.json({ evidence: ev });
  });

  app.patch('/api/evidence/:id/working-copy', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const ev = store.evidence.find((e) => e.id === req.params.id);
    if (!ev) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Evidence not found.' });
      return;
    }
    if (!canAccessEvidence(store, user, ev, 'working_copy')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to update working copy notes.' });
      return;
    }

    const { workingCopyNotes } = req.body as { workingCopyNotes?: string };
    const now = new Date().toISOString();
    ev.workingCopyNotes = safeStr(workingCopyNotes, 1200);
    ev.workingCopyUpdatedAt = now;
    ev.accessLog.unshift({
      id: `eal_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: now,
      actorName: user.name,
      actorRole: user.role,
      action: 'working_copy_updated',
      details: 'Обновлены пометки рабочей копии (исходный файл и эталонный SHA-256 не изменены).',
    });

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'evidence_working_copy_note',
      resourceType: 'evidence',
      resourceId: ev.id,
      outcome: 'success',
      details: `Updated working copy notes on ${ev.id}.`,
    });
    saveStore(store);
    res.json({ evidence: ev });
  });

  /* ======================== INTELLIGENCE GRAPH ======================== */

  app.get('/api/graph', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const caseFilter = safeStr(req.query.caseId || 'all', 40);

    const accessibleCaseIds = new Set(
      store.cases.filter((c) => canAccessCase(store, user, c, 'read')).map((c) => c.id)
    );

    if (caseFilter !== 'all' && !accessibleCaseIds.has(caseFilter)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Access to graph for this case is restricted.' });
      return;
    }

    const nodes = store.graphNodes.filter(
      (n) => accessibleCaseIds.has(n.caseId) && (caseFilter === 'all' || n.caseId === caseFilter)
    );
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = store.graphEdges.filter(
      (e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)
    );

    res.json({ nodes, edges });
  });

  app.post('/api/graph/nodes', requireAuth, requirePermission('graph_edit'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const { type, label, subtitle, caseId } = req.body as Partial<GraphNode>;
    const targetCase = store.cases.find((c) => c.id === caseId);
    if (!targetCase || !canAccessCase(store, user, targetCase, 'read')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot add node to inaccessible case.' });
      return;
    }

    const validTypes: GraphNodeType[] = [
      'case',
      'evidence',
      'domain',
      'ip',
      'file',
      'event',
      'organization',
      'participant',
    ];
    const cleanLabel = safeStr(label, 120);
    if (!cleanLabel) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Node label is required.' });
      return;
    }

    const node: GraphNode = {
      id: `gn_${crypto.randomBytes(5).toString('hex')}`,
      type: validTypes.includes(type as GraphNodeType) ? (type as GraphNodeType) : 'event',
      label: cleanLabel,
      subtitle: safeStr(subtitle, 140),
      caseId: targetCase.id,
      departmentId: targetCase.departmentId,
      accessLevel: targetCase.accessLevel,
      x: 180 + Math.floor(Math.random() * 440),
      y: 120 + Math.floor(Math.random() * 260),
      attributes: { Добавил: user.name },
    };

    store.graphNodes.push(node);
    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'added_graph_node',
      resourceType: 'graph',
      resourceId: node.id,
      outcome: 'success',
      details: `Added graph node ${node.label} (${node.type}) to ${targetCase.caseNumber}.`,
    });
    saveStore(store);
    res.status(201).json({ node });
  });

  app.post('/api/graph/edges', requireAuth, requirePermission('graph_edit'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const { sourceId, targetId, relation, source, confidence } = req.body as Partial<GraphEdge>;

    const srcNode = store.graphNodes.find((n) => n.id === sourceId);
    const dstNode = store.graphNodes.find((n) => n.id === targetId);
    if (!srcNode || !dstNode || srcNode.id === dstNode.id) {
      res.status(400).json({ error: 'INVALID_NODES', message: 'Valid distinct source and target nodes required.' });
      return;
    }

    const srcCase = store.cases.find((c) => c.id === srcNode.caseId);
    const dstCase = store.cases.find((c) => c.id === dstNode.caseId);
    if (!srcCase || !dstCase || !canAccessCase(store, user, srcCase, 'read') || !canAccessCase(store, user, dstCase, 'read')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot link nodes from inaccessible cases.' });
      return;
    }

    const cleanRel = safeStr(relation, 120);
    const cleanSource = safeStr(source, 160);
    if (!cleanRel || !cleanSource) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Relation and evidentiary source are required.' });
      return;
    }

    const edge: GraphEdge = {
      id: `ge_${crypto.randomBytes(5).toString('hex')}`,
      sourceId: srcNode.id,
      targetId: dstNode.id,
      relation: cleanRel,
      source: cleanSource,
      establishedAt: new Date().toISOString(),
      confidence:
        confidence === 'confirmed' || confidence === 'indirect' ? confidence : 'hypothesis',
      caseId: srcCase.id,
    };

    store.graphEdges.push(edge);
    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'added_graph_edge',
      resourceType: 'graph',
      resourceId: edge.id,
      outcome: 'success',
      details: `Linked ${srcNode.label} -> ${dstNode.label} (${edge.confidence}).`,
    });
    saveStore(store);
    res.status(201).json({ edge });
  });

  /* ======================== GLOBAL RBAC-SCOPED SEARCH ======================== */

  app.get('/api/search', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const perms = req.authPerms!;
    const q = safeStr(req.query.q || '', 160).toLowerCase();
    const typeFilter = safeStr(req.query.type || 'all', 24);
    const statusFilter = safeStr(req.query.status || 'all', 24);
    const fromDate = safeStr(req.query.from || '', 20);
    const toDate = safeStr(req.query.to || '', 20);

    const inDateRange = (iso?: string) => {
      if (!iso) return true;
      const d = iso.slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    };

    const results: Array<Record<string, unknown>> = [];

    const accessibleCases = store.cases.filter((c) => canAccessCase(store, user, c, 'read'));

    if (typeFilter === 'all' || typeFilter === 'case') {
      for (const c of accessibleCases) {
        if (statusFilter !== 'all' && c.status !== statusFilter) continue;
        if (!inDateRange(c.createdAt)) continue;
        const hay = `${c.caseNumber} ${c.title} ${c.summary} ${c.qualificationNotes} ${c.assignedOfficer}`.toLowerCase();
        if (!q || hay.includes(q)) {
          results.push({
            id: c.id,
            kind: 'case',
            title: `${c.caseNumber} — ${c.title}`,
            snippet: c.summary || c.qualificationNotes,
            date: c.updatedAt,
            status: c.status,
            targetPage: 'case',
            routeOpts: { id: c.id },
          });
        }
      }
    }

    if (typeFilter === 'all' || typeFilter === 'material') {
      for (const c of accessibleCases) {
        for (const m of c.materials) {
          if (statusFilter !== 'all' && m.verificationStatus !== statusFilter) continue;
          if (!inDateRange(m.receivedAt)) continue;
          const hay = `${m.title} ${m.fileName} ${m.sha256} ${m.source} ${m.notes}`.toLowerCase();
          if (!q || hay.includes(q)) {
            results.push({
              id: m.id,
              kind: 'material',
              title: `${m.title} (${c.caseNumber})`,
              snippet: `${m.fileName} · SHA-256: ${m.sha256.slice(0, 16)}… · ${m.source}`,
              date: m.receivedAt,
              status: m.verificationStatus,
              targetPage: 'case',
              routeOpts: { id: c.id, tab: 'documents' },
            });
          }
        }
      }
    }

    if (perms.evidence_read && (typeFilter === 'all' || typeFilter === 'evidence')) {
      for (const ev of store.evidence) {
        if (!canAccessEvidence(store, user, ev, 'read')) continue;
        if (statusFilter !== 'all' && ev.verificationStatus !== statusFilter) continue;
        if (!inDateRange(ev.receivedAt)) continue;
        const hay = `${ev.id} ${ev.name} ${ev.sha256} ${ev.source} ${ev.custodian} ${ev.caseNumber}`.toLowerCase();
        if (!q || hay.includes(q)) {
          results.push({
            id: ev.id,
            kind: 'evidence',
            title: `${ev.id} — ${ev.name}`,
            snippet: `${ev.caseNumber} · ${ev.source} · SHA-256: ${ev.sha256.slice(0, 16)}…`,
            date: ev.receivedAt,
            status: ev.verificationStatus,
            targetPage: 'evidenceCenter',
            routeOpts: { id: ev.id },
          });
        }
      }
    }

    if (typeFilter === 'all' || typeFilter === 'report') {
      const accessibleCaseIds = new Set(accessibleCases.map((c) => c.id));
      for (const r of store.reports) {
        if (r.caseId && !accessibleCaseIds.has(r.caseId)) continue;
        if (!r.caseId && user.role !== 'admin' && r.departmentId !== user.departmentId) continue;
        if (!inDateRange(r.createdAt)) continue;
        const hay = `${r.title} ${r.caseNumber} ${r.summary} ${r.authorName}`.toLowerCase();
        if (!q || hay.includes(q)) {
          results.push({
            id: r.id,
            kind: 'report',
            title: r.title,
            snippet: `${r.caseNumber} · ${r.summary}`,
            date: r.createdAt,
            status: r.template,
            targetPage: 'reports',
          });
        }
      }
    }

    if (perms.audit_read && (typeFilter === 'all' || typeFilter === 'audit')) {
      for (const a of store.auditLog) {
        if (user.role === 'department_head' && a.departmentId !== user.departmentId && a.actorId !== user.id) {
          continue;
        }
        if (!inDateRange(a.timestamp)) continue;
        const hay = `${a.action} ${a.actorName} ${a.resourceId} ${a.details}`.toLowerCase();
        if (!q || hay.includes(q)) {
          results.push({
            id: a.id,
            kind: 'audit',
            title: `${a.action} — ${a.resourceId}`,
            snippet: `${a.actorName} (${a.actorRole}) · ${a.details}`,
            date: a.timestamp,
            status: a.outcome,
            targetPage: 'admin',
          });
        }
      }
    }

    res.json({ results: results.slice(0, 60) });
  });

  /* ======================== REPORTS & AUDIT ======================== */

  app.get('/api/reports', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const accessibleCaseIds = new Set(
      store.cases.filter((c) => canAccessCase(store, user, c, 'read')).map((c) => c.id)
    );
    const reports = store.reports.filter((r) => {
      if (user.role === 'admin') return true;
      if (r.caseId) return accessibleCaseIds.has(r.caseId);
      return r.departmentId === user.departmentId;
    });
    res.json({ reports });
  });

  app.post('/api/reports', requireAuth, requirePermission('reports_export'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const { caseId, caseNumber, title, template, summary } = req.body as {
      caseId?: string;
      caseNumber?: string;
      title?: string;
      template?: 'incident' | 'evidence' | 'investigation';
      summary?: string;
    };

    const linkedCase = caseId ? store.cases.find((c) => c.id === caseId) : undefined;
    if (linkedCase && !canAccessCase(store, user, linkedCase, 'read')) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot link report to inaccessible case.' });
      return;
    }

    const now = new Date().toISOString();
    const report: StoredReportRecord = {
      id: `rep_${crypto.randomBytes(4).toString('hex')}`,
      caseId: linkedCase?.id,
      caseNumber: linkedCase?.caseNumber || safeStr(caseNumber || 'UNASSIGNED', 40),
      departmentId: linkedCase?.departmentId || user.departmentId,
      accessLevel: linkedCase?.accessLevel || 'department',
      title: safeStr(title || `Отчёт по делу ${linkedCase?.caseNumber || caseNumber || ''}`, 180),
      template:
        template === 'evidence' || template === 'investigation' ? template : 'incident',
      authorId: user.id,
      authorName: user.name,
      createdAt: now,
      summary: safeStr(summary, 600),
    };

    store.reports.unshift(report);
    if (linkedCase) {
      linkedCase.linkedReportIds.unshift(report.id);
      linkedCase.history.unshift({
        id: `hist_${crypto.randomBytes(4).toString('hex')}`,
        timestamp: now,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'generated_report',
        details: `Сформирован отчёт "${report.title}".`,
      });
    }

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'created_report',
      resourceType: 'report',
      resourceId: report.id,
      outcome: 'success',
      details: `Generated report ${report.title} (${report.caseNumber}).`,
    });
    saveStore(store);
    res.status(201).json({ report });
  });

  app.get('/api/audit', requireAuth, requirePermission('audit_read'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const user = req.authUser!;
    const logs = store.auditLog.filter((entry) => {
      if (user.role === 'admin') return true;
      return entry.departmentId === user.departmentId || entry.actorId === user.id;
    });
    res.json({ logs: logs.slice(0, 250) });
  });

  /* ======================== ADMIN USER & RBAC MANAGEMENT ======================== */

  app.get('/api/admin/users', requireAuth, requirePermission('users_manage'), (_req, res) => {
    const store = loadStore();
    res.json({ users: store.users.map(sanitizeUser) });
  });

  app.post('/api/admin/users', requireAuth, requirePermission('users_manage'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const actor = req.authUser!;
    const { name, email, password, role, departmentId, badgeNumber } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: InstitutionalRole;
      departmentId?: DepartmentId;
      badgeNumber?: string;
    };

    const cleanName = safeStr(name, 80);
    const cleanEmail = safeStr(email, 120).toLowerCase();
    const cleanPass = String(password ?? '');
    if (!cleanName || !cleanEmail.includes('@') || cleanPass.length < 8) {
      res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Name, valid email, and password (min 8 chars) are required.',
      });
      return;
    }
    if (store.users.some((u) => u.email === cleanEmail)) {
      res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email is already registered.' });
      return;
    }

    const safeRole: InstitutionalRole = VALID_ROLES.includes(role as InstitutionalRole)
      ? (role as InstitutionalRole)
      : 'officer';
    const safeDept: DepartmentId = VALID_DEPARTMENTS.includes(departmentId as DepartmentId)
      ? (departmentId as DepartmentId)
      : 'dept_cyber';

    const now = new Date().toISOString();
    const newUser: StoredUserRecord = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      name: cleanName,
      email: cleanEmail,
      role: safeRole,
      departmentId: safeDept,
      badgeNumber: safeStr(badgeNumber || `ID-${store.users.length + 101}`, 32),
      status: 'active',
      createdAt: now,
      lastActive: now,
      passwordHash: hashPassword(cleanPass),
    };

    store.users.push(newUser);
    appendAuditLog(store, {
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      departmentId: actor.departmentId,
      action: 'admin_created_user',
      resourceType: 'admin',
      resourceId: newUser.email,
      outcome: 'success',
      details: `Created user ${newUser.name} (${newUser.role} / ${newUser.departmentId}).`,
    });
    saveStore(store);

    res.status(201).json({ user: sanitizeUser(newUser) });
  });

  app.patch('/api/admin/users/:id', requireAuth, requirePermission('users_manage'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const actor = req.authUser!;
    const target = store.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
      return;
    }

    const { role, departmentId, status } = req.body as {
      role?: InstitutionalRole;
      departmentId?: DepartmentId;
      status?: 'active' | 'suspended';
    };

    // Prevent locking out the last active admin
    const activeAdmins = store.users.filter((u) => u.role === 'admin' && u.status === 'active');
    if (
      target.role === 'admin' &&
      activeAdmins.length <= 1 &&
      ((role && role !== 'admin') || status === 'suspended')
    ) {
      res.status(400).json({
        error: 'LAST_ADMIN_PROTECTED',
        message: 'Cannot demote or suspend the sole active administrator.',
      });
      return;
    }

    if (role && VALID_ROLES.includes(role)) target.role = role;
    if (departmentId && VALID_DEPARTMENTS.includes(departmentId)) target.departmentId = departmentId;
    if (status === 'active' || status === 'suspended') target.status = status;

    appendAuditLog(store, {
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      departmentId: actor.departmentId,
      action: 'admin_updated_user',
      resourceType: 'admin',
      resourceId: target.email,
      outcome: 'success',
      details: `Updated user ${target.email}: role=${target.role}, dept=${target.departmentId}, status=${target.status}.`,
    });
    saveStore(store);
    res.json({ user: sanitizeUser(target) });
  });

  app.get('/api/admin/roles', requireAuth, requirePermission('rbac_manage'), (_req, res) => {
    const store = loadStore();
    res.json({ rolePermissions: store.rolePermissions || DEFAULT_ROLE_MATRIX });
  });

  app.put('/api/admin/roles', requireAuth, requirePermission('rbac_manage'), (req: AuthenticatedRequest, res) => {
    const store = loadStore();
    const actor = req.authUser!;
    const { role, permission, value } = req.body as {
      role?: InstitutionalRole;
      permission?: keyof InstitutionalPermissionSet;
      value?: boolean;
    };

    if (!role || !VALID_ROLES.includes(role) || !permission || typeof value !== 'boolean') {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Valid role, permission, and boolean required.' });
      return;
    }

    if (role === 'admin' && (permission === 'rbac_manage' || permission === 'users_manage' || permission === 'audit_read') && !value) {
      res.status(400).json({
        error: 'ADMIN_LOCKOUT_PREVENTED',
        message: 'Critical administrative permissions cannot be revoked from admin role.',
      });
      return;
    }

    store.rolePermissions[role] = {
      ...store.rolePermissions[role],
      [permission]: value,
    };

    appendAuditLog(store, {
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      departmentId: actor.departmentId,
      action: 'admin_updated_rbac',
      resourceType: 'admin',
      resourceId: `${role}.${permission}`,
      outcome: 'success',
      details: `Set ${role}.${permission} = ${value}.`,
    });
    saveStore(store);
    res.json({ rolePermissions: store.rolePermissions });
  });

  /* ======================== AI & OSINT (AUTHENTICATED + PERMISSIONED) ======================== */

  app.post('/api/ai/chat', requireAuth, requirePermission('ai_use'), async (req: AuthenticatedRequest, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI_UNCONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const {
        message,
        mode = 'general',
        lang = 'ru',
        caseId,
        history = [],
        attachments = [],
      } = req.body as {
        message?: string;
        mode?: string;
        lang?: string;
        caseId?: string;
        history?: ChatHistoryItem[];
        attachments?: ChatAttachmentInput[];
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'INVALID_INPUT', message: 'Message is required.' });
        return;
      }

      const store = loadStore();
      let caseContextPrompt = '';
      if (caseId && typeof caseId === 'string') {
        const linkedCase = store.cases.find((c) => c.id === caseId);
        if (!linkedCase) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Referenced case not found.' });
          return;
        }
        if (!canAccessCase(store, req.authUser!, linkedCase, 'read')) {
          res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied to referenced case context.' });
          return;
        }
        caseContextPrompt = [
          `Active Authorized Case Context (${linkedCase.caseNumber} [${linkedCase.kind}]):`,
          `Title: ${linkedCase.title}`,
          `Category: ${linkedCase.category} | Status: ${linkedCase.status}`,
          `Summary: ${linkedCase.summary}`,
          `Qualification Notes: ${linkedCase.qualificationNotes}`,
          `Linked Entities (${linkedCase.entities.length}): ${linkedCase.entities
            .slice(0, 8)
            .map((e) => `${e.type}:${e.label} (${e.confidence})`)
            .join('; ')}`,
        ].join('\n');
      }

      const langNames: Record<string, string> = {
        uz: 'Uzbek (Latin script)',
        ru: 'Russian',
        en: 'English',
      };
      const targetLang = langNames[lang] || 'Russian';

      const modeInstructions: Record<string, string> = {
        general: 'Answer cybercrime investigation, Criminal Code qualification (e.g., Art. 168 Fraud, Art. 169 Theft, Art. 278-1..278-7 Cybercrimes), OSINT, and cybersecurity questions accurately.',
        explain: 'Explain complex cybersecurity, digital forensics, and legal terms in plain, structured language with clear examples.',
        forensics: 'Assist with digital forensics methodology, evidence preservation, SHA-256 hashing, mobile/PC log analysis, and Chain of Custody.',
        scenario: 'Analyze the cybercrime case scenario, identify legal qualification clues, digital traces, and step-by-step investigative hypotheses.',
        quiz: 'Generate clear educational practice questions with multiple choices, correct answers, and brief explanations.',
      };

      const systemInstruction = [
        'You are the departmental AI Assistant inside the KIBERJINOYATLAR Cyber Intelligence & Digital Forensics Platform.',
        `Respond strictly in ${targetLang}.`,
        modeInstructions[mode] || modeInstructions.general,
        'Always emphasize lawful, ethical, and procedural investigation practices (Criminal Procedure Code, Chain of Custody, ISO/IEC 27037).',
        'Never invent real criminal records or claim fictional examples are verified real-world cases.',
        'Format responses cleanly using concise headings and bullet points.',
        caseContextPrompt ? `\n${caseContextPrompt}` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];

      // Normalize alternating user/model turns from history
      for (const item of history.slice(-12)) {
        if (!item || typeof item.text !== 'string' || !item.text.trim()) continue;
        const role: 'user' | 'model' = item.role === 'assistant' ? 'model' : 'user';
        const prev = contents[contents.length - 1];
        if (prev && prev.role === role) {
          prev.parts.push({ text: item.text.trim() });
        } else {
          contents.push({ role, parts: [{ text: item.text.trim() }] });
        }
      }
      // Gemini expects conversation history not to end on a user turn before pushing another user turn
      while (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents.pop();
      }

      const currentParts: Array<Record<string, unknown>> = [];
      let textContext = message.trim();

      for (const att of attachments.slice(0, 4)) {
        if (!att || !att.name) continue;
        if (att.extractedText) {
          textContext += `\n\n[Attached document: ${att.name}]\n${att.extractedText.slice(0, 25000)}`;
        } else if (
          att.base64Data &&
          (att.mimeType === 'application/pdf' || att.mimeType.startsWith('image/'))
        ) {
          currentParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64Data,
            },
          });
        }
      }

      currentParts.push({ text: textContext });
      contents.push({ role: 'user', parts: currentParts });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: { systemInstruction },
      });

      appendAuditLog(store, {
        actorId: req.authUser!.id,
        actorName: req.authUser!.name,
        actorRole: req.authUser!.role,
        departmentId: req.authUser!.departmentId,
        action: 'ai_query',
        resourceType: 'ai',
        resourceId: caseId ? `${mode}:${caseId}` : mode,
        outcome: 'success',
        details: `AI assistant query in mode ${mode}${caseId ? ` (case ${caseId})` : ''}.`,
      });
      saveStore(store);

      res.json({ text: response.text ?? '', model: 'gemini-4-hydrogen' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI request failed.';
      const status = msg.includes('403') || msg.includes('PERMISSION_DENIED') ? 403 : msg.includes('429') ? 429 : 500;
      res.status(status).json({ error: 'AI_ERROR', message: msg });
    }
  });

  app.post('/api/ai/transcribe', requireAuth, requirePermission('ai_use'), async (req: AuthenticatedRequest, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI_UNCONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const { audioBase64, mimeType = 'audio/webm', lang = 'ru' } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        lang?: string;
      };

      if (!audioBase64 || typeof audioBase64 !== 'string' || audioBase64.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'INVALID_AUDIO', message: 'Valid audio payload (<= 10MB) is required.' });
        return;
      }

      const cleanMime = safeStr(mimeType, 60).split(';')[0].trim();
      if (!cleanMime.startsWith('audio/')) {
        res.status(400).json({ error: 'INVALID_MIME', message: 'Unsupported audio MIME type.' });
        return;
      }

      const langNames: Record<string, string> = {
        uz: 'Uzbek (Latin script)',
        ru: 'Russian',
        en: 'English',
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType: cleanMime, data: audioBase64 } },
            {
              text: `Transcribe the spoken audio accurately in ${langNames[lang] || 'Russian'} (or the spoken language). Preserve technical, forensic, and legal terms (APK, SHA-256, OSINT, IP, RDAP, art. 168/169/278). Output ONLY the clean transcript text without commentary.`,
            },
          ],
        },
      });

      const store = loadStore();
      appendAuditLog(store, {
        actorId: req.authUser!.id,
        actorName: req.authUser!.name,
        actorRole: req.authUser!.role,
        departmentId: req.authUser!.departmentId,
        action: 'ai_voice_transcribe',
        resourceType: 'ai',
        resourceId: 'gemini-3.5-transcribe',
        outcome: 'success',
        details: `Voice dictation transcribed (${cleanMime}).`,
      });
      saveStore(store);

      res.json({ text: (response.text ?? '').trim(), model: 'gemini-3.5-transcribe' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audio transcription failed.';
      res.status(500).json({ error: 'TRANSCRIBE_ERROR', message: msg });
    }
  });

  app.post('/api/ai/tts', requireAuth, requirePermission('ai_use'), async (req: AuthenticatedRequest, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI_UNCONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const { text, voiceName = 'Kore', lang = 'ru' } = req.body as {
        text?: string;
        voiceName?: string;
        lang?: string;
      };

      const cleanedText = String(text ?? '')
        .replace(/[#*`>_~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2800);

      if (!cleanedText) {
        res.status(400).json({ error: 'INVALID_INPUT', message: 'Text to synthesize is required.' });
        return;
      }

      const allowedVoices = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];
      const chosenVoice = allowedVoices.includes(voiceName) ? voiceName : 'Kore';
      const styleHint =
        lang === 'uz'
          ? 'Clear, calm, authoritative analyst voice speaking Uzbek'
          : lang === 'en'
            ? 'Clear, calm, authoritative digital forensics analyst voice'
            : 'Clear, calm, authoritative cybercrime investigator briefing voice in Russian';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanedText,
                speechMetadata: {
                  style: styleHint,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        res.status(502).json({ error: 'TTS_EMPTY', message: 'No audio data returned by TTS model.' });
        return;
      }

      res.json({
        audioBase64,
        mimeType: 'audio/wav',
        voiceName: chosenVoice,
        model: 'gemini-3.8-flash-lite-tts',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'TTS synthesis failed.';
      res.status(500).json({ error: 'TTS_ERROR', message: msg });
    }
  });

  app.post('/api/ai/generate-test', requireAuth, requirePermission('ai_use'), async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI_UNCONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const { topic = 'Cybercrime & Digital Forensics', difficulty = 'middle', count = 5, lang = 'ru' } =
        req.body as { topic?: string; difficulty?: string; count?: number; lang?: string };

      const safeCount = Math.min(Math.max(Number(count) || 5, 1), 10);
      const langNames: Record<string, string> = {
        uz: 'Uzbek (Latin script)',
        ru: 'Russian',
        en: 'English',
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate ${safeCount} educational multiple-choice questions on the topic "${String(topic).slice(0, 120)}" at "${String(difficulty)}" difficulty level in ${langNames[lang] || 'Russian'}. Each question must have 4 options, 1 correct index (0-3), and a brief educational explanation.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctIndex', 'explanation'],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim());
      res.json({ questions: parsed });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate test.';
      res.status(500).json({ error: 'AI_ERROR', message: msg });
    }
  });

  app.post('/api/ai/search-assist', requireAuth, requirePermission('ai_use'), async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI_UNCONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }
    try {
      const { query, lang = 'ru' } = req.body as { query?: string; lang?: string };
      const clean = safeStr(query, 200);
      if (!clean) {
        res.status(400).json({ error: 'INVALID_INPUT', message: 'Query is required.' });
        return;
      }
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `User natural-language search in a cybercrime investigation platform (${lang}): "${clean}". Suggest 3 concise search keywords/article hints (e.g. APK, 168, 278-6, SHA-256, phishing, SIM-box) and 1 brief search strategy sentence in ${lang}.`,
      });
      res.json({ hint: response.text ?? '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search assist failed.';
      res.status(500).json({ error: 'AI_ERROR', message: msg });
    }
  });

  app.post('/api/osint/lookup', requireAuth, requirePermission('osint_use'), async (req: AuthenticatedRequest, res) => {
    const { target } = req.body as { target?: string };
    if (!target || typeof target !== 'string') {
      res.status(400).json({ error: 'INVALID_TARGET', message: 'Target domain or public IP is required.' });
      return;
    }

    const trimmed = target.trim();
    const ipVersion = net.isIP(trimmed);
    const store = loadStore();

    if (ipVersion === 4 || ipVersion === 6) {
      if (
        (ipVersion === 4 && isPrivateOrReservedIPv4(trimmed)) ||
        (ipVersion === 6 && isPrivateOrReservedIPv6(trimmed))
      ) {
        res.status(400).json({
          error: 'RESTRICTED_IP',
          message: 'Private, loopback, or reserved IP addresses cannot be queried externally.',
        });
        return;
      }

      const result: Record<string, unknown> = {
        type: 'ip',
        target: trimmed,
        timestamp: new Date().toISOString(),
        sources: ['ipwho.is', 'rdap.org', 'Reverse DNS'],
      };

      const [reverseDns, ipInfoResp, rdapResp] = await Promise.allSettled([
        dns.reverse(trimmed),
        fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(trimmed)}`).then((r) => r.json()),
        fetchWithTimeout(`https://rdap.org/ip/${encodeURIComponent(trimmed)}`).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      result.reverseDns = reverseDns.status === 'fulfilled' ? reverseDns.value : [];
      result.geo = ipInfoResp.status === 'fulfilled' ? ipInfoResp.value : null;
      if (rdapResp.status === 'fulfilled' && rdapResp.value) {
        const rd = rdapResp.value as Record<string, unknown>;
        result.rdap = {
          name: rd.name || null,
          handle: rd.handle || null,
          country: rd.country || null,
          type: rd.type || null,
          startAddress: rd.startAddress || null,
          endAddress: rd.endAddress || null,
        };
      } else {
        result.rdap = null;
      }

      appendAuditLog(store, {
        actorId: req.authUser!.id,
        actorName: req.authUser!.name,
        actorRole: req.authUser!.role,
        departmentId: req.authUser!.departmentId,
        action: 'osint_lookup_ip',
        resourceType: 'osint',
        resourceId: trimmed,
        outcome: 'success',
        details: `OSINT IP lookup on ${trimmed}.`,
      });
      saveStore(store);

      res.json(result);
      return;
    }

    const domain = validateDomain(trimmed);
    if (!domain) {
      res.status(400).json({
        error: 'INVALID_TARGET',
        message: 'Enter a valid public domain (e.g. example.com) or public IP address.',
      });
      return;
    }

    const [aRec, aaaaRec, mxRec, nsRec, txtRec, rdapRes, crtRes] = await Promise.allSettled([
      dns.resolve4(domain),
      dns.resolve6(domain),
      dns.resolveMx(domain),
      dns.resolveNs(domain),
      dns.resolveTxt(domain),
      fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(domain)}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetchWithTimeout(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, 7000).then((r) =>
        r.ok ? r.json() : []
      ),
    ]);

    const resolvedIpv4 = aRec.status === 'fulfilled' ? aRec.value : [];
    let primaryIpGeo: unknown = null;
    if (resolvedIpv4.length > 0 && !isPrivateOrReservedIPv4(resolvedIpv4[0])) {
      try {
        const g = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(resolvedIpv4[0])}`);
        if (g.ok) primaryIpGeo = await g.json();
      } catch {
        primaryIpGeo = null;
      }
    }

    let rdapSummary: Record<string, unknown> | null = null;
    if (rdapRes.status === 'fulfilled' && rdapRes.value) {
      const rd = rdapRes.value as Record<string, unknown>;
      const events = Array.isArray(rd.events) ? rd.events : [];
      rdapSummary = {
        ldhName: rd.ldhName || domain,
        status: Array.isArray(rd.status) ? rd.status : [],
        events: events.map((e: Record<string, unknown>) => ({
          action: e.eventAction,
          date: e.eventDate,
        })),
      };
    }

    const certificates: Array<{ commonName: string; issuer: string; notBefore: string; notAfter: string }> = [];
    if (crtRes.status === 'fulfilled' && Array.isArray(crtRes.value)) {
      const seen = new Set<string>();
      for (const item of crtRes.value as Array<Record<string, unknown>>) {
        const cn = String(item.common_name || item.name_value || '');
        if (!cn || seen.has(cn)) continue;
        seen.add(cn);
        certificates.push({
          commonName: cn,
          issuer: String(item.issuer_name || ''),
          notBefore: String(item.not_before || ''),
          notAfter: String(item.not_after || ''),
        });
        if (certificates.length >= 12) break;
      }
    }

    appendAuditLog(store, {
      actorId: req.authUser!.id,
      actorName: req.authUser!.name,
      actorRole: req.authUser!.role,
      departmentId: req.authUser!.departmentId,
      action: 'osint_lookup_domain',
      resourceType: 'osint',
      resourceId: domain,
      outcome: 'success',
      details: `OSINT domain lookup on ${domain}.`,
    });
    saveStore(store);

    res.json({
      type: 'domain',
      target: domain,
      timestamp: new Date().toISOString(),
      sources: ['Public DNS', 'RDAP.org', 'crt.sh', 'ipwho.is'],
      dns: {
        a: resolvedIpv4,
        aaaa: aaaaRec.status === 'fulfilled' ? aaaaRec.value : [],
        mx: mxRec.status === 'fulfilled' ? mxRec.value : [],
        ns: nsRec.status === 'fulfilled' ? nsRec.value : [],
        txt: txtRec.status === 'fulfilled' ? txtRec.value.map((t) => t.join('')) : [],
      },
      rdap: rdapSummary,
      primaryIpGeo,
      certificates,
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`KIBERJINOYATLAR server listening on http://0.0.0.0:${PORT}`);
  });

  const liveWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    if (reqUrl.pathname !== '/ws/ai-live') {
      return;
    }

    const token = reqUrl.searchParams.get('token') || '';
    const user = token ? verifySessionToken(token) : null;
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const store = loadStore();
    const perms = getUserPermissions(store, user);
    if (!perms.ai_use) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    liveWss.handleUpgrade(req, socket, head, (ws) => {
      liveWss.emit('connection', ws, req, user);
    });
  });

  liveWss.on('connection', async (clientWs: WebSocket, req: Request, user: StoredUserRecord) => {
    const ai = getGeminiClient();
    if (!ai) {
      clientWs.send(JSON.stringify({ type: 'error', error: 'AI_UNCONFIGURED', message: 'GEMINI_API_KEY is not configured.' }));
      clientWs.close();
      return;
    }

    const reqUrl = new URL(req.url || '/', 'http://localhost');
    const lang = reqUrl.searchParams.get('lang') || 'ru';
    const mode = reqUrl.searchParams.get('mode') || 'general';
    const reqVoice = reqUrl.searchParams.get('voice') || 'Zephyr';
    const caseId = reqUrl.searchParams.get('caseId') || '';

    const allowedVoices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
    const voiceName = allowedVoices.includes(reqVoice) ? reqVoice : 'Zephyr';

    const store = loadStore();
    let caseContext = '';
    if (caseId) {
      const targetCase = store.cases.find((c) => c.id === caseId);
      if (targetCase && canAccessCase(store, user, targetCase, 'read')) {
        caseContext = ` Active authorized case dossier ${targetCase.caseNumber}: ${targetCase.title} (${targetCase.status}). Summary: ${targetCase.summary}. Notes: ${targetCase.qualificationNotes}.`;
      }
    }

    const langNames: Record<string, string> = {
      uz: 'Uzbek (Latin script)',
      ru: 'Russian',
      en: 'English',
    };

    const systemInstruction = [
      'You are the real-time voice investigator assistant of KIBERJINOYATLAR.',
      `Speak clearly, concisely, and professionally in ${langNames[lang] || 'Russian'}.`,
      `Current focus mode: ${mode}.`,
      'Keep spoken responses focused and structured (2-5 clear sentences unless asked for deep step-by-step detail).',
      'Always uphold lawful Criminal Procedure Code and digital forensics integrity standards (Chain of Custody, SHA-256, ISO/IEC 27037).',
      caseContext,
    ]
      .filter(Boolean)
      .join(' ');

    appendAuditLog(store, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      departmentId: user.departmentId,
      action: 'ai_live_voice_session',
      resourceType: 'ai',
      resourceId: `${voiceName}:${mode}`,
      outcome: 'success',
      details: `Started Gemini Live voice briefing session (${voiceName}, ${lang}).`,
    });
    saveStore(store);

    let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

    try {
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready', voiceName, model: 'gemini-3.8-live' }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== clientWs.OPEN) return;
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ type: 'input_transcript', text: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ type: 'output_transcript', text: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ type: 'audio', data: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }
          },
          onerror: (err: unknown) => {
            if (clientWs.readyState === clientWs.OPEN) {
              const msg = err instanceof Error ? err.message : 'Live voice stream error.';
              clientWs.send(JSON.stringify({ type: 'error', message: msg }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
              clientWs.close();
            }
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Gemini Live voice service.';
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: msg }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session) return;
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: string; data?: string; text?: string };
        if (parsed.type === 'audio' && typeof parsed.data === 'string' && parsed.data.length > 0) {
          session.sendRealtimeInput({
            audio: { data: parsed.data, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (parsed.type === 'text' && typeof parsed.text === 'string' && parsed.text.trim()) {
          session.sendRealtimeInput({ text: parsed.text.trim().slice(0, 2000) });
        }
      } catch {
        // Ignore malformed frame
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch {
        // Ignore close error
      }
    });
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
