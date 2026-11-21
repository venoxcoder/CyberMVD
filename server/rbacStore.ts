import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AccessLevel,
  AuditLogEntry,
  CaseRecord,
  CaseStatus,
  DepartmentId,
  EvidenceRecord,
  GraphEdge,
  GraphNode,
  InstitutionalPermissionSet,
  InstitutionalRole,
  InstitutionalUser,
} from '../src/types';

export interface StoredUserRecord extends InstitutionalUser {
  passwordHash: string;
}

export interface StoredReportRecord {
  id: string;
  caseId?: string;
  caseNumber: string;
  departmentId: DepartmentId;
  accessLevel: AccessLevel;
  title: string;
  template: 'incident' | 'evidence' | 'investigation';
  authorId: string;
  authorName: string;
  createdAt: string;
  summary: string;
}

export interface PlatformStore {
  version: number;
  bootstrapClaimed: boolean;
  users: StoredUserRecord[];
  rolePermissions: Record<InstitutionalRole, InstitutionalPermissionSet>;
  cases: CaseRecord[];
  evidence: EvidenceRecord[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  reports: StoredReportRecord[];
  auditLog: AuditLogEntry[];
}

export interface SessionRecord {
  tokenId: string;
  userId: string;
  expiresAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const STORE_FILE = path.resolve(DATA_DIR, 'store.json');

if (!STORE_FILE.startsWith(DATA_DIR + path.sep)) {
  throw new Error('Invalid store file path boundary');
}

const EPHEMERAL_SIGNING_KEY = crypto.randomBytes(32);
function getSigningKey(): Buffer | string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : EPHEMERAL_SIGNING_KEY;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hexHash, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export const DEFAULT_ROLE_MATRIX: Record<InstitutionalRole, InstitutionalPermissionSet> = {
  admin: {
    cases_read: true,
    cases_create: true,
    cases_update: true,
    cases_delete: true,
    cases_change_status: true,
    evidence_read: true,
    evidence_create: true,
    evidence_verify: true,
    evidence_transfer: true,
    documents_create: true,
    reports_export: true,
    ai_use: true,
    osint_use: true,
    graph_edit: true,
    audit_read: true,
    users_manage: true,
    rbac_manage: true,
  },
  department_head: {
    cases_read: true,
    cases_create: true,
    cases_update: true,
    cases_delete: false,
    cases_change_status: true,
    evidence_read: true,
    evidence_create: true,
    evidence_verify: true,
    evidence_transfer: true,
    documents_create: true,
    reports_export: true,
    ai_use: true,
    osint_use: true,
    graph_edit: true,
    audit_read: true,
    users_manage: false,
    rbac_manage: false,
  },
  officer: {
    cases_read: true,
    cases_create: true,
    cases_update: true,
    cases_delete: false,
    cases_change_status: false,
    evidence_read: true,
    evidence_create: true,
    evidence_verify: true,
    evidence_transfer: true,
    documents_create: true,
    reports_export: true,
    ai_use: true,
    osint_use: true,
    graph_edit: true,
    audit_read: false,
    users_manage: false,
    rbac_manage: false,
  },
  analyst: {
    cases_read: true,
    cases_create: false,
    cases_update: false,
    cases_delete: false,
    cases_change_status: false,
    evidence_read: true,
    evidence_create: false,
    evidence_verify: true,
    evidence_transfer: false,
    documents_create: true,
    reports_export: true,
    ai_use: true,
    osint_use: true,
    graph_edit: true,
    audit_read: false,
    users_manage: false,
    rbac_manage: false,
  },
  observer: {
    cases_read: true,
    cases_create: false,
    cases_update: false,
    cases_delete: false,
    cases_change_status: false,
    evidence_read: false,
    evidence_create: false,
    evidence_verify: false,
    evidence_transfer: false,
    documents_create: false,
    reports_export: false,
    ai_use: false,
    osint_use: false,
    graph_edit: false,
    audit_read: false,
    users_manage: false,
    rbac_manage: false,
  },
};

function createInitialStore(): PlatformStore {
  const now = new Date().toISOString();
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

  const cases: CaseRecord[] = [
    {
      id: 'case_trn_014',
      caseNumber: 'TRN-2026-014',
      title: 'Учебный кейс: распространение вредоносного APK под видом налогового уведомления',
      kind: 'training',
      category: 'apk_fraud',
      createdAt: daysAgo(12),
      updatedAt: daysAgo(1),
      status: 'in_progress',
      departmentId: 'dept_cyber',
      assignedOfficer: 'Учебная группа А-1',
      assignedUserIds: [],
      accessLevel: 'training',
      relatedArticleId: 'a169',
      relatedMethodId: 'm_apk',
      summary:
        'Моделируемый учебный инцидент по перехвату OTP-кодов через Android-троян (Soliq_Qarzdorlik_2026.apk) с последующим выводом средств на транзитную карту.',
      qualificationNotes: 'ст. 169 ч. 3 п. «б» + ст. 278-6 УК РУз (учебная фабула).',
      timeline: [
        {
          id: 'tl_1',
          timestamp: daysAgo(12),
          description: 'Заявитель получил файл Soliq_Qarzdorlik_2026.apk в мессенджере Telegram.',
          source: 'Опрос заявителя (учебный сценарий)',
          severity: 'info',
          authorName: 'Методический центр',
        },
        {
          id: 'tl_2',
          timestamp: daysAgo(11),
          description: 'Обнаружено исходящее соединение на узел 185.220.101.44:8443 и запрос RECEIVE_SMS.',
          source: 'Песочница / Статический анализ APK',
          severity: 'critical',
          authorName: 'Лаборатория КТЭ',
        },
        {
          id: 'tl_3',
          timestamp: daysAgo(9),
          description: 'Зафиксирован перевод через P2P-шлюз; сформирован запрос на заморозку транзакции.',
          source: 'Антифрод-журнал (модель)',
          severity: 'warning',
          authorName: 'Отдел расследований',
        },
      ],
      entities: [
        {
          id: 'ent_1',
          type: 'domain',
          label: 'soliq-portal-verify.example',
          roleOrContext: 'Фишинговая страница загрузки APK (учебный индикатор)',
          confidence: 'confirmed',
          source: 'Static APK Manifest',
          addedAt: daysAgo(11),
        },
        {
          id: 'ent_2',
          type: 'ip',
          label: '185.220.101.44',
          roleOrContext: 'Предполагаемый C2-сервер сбора SMS',
          confidence: 'indirect',
          source: 'PCAP Sandbox Trace',
          addedAt: daysAgo(10),
        },
        {
          id: 'ent_3',
          type: 'participant',
          label: 'Условный дроп-аккаунт #D-402',
          roleOrContext: 'Транзитный получатель в учебном сценарии',
          confidence: 'hypothesis',
          source: 'Межбанковская сверка (учебн.)',
          addedAt: daysAgo(8),
        },
      ],
      materials: [
        {
          id: 'mat_1',
          title: 'Протокол осмотра мобильного устройства (учебный образец)',
          fileName: 'protocol_device_014.pdf',
          mimeType: 'application/pdf',
          fileSize: 248320,
          sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
          source: 'Учебный стенд мобильной криминалистики',
          receivedAt: daysAgo(11),
          verificationStatus: 'verified',
          uploadedBy: 'Методический центр',
          notes: 'Контрольная сумма подтверждена при передаче.',
        },
      ],
      tasks: [
        {
          id: 'tsk_1',
          title: 'Сопоставить сертификат подписи APK с базой серийных инцидентов',
          assignee: 'Дежурный аналитик',
          dueDate: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10),
          priority: 'high',
          status: 'in_progress',
          createdAt: daysAgo(6),
        },
        {
          id: 'tsk_2',
          title: 'Подготовить перечень вопросов для КТЭ экспертизы',
          assignee: 'Следователь-стажёр',
          dueDate: new Date(Date.now() + 4 * 86400_000).toISOString().slice(0, 10),
          priority: 'medium',
          status: 'todo',
          createdAt: daysAgo(5),
        },
      ],
      linkedReportIds: ['rep_trn_1'],
      history: [
        {
          id: 'hist_1',
          timestamp: daysAgo(12),
          actorId: 'system',
          actorName: 'Система инициализации',
          actorRole: 'admin',
          action: 'created_case',
          details: 'Создано учебное дело TRN-2026-014 (уровень доступа: training).',
        },
      ],
    },
    {
      id: 'case_trn_021',
      caseNumber: 'TRN-2026-021',
      title: 'Учебный кейс: нелегальный SIM-Box шлюз и подмена вызовов',
      kind: 'training',
      category: 'simbox',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(2),
      status: 'pending_review',
      departmentId: 'dept_osint',
      assignedOfficer: 'Группа OSINT-2',
      assignedUserIds: [],
      accessLevel: 'training',
      relatedArticleId: 'a2782',
      summary:
        'Учебное исследование аномалий CDR-логов базовых станций при маршрутизации VoIP-трафика через многослотовый GSM-шлюз.',
      qualificationNotes: 'ст. 278-2 / ст. 278-7 УК РУз (учебная симуляция).',
      timeline: [
        {
          id: 'tl_21_1',
          timestamp: daysAgo(7),
          description: 'Выявлена концентрация 420 исходящих вызовов с одного IMEI-пула за 2 часа.',
          source: 'Телеком-мониторинг (учебн.)',
          severity: 'warning',
          authorName: 'Аналитический центр',
        },
      ],
      entities: [
        {
          id: 'ent_21_1',
          type: 'organization',
          label: 'Учебный VoIP-агрегатор Node-7',
          roleOrContext: 'Точка входа SIP-трафика (модель)',
          confidence: 'confirmed',
          source: 'SIP Header Trace',
          addedAt: daysAgo(6),
        },
      ],
      materials: [],
      tasks: [
        {
          id: 'tsk_21_1',
          title: 'Проверить IMEI-связку и сектор базовой станции БС-114',
          assignee: 'Аналитик OSINT',
          dueDate: new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10),
          priority: 'high',
          status: 'todo',
          createdAt: daysAgo(4),
        },
      ],
      linkedReportIds: [],
      history: [
        {
          id: 'hist_21_1',
          timestamp: daysAgo(7),
          actorId: 'system',
          actorName: 'Система инициализации',
          actorRole: 'admin',
          action: 'created_case',
          details: 'Создано учебное дело TRN-2026-021.',
        },
      ],
    },
    {
      id: 'case_wrk_108',
      caseNumber: 'WRK-2026-108',
      title: 'Ведомственная проверка: компрометация корпоративного почтового шлюза',
      kind: 'working',
      category: 'data_breach',
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
      status: 'open',
      departmentId: 'dept_cyber',
      assignedOfficer: 'Отдел киберрасследований №1',
      assignedUserIds: [],
      accessLevel: 'department',
      relatedArticleId: 'a2781',
      summary:
        'Служебная проверка несанкционированного доступа к журналу аутентификации и подозрительного экспорта адресной книги.',
      qualificationNotes: 'Предварительная оценка по ст. 278-1, 278-3 УК РУз.',
      timeline: [
        {
          id: 'tl_108_1',
          timestamp: daysAgo(4),
          description: 'Зафиксирована попытка входа вне рабочего времени с IP 91.214.124.19.',
          source: 'SIEM Auth Log',
          severity: 'critical',
          authorName: 'Дежурная смена',
        },
      ],
      entities: [
        {
          id: 'ent_108_1',
          type: 'ip',
          label: '91.214.124.19',
          roleOrContext: 'Источник аномальной сессии SSH/IMAP',
          confidence: 'confirmed',
          source: 'SIEM Firewall Log',
          addedAt: daysAgo(3),
        },
      ],
      materials: [],
      tasks: [
        {
          id: 'tsk_108_1',
          title: 'Зафиксировать дамп логов nginx и почтового ретранслятора с SHA-256',
          assignee: 'Специалист КТЭ',
          dueDate: new Date(Date.now() + 1 * 86400_000).toISOString().slice(0, 10),
          priority: 'high',
          status: 'todo',
          createdAt: daysAgo(3),
        },
      ],
      linkedReportIds: [],
      history: [
        {
          id: 'hist_108_1',
          timestamp: daysAgo(4),
          actorId: 'system',
          actorName: 'Система инициализации',
          actorRole: 'admin',
          action: 'created_case',
          details: 'Создано рабочее дело WRK-2026-108 (доступ: отдел dept_cyber).',
        },
      ],
    },
  ];

