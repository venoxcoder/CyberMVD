import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BookPlus,
  CheckSquare,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  AuditLogEntry,
  DepartmentId,
  InstitutionalPermissionSet,
  InstitutionalRole,
  InstitutionalUser,
  KBArticle,
  Lang,
  SimCase,
  TestQuestion,
} from '../types';
import { deptLabel, localizeRecordText, pickText, roleLabel, t, tr } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { EmptyState, PageHeader, StatusBadge, TableSkeleton } from './CommonUI';

interface AdminPanelPageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}

type AdminTab = 'users' | 'audit' | 'security' | 'content' | 'tests' | 'cases';

const ROLES: InstitutionalRole[] = ['admin', 'department_head', 'officer', 'analyst', 'observer'];
const DEPTS: DepartmentId[] = ['dept_cyber', 'dept_forensics', 'dept_osint', 'dept_oversight'];

export const AdminPanelPage: React.FC<AdminPanelPageProps> = ({
  lang,
  canGoBack,
  onBack,
  onToast,
}) => {
  const { apiFetch, permissions, user: currentUser } = useAuth();
  const [tab, setTab] = useState<AdminTab>(
    permissions?.users_manage ? 'users' : permissions?.audit_read ? 'audit' : 'security'
  );

  const [serverUsers, setServerUsers] = useState<InstitutionalUser[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<
    Record<InstitutionalRole, InstitutionalPermissionSet> | null
  >(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'officer' as InstitutionalRole,
    departmentId: 'dept_cyber' as DepartmentId,
    badgeNumber: '',
  });

  // Preserved local instructional content creators
  const [customKb, setCustomKb] = useState<KBArticle[]>(() =>
    lsJSON<KBArticle[]>('kj_admin_kb', [])
  );
  const [kbDraft, setKbDraft] = useState({
    category: 'cybercrime' as KBArticle['category'],
    title: '',
    summary: '',
    content: '',
    tags: 'Custom, Training',
  });

  const [customTests, setCustomTests] = useState<TestQuestion[]>(() =>
    lsJSON<TestQuestion[]>('kj_admin_tests', [])
  );
  const [testDraft, setTestDraft] = useState({
    difficulty: 'middle' as TestQuestion['difficulty'],
    category: 'forensics' as TestQuestion['category'],
    question: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    correctIndex: 0,
    explanation: '',
  });

  const [customCases, setCustomCases] = useState<SimCase[]>(() =>
    lsJSON<SimCase[]>('kj_admin_cases', [])
  );
  const [caseDraft, setCaseDraft] = useState({
    code: 'SIM-CUSTOM-01',
    difficulty: 'middle' as SimCase['difficulty'],
    title: '',
    briefing: '',
    artifactLabel: 'Digital Log',
    artifactContent: '',
    prompt: '',
    optimalChoice: '',
    suboptimalChoice: '',
  });

  const loadUsersAndRoles = useCallback(async () => {
    if (!permissions?.users_manage) return;
    setLoadingUsers(true);
    try {
      const [uRes, rRes] = await Promise.all([
        apiFetch<{ users: InstitutionalUser[] }>('/api/admin/users'),
        apiFetch<{ rolePermissions: Record<InstitutionalRole, InstitutionalPermissionSet> }>(
          '/api/admin/roles'
        ),
      ]);
      setServerUsers(uRes.users || []);
      setRoleMatrix(rRes.rolePermissions);
    } catch {
      // Ignore if unauthorized
    } finally {
      setLoadingUsers(false);
    }
  }, [apiFetch, permissions?.users_manage]);

  const loadAudit = useCallback(async () => {
    if (!permissions?.audit_read) return;
    setLoadingAudit(true);
    try {
      const res = await apiFetch<{ logs: AuditLogEntry[] }>('/api/audit');
      setAuditLogs(res.logs || []);
    } catch {
      // Ignore if unauthorized
    } finally {
      setLoadingAudit(false);
    }
  }, [apiFetch, permissions?.audit_read]);

  useEffect(() => {
    loadUsersAndRoles();
    loadAudit();
  }, [loadUsersAndRoles, loadAudit]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ user: InstitutionalUser }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setServerUsers((prev) => [...prev, res.user]);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'officer',
        departmentId: 'dept_cyber',
        badgeNumber: '',
      });
      onToast(t('saved', lang));
      loadAudit();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handlePatchUser = async (
    id: string,
    patch: { role?: InstitutionalRole; departmentId?: DepartmentId; status?: 'active' | 'suspended' }
  ) => {
    try {
      const res = await apiFetch<{ user: InstitutionalUser }>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setServerUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
      onToast(t('saved', lang));
      loadAudit();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Update rejected');
    }
  };

  const handleTogglePerm = async (
    role: InstitutionalRole,
    perm: keyof InstitutionalPermissionSet,
    val: boolean
  ) => {
    try {
      const res = await apiFetch<{
        rolePermissions: Record<InstitutionalRole, InstitutionalPermissionSet>;
      }>('/api/admin/roles', {
        method: 'PUT',
        body: JSON.stringify({ role, permission: perm, value: val }),
      });
      setRoleMatrix(res.rolePermissions);
      onToast(t('saved', lang));
      loadAudit();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Update rejected');
    }
  };

  const handleAddKb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbDraft.title.trim() || !kbDraft.content.trim()) return;
    const item: KBArticle = {
      id: `kb_custom_${Date.now()}`,
      category: kbDraft.category,
      readMinutes: 4,
      tags: kbDraft.tags.split(',').map((s) => s.trim()).filter(Boolean),
      title: { uz: kbDraft.title, ru: kbDraft.title, en: kbDraft.title },
      summary: { uz: kbDraft.summary || kbDraft.title, ru: kbDraft.summary || kbDraft.title, en: kbDraft.summary || kbDraft.title },
      content: { uz: kbDraft.content, ru: kbDraft.content, en: kbDraft.content },
      isCustom: true,
    };
    const next = [item, ...customKb];
    setCustomKb(next);
    lsSetJSON('kj_admin_kb', next);
    setKbDraft({ category: 'cybercrime', title: '', summary: '', content: '', tags: 'Custom, Training' });
    logActivity('admin', `Added KB article: ${item.id}`);
    onToast(t('saved', lang));
  };

  const handleAddTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testDraft.question.trim() || !testDraft.opt0.trim() || !testDraft.opt1.trim()) return;
    const opts = [testDraft.opt0, testDraft.opt1, testDraft.opt2 || '—', testDraft.opt3 || '—'];
    const q: TestQuestion = {
      id: `tq_custom_${Date.now()}`,
      difficulty: testDraft.difficulty,
      category: testDraft.category,
      question: { uz: testDraft.question, ru: testDraft.question, en: testDraft.question },
      options: { uz: opts, ru: opts, en: opts },
      correctIndex: testDraft.correctIndex,
      explanation: {
        uz: testDraft.explanation || 'Admin savoli',
        ru: testDraft.explanation || 'Вопрос администратора',
        en: testDraft.explanation || 'Admin question',
      },
      isCustom: true,
    };
    const next = [q, ...customTests];
    setCustomTests(next);
    lsSetJSON('kj_admin_tests', next);
    setTestDraft({
      difficulty: 'middle',
      category: 'forensics',
      question: '',
      opt0: '',
      opt1: '',
      opt2: '',
      opt3: '',
      correctIndex: 0,
      explanation: '',
    });
    logActivity('admin', `Added test question ${q.id}`);
    onToast(t('saved', lang));
  };

  const handleAddCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseDraft.title.trim() || !caseDraft.prompt.trim() || !caseDraft.optimalChoice.trim()) return;
    const sc: SimCase = {
      id: `sim_custom_${Date.now()}`,
      code: caseDraft.code.trim() || 'SIM-NEW',
      difficulty: caseDraft.difficulty,
      relatedArticleId: 'a169',
      title: { uz: caseDraft.title, ru: caseDraft.title, en: caseDraft.title },
      briefing: { uz: caseDraft.briefing || caseDraft.title, ru: caseDraft.briefing || caseDraft.title, en: caseDraft.briefing || caseDraft.title },
      artifacts: [
        {
          label: { uz: caseDraft.artifactLabel, ru: caseDraft.artifactLabel, en: caseDraft.artifactLabel },
          kind: 'LOG',
          content: caseDraft.artifactContent || 'Sample training artifact',
        },
      ],
      steps: [
        {
          id: 'step_1',
          prompt: { uz: caseDraft.prompt, ru: caseDraft.prompt, en: caseDraft.prompt },
          choices: [
            {
              id: 'opt_1',
              isOptimal: true,
              points: 100,
              label: { uz: caseDraft.optimalChoice, ru: caseDraft.optimalChoice, en: caseDraft.optimalChoice },
              feedback: { uz: 'To‘g‘ri qaror!', ru: 'Верное решение!', en: 'Optimal decision!' },
            },
            {
              id: 'opt_2',
              isOptimal: false,
              points: 20,
              label: {
                uz: caseDraft.suboptimalChoice || 'Dalillarsiz yopish',
                ru: caseDraft.suboptimalChoice || 'Закрыть дело без проверки',
                en: caseDraft.suboptimalChoice || 'Close case without forensic review',
              },
              feedback: { uz: 'To‘liq emas.', ru: 'Недостаточно эффективно.', en: 'Suboptimal approach.' },
            },
          ],
        },
      ],
      isCustom: true,
    };
    const next = [sc, ...customCases];
    setCustomCases(next);
    lsSetJSON('kj_admin_cases', next);
    setCaseDraft({
      code: 'SIM-CUSTOM-02',
      difficulty: 'middle',
      title: '',
      briefing: '',
      artifactLabel: 'Digital Log',
      artifactContent: '',
      prompt: '',
      optimalChoice: '',
      suboptimalChoice: '',
    });
    logActivity('admin', `Added simulator case ${sc.code}`);
    onToast(t('saved', lang));
  };

  const tabs: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'users', label: lang === 'ru' ? 'Пользователи и RBAC' : lang === 'en' ? 'Users & RBAC' : 'Foydalanuvchilar va RBAC', icon: Users },
    { id: 'audit', label: lang === 'ru' ? 'Журнал аудита' : lang === 'en' ? 'Audit Log' : 'Audit jurnali', icon: Activity },
    { id: 'security', label: lang === 'ru' ? 'Модель безопасности' : lang === 'en' ? 'Security Audit' : 'Xavfsizlik modeli', icon: ShieldCheck },
    { id: 'content', label: lang === 'ru' ? 'Материалы БЗ' : lang === 'en' ? 'KB Content' : 'Bilimlar bazasi', icon: BookPlus },
    { id: 'tests', label: lang === 'ru' ? 'Создание тестов' : lang === 'en' ? 'Test Creator' : 'Test tuzish', icon: Shield },
    { id: 'cases', label: lang === 'ru' ? 'Учебные кейсы' : lang === 'en' ? 'Training Cases' : 'Simulyator ishlari', icon: Sparkles },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        lang={lang}
        eyebrow={t('e_admin', lang)}
        title={t('p_admin', lang)}
        subtitle={
          lang === 'ru'
            ? 'Серверное управление 5 ведомственными ролями и подразделениями, матрица прав RBAC, неизменяемый журнал аудита, архитектура безопасности и конструктор учебных материалов.'
            : lang === 'en'
              ? 'Server-enforced 5-role & department RBAC, user provisioning, immutable audit log, security architecture documentation, and instructional content creators.'
              : 'Serverda himoyalangan 5 rolli RBAC, foydalanuvchilar, audit jurnali va xavfsizlik nazorati.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
      />

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-3">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                tab === tb.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] bg-[var(--panel)] text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* USERS & SERVER RBAC */}
      {tab === 'users' && (
        !permissions?.users_manage ? (
          <EmptyState
            title={tr(
              lang,
              'Foydalanuvchilarni boshqarish Administrator uchun ochiq',
              'Управление пользователями доступно Администратору',
              'User management is restricted to Administrators'
            )}
            description={tr(
              lang,
              `Sizning faol rolingiz (${roleLabel(currentUser?.role, lang)}) users_manage huquqiga ega emas. Server /api/admin/users so‘rovlarini 403 kodi bilan rad etadi.`,
              `Ваша активная роль (${roleLabel(currentUser?.role, lang)}) не имеет права users_manage. Сервер отклоняет запросы к /api/admin/users с кодом 403.`,
              `Your active role (${roleLabel(currentUser?.role, lang)}) lacks users_manage permission. The server rejects /api/admin/users with HTTP 403.`
            )}
          />
        ) : loadingUsers ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <form
                onSubmit={handleCreateUser}
                className="grid grid-cols-1 gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs sm:grid-cols-3"
              >
                <input
                  required
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                  placeholder={tr(lang, 'Xodim F.I.Sh.', 'ФИО сотрудника', 'Full name')}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                />
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  placeholder="officer@center.local"
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                />
                <input
                  required
                  minLength={8}
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  placeholder={tr(lang, 'Parol (kamida 8 belgi)', 'Пароль (мин. 8 символов)', 'Password (8+ chars)')}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                />
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, role: e.target.value as InstitutionalRole }))
                  }
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r, lang)}
                    </option>
                  ))}
                </select>
                <select
                  value={newUser.departmentId}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, departmentId: e.target.value as DepartmentId }))
                  }
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
                >
                  {DEPTS.map((d) => (
                    <option key={d} value={d}>
                      {deptLabel(d, lang)}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUser.badgeNumber}
                    onChange={(e) => setNewUser((p) => ({ ...p, badgeNumber: e.target.value }))}
                    placeholder="ID-102"
                    className="w-24 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2 font-mono"
                  />
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 font-bold text-[var(--accent-ink)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('add', lang)}</span>
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[10px] font-bold uppercase text-[var(--muted)]">
                      <th className="py-2 pr-3">{tr(lang, 'Xodim', 'Сотрудник', 'Officer')}</th>
                      <th className="py-2 pr-3">{tr(lang, 'Rol', 'Роль', 'Role')}</th>
                      <th className="py-2 pr-3">{tr(lang, 'Bo‘lim', 'Подразделение', 'Department')}</th>
                      <th className="py-2 text-right">{tr(lang, 'Holat', 'Статус', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {serverUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="py-2.5 pr-3">
                          <div className="font-bold text-[var(--text)]">
                            {u.name} <span className="font-mono text-[10px] text-[var(--accent)]">({u.badgeNumber})</span>
                          </div>
                          <div className="font-mono text-[10px] text-[var(--muted)]">{u.email}</div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handlePatchUser(u.id, { role: e.target.value as InstitutionalRole })
                            }
                            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[11px]"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r, lang)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 pr-3">
                          <select
                            value={u.departmentId}
                            onChange={(e) =>
                              handlePatchUser(u.id, {
                                departmentId: e.target.value as DepartmentId,
                              })
                            }
                            className="rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[11px]"
                          >
                            {DEPTS.map((d) => (
                              <option key={d} value={d}>
                                {deptLabel(d, lang)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handlePatchUser(u.id, {
                                status: u.status === 'active' ? 'suspended' : 'active',
                              })
                            }
                          >
                            <StatusBadge status={u.status} lang={lang} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Server RBAC Matrix */}
            {roleMatrix && (
              <aside className="max-h-[620px] space-y-3 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                  {tr(lang, 'Server RBAC huquqlar matritsasi', 'Серверная матрица прав RBAC', 'Server RBAC Permission Matrix')}
                </h3>
                {ROLES.map((role) => (
                  <div
                    key={role}
                    className="space-y-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3 text-[11px]"
                  >
                    <div className="font-mono font-bold uppercase text-[var(--accent)]">
                      {roleLabel(role, lang)}
                    </div>
                    {(Object.keys(roleMatrix[role]) as (keyof InstitutionalPermissionSet)[]).map(
                      (perm) => (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => handleTogglePerm(role, perm, !roleMatrix[role][perm])}
                          className="flex w-full items-center justify-between text-left hover:text-[var(--text)]"
                        >
                          <span className="font-mono">{perm}</span>
                          {roleMatrix[role][perm] ? (
                            <CheckSquare className="h-3.5 w-3.5 text-[var(--ok)]" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-[var(--muted)]" />
                          )}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </aside>
            )}
          </div>
        )
      )}

      {/* IMMUTABLE AUDIT LOG */}
      {tab === 'audit' && (
        !permissions?.audit_read ? (
          <EmptyState
            title={tr(lang, 'Audit jurnali cheklangan', 'Журнал аудита ограничен', 'Audit Log Restricted')}
            description={tr(
              lang,
              'Tizim audit jurnalini o‘qish faqat Administrator va Bo‘lim boshlig‘i uchun (o‘z bo‘limi doirasida) ochiq.',
              'Чтение системного журнала аудита доступно Администратору и Руководителю подразделения (в пределах подразделения).',
              'Reading the system audit log is restricted to Administrators and Department Heads (within their unit).'
            )}
          />
        ) : loadingAudit ? (
          <TableSkeleton rows={6} cols={4} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--line)] text-[10px] font-bold uppercase text-[var(--muted)]">
                  <th className="py-2 pr-3">{tr(lang, 'Vaqt (UTC)', 'Время (UTC)', 'Time (UTC)')}</th>
                  <th className="py-2 pr-3">{tr(lang, 'Subyekt / Rol', 'Субъект / Роль', 'Actor / Role')}</th>
                  <th className="py-2 pr-3">{tr(lang, 'Amal / Obyekt', 'Действие / Объект', 'Action / Resource')}</th>
                  <th className="py-2 pr-3">{tr(lang, 'Natija', 'Результат', 'Outcome')}</th>
                  <th className="py-2">{tr(lang, 'Tafsilotlar', 'Подробности', 'Details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--hover-bg)]">
                    <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-semibold text-[var(--text)]">
                        {localizeRecordText(log.actorName, lang)}
                      </span>{' '}
                      <span className="font-mono text-[10px] text-[var(--accent)]">
                        ({roleLabel(log.actorRole, lang)})
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-[var(--text)]">
                      {log.action} · {log.resourceId}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={log.outcome} lang={lang} />
                    </td>
                    <td className="py-2 text-[11px] text-[var(--secondary-text)]">
                      {localizeRecordText(log.details, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* SECURITY AUDIT & BOUNDARIES TAB */}
      {tab === 'security' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 text-xs">
          <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
              <Lock className="h-4 w-4 text-[var(--accent)]" />
              <span>
                {tr(
                  lang,
                  'Amalga oshirilgan himoya mexanizmlari',
                  'Реализованные механизмы защиты',
                  'Implemented Security Controls'
                )}
              </span>
            </div>
            <ul className="space-y-2 leading-relaxed text-[var(--secondary-text)]">
              {lang === 'uz' ? (
                <>
                  <li>• <b>Server autentifikatsiyasi va RBAC:</b> parollar individual tuz bilan crypto.scryptSync orqali xeshlanadi; tekshiruv — timingSafeEqual.</li>
                  <li>• <b>Sessiya tokenlari JS xotirasida:</b> HMAC-SHA256 Bearer-tokenlar localStorage yoki sessionStorage ichida SAQLANMAYDI.</li>
                  <li>• <b>Kirish huquqlarini cheklash (5 rol × 4 bo‘lim):</b> ishlar, dalillar, graf, qidiruv va hisobotlar serverda role, departmentId va accessLevel bo‘yicha filtrlanadi.</li>
                  <li>• <b>Dalillar butunligi:</b> SHA-256 Web Crypto API orqali hisoblanadi; qayta tekshiruv asl etalonni o‘zgartirmasdan solishtiradi.</li>
                  <li>• <b>OSINT va yuklash xavfsizligi:</b> xususiy/loopback IP manzillarni bloklash, 25 MB fayl limiti va path.basename nom normallashuvi.</li>
                </>
              ) : lang === 'en' ? (
                <>
                  <li>• <b>Server Authentication & RBAC:</b> passwords hashed via crypto.scryptSync with per-user salts and verified with timingSafeEqual.</li>
                  <li>• <b>In-Memory Session Tokens:</b> HMAC-SHA256 Bearer tokens are backed by a server session table and never written to localStorage/sessionStorage.</li>
                  <li>• <b>Scoped Access Control (5 roles × 4 departments):</b> cases, evidence, graph, search, and reports are filtered server-side by role, departmentId, and accessLevel.</li>
                  <li>• <b>Evidence Integrity:</b> SHA-256 digests computed via Web Crypto API; verification compares against immutable reference values.</li>
                  <li>• <b>OSINT & Upload Hardening:</b> private/loopback SSRF blocks, 25 MB upload cap, and path.basename filename sanitization.</li>
                </>
              ) : (
                <>
                  <li>• <b>Серверная аутентификация и RBAC:</b> пароли хешируются через `crypto.scryptSync` с индивидуальной солью; проверка — `timingSafeEqual`.</li>
                  <li>• <b>Токены сессий в памяти JS:</b> Bearer-токены с HMAC-SHA256 и серверной таблицей сессий НЕ сохраняются в `localStorage` или `sessionStorage`.</li>
                  <li>• <b>Разграничение доступа (5 ролей × 4 отдела):</b> доступ к делам, доказательствам, графу, поиску и отчётам фильтруется на сервере по `role`, `departmentId` и `accessLevel`.</li>
                  <li>• <b>Целостность доказательств:</b> SHA-256 вычисляется через Web Crypto API; повторная сверка сравнивает с эталоном, не перезаписывая оригинальный дайджест.</li>
                  <li>• <b>Безопасность OSINT и загрузок:</b> блокировка приватных/loopback IP, ограничение размера файлов (25 МБ) и нормализация имён файлов `path.basename`.</li>
                </>
              )}
            </ul>
          </section>

          <section className="space-y-3 rounded-xl border border-[var(--orange)]/40 bg-[var(--orange)]/10 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
              <ShieldCheck className="h-4 w-4 text-[var(--orange)]" />
              <span>
                {tr(
                  lang,
                  'Prototipning ochiq cheklovlari',
                  'Честные ограничения прототипа',
                  'Transparent Prototype Boundaries'
                )}
              </span>
            </div>
            <ul className="space-y-2 leading-relaxed text-[var(--text)]">
              {lang === 'uz' ? (
                <>
                  <li>• <b>Mahalliy fayl saqlash tizimi:</b> operatsion ishlar va audit jurnali server/data/store.json faylida saqlanadi (apparat HSM/WORM omborisiz).</li>
                  <li>• <b>Binar ombor o‘rniga metama’lumotlar:</b> dalillarni yuklashda kriptografik SHA-256 va fayl sarlavhalari qayd etiladi; xom disk obrazlari bulutga ko‘chirilmaydi.</li>
                  <li>• <b>Huquqiy ahamiyat doirasi:</b> tizimdagi elektron qayd etish metodik hisobga yordam beradi va JK/JPK protsessual hujjatlari yoki sud ekspertizasi o‘rnini bosmaydi.</li>
                </>
              ) : lang === 'en' ? (
                <>
                  <li>• <b>Local File Store:</b> operational cases and audit records are persisted in server/data/store.json rather than external hardware HSM/WORM storage.</li>
                  <li>• <b>Metadata Custody Registry:</b> uploads record cryptographic SHA-256 digests and magic headers; raw full-disk forensic images are not replicated externally.</li>
                  <li>• <b>Procedural Scope:</b> digital registry logging supports training and analytical tracking and does not substitute for formal Criminal Procedure rulings or court expert reports.</li>
                </>
              ) : (
                <>
                  <li>• <b>Локальное файловое хранилище:</b> операционные дела и аудит сохраняются в `server/data/store.json` (без внешней СУБД с аппаратным HSM/WORM-хранилищем).</li>
                  <li>• <b>Метаданные вместо бинарного СХД:</b> при загрузке доказательств фиксируются криптографический SHA-256 и заголовки файла; сырые бинарные образы дисков не реплицируются в облако.</li>
                  <li>• <b>Область юридической значимости:</b> электронная фиксация в системе помогает методическому учёту и не заменяет процессуальных документов УК/УПК или судебной экспертизы.</li>
                </>
              )}
            </ul>
          </section>
        </div>
      )}

      {/* PRESERVED KB / TESTS / SIMULATOR CREATORS */}
      {tab === 'content' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form onSubmit={handleAddKb} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[var(--text)]">
              {tr(
                lang,
                'Bilimlar bazasi 2.0 ga material qo‘shish',
                'Добавить материал в Базу знаний 2.0',
                'Add Material to Knowledge Base 2.0'
              )}
            </h3>
            <select
              value={kbDraft.category}
              onChange={(e) => setKbDraft((p) => ({ ...p, category: e.target.value as KBArticle['category'] }))}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
            >
              <option value="cybercrime">cybercrime</option>
              <option value="evidence">evidence</option>
              <option value="osint">osint</option>
              <option value="security">security</option>
              <option value="standards">standards</option>
              <option value="glossary">glossary</option>
            </select>
            <input type="text" value={kbDraft.title} onChange={(e) => setKbDraft((p) => ({ ...p, title: e.target.value }))} placeholder={tr(lang, 'Maqola sarlavhasi', 'Заголовок статьи', 'Article title')} className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2" />
            <input type="text" value={kbDraft.summary} onChange={(e) => setKbDraft((p) => ({ ...p, summary: e.target.value }))} placeholder={tr(lang, 'Qisqacha tavsif', 'Краткое описание', 'Short summary')} className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2" />
            <textarea rows={4} value={kbDraft.content} onChange={(e) => setKbDraft((p) => ({ ...p, content: e.target.value }))} placeholder={tr(lang, 'To‘liq matn...', 'Полный текст...', 'Full content...')} className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] p-3" />
            <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-ink)]">
              {t('save', lang)}
            </button>
          </form>
          <div className="space-y-2.5">
            {customKb.map((art) => (
              <div key={art.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs">
                <div>
                  <div className="font-mono font-bold text-[var(--accent)]">{art.category}</div>
                  <div className="font-bold text-[var(--text)]">{pickText(art.title, lang)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = customKb.filter((x) => x.id !== art.id);
                    setCustomKb(next);
                    lsSetJSON('kj_admin_kb', next);
                  }}
                  className="text-[var(--muted)] hover:text-[var(--red)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tests' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form onSubmit={handleAddTest} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[var(--text)]">
              {tr(
                lang,
                'Test markaziga savol qo‘shish',
                'Добавить вопрос в Центр тестирования',
                'Add Question to Test Center'
              )}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <select value={testDraft.difficulty} onChange={(e) => setTestDraft((p) => ({ ...p, difficulty: e.target.value as TestQuestion['difficulty'] }))} className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2">
                <option value="junior">junior</option>
                <option value="middle">middle</option>
                <option value="senior">senior</option>
              </select>
              <select value={testDraft.category} onChange={(e) => setTestDraft((p) => ({ ...p, category: e.target.value as TestQuestion['category'] }))} className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2">
                <option value="qualification">qualification</option>
                <option value="forensics">forensics</option>
                <option value="osint">osint</option>
                <option value="law">law</option>
              </select>
            </div>
            <input type="text" value={testDraft.question} onChange={(e) => setTestDraft((p) => ({ ...p, question: e.target.value }))} placeholder={tr(lang, 'Savol matni', 'Текст вопроса', 'Question text')} className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={testDraft.opt0} onChange={(e) => setTestDraft((p) => ({ ...p, opt0: e.target.value }))} placeholder="A" className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5" />
              <input type="text" value={testDraft.opt1} onChange={(e) => setTestDraft((p) => ({ ...p, opt1: e.target.value }))} placeholder="B" className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5" />
              <input type="text" value={testDraft.opt2} onChange={(e) => setTestDraft((p) => ({ ...p, opt2: e.target.value }))} placeholder="C" className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5" />
              <input type="text" value={testDraft.opt3} onChange={(e) => setTestDraft((p) => ({ ...p, opt3: e.target.value }))} placeholder="D" className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5" />
            </div>
            <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-ink)]">
              {t('save', lang)}
            </button>
          </form>
          <div className="space-y-2.5">
            {customTests.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs">
                <div>
                  <div className="font-mono font-bold text-[var(--accent)]">{q.difficulty} · {q.category}</div>
                  <div className="font-semibold text-[var(--text)]">{pickText(q.question, lang)}</div>
                </div>
                <button type="button" onClick={() => { const next = customTests.filter((x) => x.id !== q.id); setCustomTests(next); lsSetJSON('kj_admin_tests', next); }} className="text-[var(--muted)] hover:text-[var(--red)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'cases' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form onSubmit={handleAddCase} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[var(--text)]">
              {tr(
                lang,
                'Simulyatorga o‘quv keys qo‘shish',
                'Добавить учебный кейс в Симулятор',
                'Add Training Case to Simulator'
              )}
            </h3>
            <input type="text" value={caseDraft.code} onChange={(e) => setCaseDraft((p) => ({ ...p, code: e.target.value }))} placeholder="SIM-CUSTOM-01" className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono" />
            <input type="text" value={caseDraft.title} onChange={(e) => setCaseDraft((p) => ({ ...p, title: e.target.value }))} placeholder={tr(lang, 'Keys nomi', 'Название кейса', 'Case title')} className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2" />
            <input type="text" value={caseDraft.prompt} onChange={(e) => setCaseDraft((p) => ({ ...p, prompt: e.target.value }))} placeholder={tr(lang, 'Harakatlar taktikasi bo‘yicha savol', 'Вопрос по тактике действий', 'Investigative prompt question')} className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2" />
            <input type="text" value={caseDraft.optimalChoice} onChange={(e) => setCaseDraft((p) => ({ ...p, optimalChoice: e.target.value }))} placeholder={tr(lang, 'Eng maqbul harakat', 'Оптимальное действие', 'Optimal choice')} className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2" />
            <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-ink)]">
              {t('save', lang)}
            </button>
          </form>
          <div className="space-y-2.5">
            {customCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs">
                <div>
                  <div className="font-mono font-bold text-[var(--accent)]">{c.code}</div>
                  <div className="font-bold text-[var(--text)]">{pickText(c.title, lang)}</div>
                </div>
                <button type="button" onClick={() => { const next = customCases.filter((x) => x.id !== c.id); setCustomCases(next); lsSetJSON('kj_admin_cases', next); }} className="text-[var(--muted)] hover:text-[var(--red)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