  const evidence: EvidenceRecord[] = [
    {
      id: 'EV-2026-001',
      caseId: 'case_trn_014',
      caseNumber: 'TRN-2026-014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      name: 'Soliq_Qarzdorlik_2026.apk (учебный образец)',
      fileType: 'application/vnd.android.package-archive',
      fileSize: 4812940,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      receivedAt: daysAgo(11),
      source: 'Учебный стенд / Дамп кэша Telegram',
      custodian: 'Лаборатория КТЭ',
      sealNumber: 'SEAL-TRN-1041',
      storageLocation: 'Изолированное хранилище стенда №1',
      verificationStatus: 'verified',
      metadata: {
        mimeType: 'application/vnd.android.package-archive',
        magicHeader: '50 4B 03 04 (ZIP/APK)',
        extractedSummary: 'Разрешения: RECEIVE_SMS, READ_SMS, BIND_ACCESSIBILITY_SERVICE',
      },
      workingCopyNotes: 'Рабочая копия #WC-01: выделен C2-адрес 185.220.101.44 в classes.dex.',
      workingCopyUpdatedAt: daysAgo(9),
      custodyHistory: [
        {
          id: 'COC-101',
          evidenceId: 'EV-2026-001',
          timestamp: daysAgo(11),
          fromPerson: 'Дежурный инспектор',
          toPerson: 'Лаборатория КТЭ',
          purpose: 'Первичная фиксация и статический анализ',
          hashVerified: true,
        },
      ],
      accessLog: [
        {
          id: 'eal_1',
          timestamp: daysAgo(11),
          actorName: 'Методический центр',
          actorRole: 'admin',
          action: 'registered',
          details: 'Первичная регистрация учебного образца и расчёт SHA-256.',
        },
      ],
    },
    {
      id: 'EV-2026-002',
      caseId: 'case_wrk_108',
      caseNumber: 'WRK-2026-108',
      departmentId: 'dept_cyber',
      accessLevel: 'department',
      name: 'mail_gateway_auth_2026_11.log',
      fileType: 'text/plain',
      fileSize: 842110,
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      receivedAt: daysAgo(3),
      source: 'Почтовый шлюз (экспорт syslog)',
      custodian: 'Отдел киберрасследований №1',
      sealNumber: 'SEAL-WRK-2088',
      storageLocation: 'Секция вещественных носителей Б-2',
      verificationStatus: 'pending',
      metadata: {
        mimeType: 'text/plain',
        magicHeader: 'ASCII/UTF-8 text log',
        extractedSummary: '1 420 строк журнала аутентификации IMAP/SSH',
      },
      workingCopyNotes: 'Ожидает сверки временных меток с внешним прокси.',
      workingCopyUpdatedAt: daysAgo(2),
      custodyHistory: [
        {
          id: 'COC-102',
          evidenceId: 'EV-2026-002',
          timestamp: daysAgo(3),
          fromPerson: 'Администратор ИБ',
          toPerson: 'Отдел киберрасследований №1',
          purpose: 'Проверка аномальной сессии',
          hashVerified: true,
        },
      ],
      accessLog: [
        {
          id: 'eal_2',
          timestamp: daysAgo(3),
          actorName: 'Дежурная смена',
          actorRole: 'officer',
          action: 'registered',
          details: 'Журнал помещён на проверку целостности.',
        },
      ],
    },
  ];

  const graphNodes: GraphNode[] = [
    {
      id: 'gn_case_14',
      type: 'case',
      label: 'TRN-2026-014',
      subtitle: 'APK-фишинг (учебное дело)',
      caseId: 'case_trn_014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      x: 420,
      y: 220,
      attributes: { Статус: 'В работе', Категория: 'APK-мошенничество' },
    },
    {
      id: 'gn_ev_1',
      type: 'evidence',
      label: 'EV-2026-001',
      subtitle: 'Soliq_Qarzdorlik_2026.apk',
      caseId: 'case_trn_014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      x: 210,
      y: 130,
      attributes: { SHA256: 'e3b0c442...', Пломба: 'SEAL-TRN-1041' },
    },
    {
      id: 'gn_dom_1',
      type: 'domain',
      label: 'soliq-portal-verify.example',
      subtitle: 'Домен распространения APK',
      caseId: 'case_trn_014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      x: 640,
      y: 120,
      attributes: { Регистратор: 'Учебный стенд RDAP' },
    },
    {
      id: 'gn_ip_1',
      type: 'ip',
      label: '185.220.101.44',
      subtitle: 'C2-узел перехвата OTP',
      caseId: 'case_trn_014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      x: 660,
      y: 310,
      attributes: { Порт: '8443/TCP', ASN: 'Учебный узел' },
    },
    {
      id: 'gn_evt_1',
      type: 'event',
      label: 'Перехват OTP SMS',
      subtitle: '14:04 UTC (учебн.)',
      caseId: 'case_trn_014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      x: 220,
      y: 330,
      attributes: { Источник: 'TelephonyProvider' },
    },
    {
      id: 'gn_part_1',
      type: 'participant',
      label: 'Условный аккаунт #D-402',
      subtitle: 'Участник учебного сценария',
      caseId: 'case_trn_014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      x: 420,
      y: 410,
      attributes: { Роль: 'Гипотетический транзитный получатель' },
    },
    {
      id: 'gn_case_108',
      type: 'case',
      label: 'WRK-2026-108',
      subtitle: 'Проверка почтового шлюза',
      caseId: 'case_wrk_108',
      departmentId: 'dept_cyber',
      accessLevel: 'department',
      x: 160,
      y: 230,
      attributes: { Статус: 'Открыто', Доступ: 'Подразделение' },
    },
    {
      id: 'gn_ip_108',
      type: 'ip',
      label: '91.214.124.19',
      subtitle: 'Аномальная SSH/IMAP сессия',
      caseId: 'case_wrk_108',
      departmentId: 'dept_cyber',
      accessLevel: 'department',
      x: 340,
      y: 90,
      attributes: { Источник: 'SIEM Auth Log' },
    },
  ];

  const graphEdges: GraphEdge[] = [
    {
      id: 'ge_1',
      sourceId: 'gn_case_14',
      targetId: 'gn_ev_1',
      relation: 'приобщено как доказательство',
      source: 'Реестр доказательств',
      establishedAt: daysAgo(11),
      confidence: 'confirmed',
      caseId: 'case_trn_014',
    },
    {
      id: 'ge_2',
      sourceId: 'gn_ev_1',
      targetId: 'gn_dom_1',
      relation: 'загружен с домена',
      source: 'Статический анализ APK / URL в браузере',
      establishedAt: daysAgo(11),
      confidence: 'confirmed',
      caseId: 'case_trn_014',
    },
    {
      id: 'ge_3',
      sourceId: 'gn_ev_1',
      targetId: 'gn_ip_1',
      relation: 'передача телеметрии/SMS',
      source: 'Песочница PCAP',
      establishedAt: daysAgo(10),
      confidence: 'confirmed',
      caseId: 'case_trn_014',
    },
    {
      id: 'ge_4',
      sourceId: 'gn_evt_1',
      targetId: 'gn_ip_1',
      relation: 'совпадение по времени',
      source: 'Корреляция таймлайна',
      establishedAt: daysAgo(9),
      confidence: 'indirect',
      caseId: 'case_trn_014',
    },
    {
      id: 'ge_5',
      sourceId: 'gn_evt_1',
      targetId: 'gn_part_1',
      relation: 'аналитическая гипотеза маршрута',
      source: 'Рабочая версия аналитика (требует банковского подтверждения)',
      establishedAt: daysAgo(8),
      confidence: 'hypothesis',
      caseId: 'case_trn_014',
    },
    {
      id: 'ge_6',
      sourceId: 'gn_case_108',
      targetId: 'gn_ip_108',
      relation: 'зафиксирован в SIEM-логе',
      source: 'SIEM Auth Log',
      establishedAt: daysAgo(4),
      confidence: 'confirmed',
      caseId: 'case_wrk_108',
    },
  ];

  const reports: StoredReportRecord[] = [
    {
      id: 'rep_trn_1',
      caseId: 'case_trn_014',
      caseNumber: 'TRN-2026-014',
      departmentId: 'dept_cyber',
      accessLevel: 'training',
      title: 'Предварительный отчёт по учебному инциденту TRN-2026-014',
      template: 'incident',
      authorId: 'system',
      authorName: 'Методический центр',
      createdAt: daysAgo(5),
      summary: 'Сводка по статическому анализу учебного APK и выделению индикаторов компрометации.',
    },
  ];

  const auditLog: AuditLogEntry[] = [
    {
      id: 'aud_init_1',
      timestamp: now,
      actorId: 'system',
      actorName: 'Система инициализации',
      actorRole: 'admin',
      departmentId: 'dept_oversight',
      action: 'store_initialized',
      resourceType: 'admin',
      resourceId: 'store',
      outcome: 'success',
      details: 'Инициализировано ведомственное хранилище с разграничением прав RBAC.',
    },
  ];

  return {
    version: 1,
    bootstrapClaimed: false,
    users: [],
    rolePermissions: JSON.parse(JSON.stringify(DEFAULT_ROLE_MATRIX)),
    cases,
    evidence,
    graphNodes,
    graphEdges,
    reports,
    auditLog,
  };
}

let cachedStore: PlatformStore | null = null;
const activeSessions = new Map<string, SessionRecord>();

export function loadStore(): PlatformStore {
  if (cachedStore) return cachedStore;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as PlatformStore;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.cases)) {
        cachedStore = parsed;
        return cachedStore;
      }
    }
  } catch (err) {
    console.error('Failed to read store.json, initializing fresh store:', err);
  }
  cachedStore = createInitialStore();
  saveStore(cachedStore);
  return cachedStore;
}

export function saveStore(store: PlatformStore): void {
  cachedStore = store;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = path.resolve(DATA_DIR, `store.${process.pid}.tmp.json`);
  if (!tmpFile.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid temporary store path');
  }
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpFile, STORE_FILE);
}

export function sanitizeUser(u: StoredUserRecord): InstitutionalUser {
  const { passwordHash: _omit, ...safe } = u;
  return safe;
}

export function issueSessionToken(userId: string): string {
  const tokenId = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12h
  activeSessions.set(tokenId, { tokenId, userId, expiresAt });
  const payload = `${tokenId}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): StoredUserRecord | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [tokenId, expStr, sig] = parts;
  const payload = `${tokenId}.${expStr}`;
  const expectedSig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const session = activeSessions.get(tokenId);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(tokenId);
    return null;
  }
  const store = loadStore();
  const user = store.users.find((u) => u.id === session.userId && u.status === 'active');
  return user || null;
}

export function revokeSessionToken(token: string): void {
  const parts = token.split('.');
  if (parts[0]) activeSessions.delete(parts[0]);
}

export function appendAuditLog(
  store: PlatformStore,
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): void {
  const item: AuditLogEntry = {
    id: `aud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  store.auditLog.unshift(item);
  if (store.auditLog.length > 1000) {
    store.auditLog = store.auditLog.slice(0, 1000);
  }
}

export function getUserPermissions(
  store: PlatformStore,
  user: InstitutionalUser
): InstitutionalPermissionSet {
  return store.rolePermissions[user.role] || DEFAULT_ROLE_MATRIX.observer;
}

export function canAccessCase(
  store: PlatformStore,
  user: InstitutionalUser,
  c: CaseRecord,
  op: 'read' | 'update' | 'delete' | 'change_status'
): boolean {
  const perms = getUserPermissions(store, user);
  if (op === 'read' && !perms.cases_read) return false;
  if (op === 'update' && !perms.cases_update) return false;
  if (op === 'delete' && !perms.cases_delete) return false;
  if (op === 'change_status' && !perms.cases_change_status) return false;

  if (user.role === 'admin') return true;

  if (user.role === 'observer') {
    return op === 'read' && c.kind === 'training' && c.accessLevel === 'training';
  }

  // Confidential cases require explicit assignment or same-department head
  if (c.accessLevel === 'confidential') {
    const assigned = c.assignedUserIds.includes(user.id);
    const isDeptHead = user.role === 'department_head' && user.departmentId === c.departmentId;
    return assigned || isDeptHead;
  }

  // Restricted cases require explicit assignment or department_head in same dept
  if (c.accessLevel === 'restricted') {
    const assigned = c.assignedUserIds.includes(user.id);
    const isDeptHead = user.role === 'department_head' && user.departmentId === c.departmentId;
    return assigned || isDeptHead;
  }

  // Training cases are readable by all authenticated staff, editable by department/admin/assigned officer
  if (c.kind === 'training' && c.accessLevel === 'training') {
    if (op === 'read') return true;
    return c.departmentId === user.departmentId || c.assignedUserIds.includes(user.id);
  }

  // Working department cases: accessible to users in the same department or explicitly assigned
  if (c.departmentId === user.departmentId || c.assignedUserIds.includes(user.id)) {
    return true;
  }

  return false;
}

export function canAccessEvidence(
  store: PlatformStore,
  user: InstitutionalUser,
  ev: EvidenceRecord,
  op: 'read' | 'verify' | 'transfer' | 'working_copy'
): boolean {
  const perms = getUserPermissions(store, user);
  if (op === 'read' && !perms.evidence_read) return false;
  if (op === 'verify' && !perms.evidence_verify) return false;
  if (op === 'transfer' && !perms.evidence_transfer) return false;
  if (op === 'working_copy' && !perms.evidence_verify && !perms.evidence_create) return false;

  if (user.role === 'admin') return true;
  if (user.role === 'observer') return false;

  const linkedCase = store.cases.find((c) => c.id === ev.caseId);
  if (linkedCase) {
    return canAccessCase(store, user, linkedCase, op === 'read' ? 'read' : 'update');
  }

  if (ev.accessLevel === 'training') return true;
  return ev.departmentId === user.departmentId;
}

export function isValidStatusTransition(from: CaseStatus, to: CaseStatus): boolean {
  const allowed: CaseStatus[] = ['open', 'in_progress', 'pending_review', 'closed', 'archived'];
  return allowed.includes(to) && from !== to;
}
