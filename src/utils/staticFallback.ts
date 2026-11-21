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
} from '../types';

export const STATIC_ROLE_MATRIX: Record<InstitutionalRole, InstitutionalPermissionSet> = {
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
    ai_use: false,
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
    ai_use: false,
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
    ai_use: false,
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
    ai_use: false,
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

interface StaticReportRecord {
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

interface StaticStore {
  users: InstitutionalUser[];
  rolePermissions: Record<InstitutionalRole, InstitutionalPermissionSet>;
  cases: CaseRecord[];
  evidence: EvidenceRecord[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  reports: StaticReportRecord[];
  auditLog: AuditLogEntry[];
}

const STORAGE_KEY = 'kj_static_workspace_v1';

function createInitialStaticStore(): StaticStore {
  const now = new Date().toISOString();
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

  const defaultAdmin: InstitutionalUser = {
    id: 'usr_static_admin',
    name: 'Demo Administrator',
    email: 'admin@kiber.local',
    role: 'admin',
    departmentId: 'dept_cyber',
    badgeNumber: 'ADM-001',
    status: 'active',
    createdAt: daysAgo(15),
    lastActive: now,
  };

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

  const reports: StaticReportRecord[] = [
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
    users: [defaultAdmin],
    rolePermissions: JSON.parse(JSON.stringify(STATIC_ROLE_MATRIX)),
    cases,
    evidence,
    graphNodes,
    graphEdges,
    reports,
    auditLog,
  };
}

function loadStaticStore(): StaticStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StaticStore;
      if (parsed && Array.isArray(parsed.cases)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  const fresh = createInitialStaticStore();
  saveStaticStore(fresh);
  return fresh;
}

function saveStaticStore(store: StaticStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

export function createStaticDemoUser(
  role: InstitutionalRole = 'admin',
  overrides?: Partial<InstitutionalUser>
): { user: InstitutionalUser; permissions: InstitutionalPermissionSet } {
  const store = loadStaticStore();
  const user: InstitutionalUser = {
    id: overrides?.id || 'usr_static_admin',
    name: overrides?.name || 'Demo Administrator',
    email: overrides?.email || 'admin@kiber.local',
    role,
    departmentId: overrides?.departmentId || 'dept_cyber',
    badgeNumber: overrides?.badgeNumber || 'ADM-001',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  if (!store.users.some((u) => u.email === user.email)) {
    store.users.push(user);
    saveStaticStore(store);
  }
  return { user, permissions: store.rolePermissions[role] || STATIC_ROLE_MATRIX[role] };
}

export function handleStaticApi<T = unknown>(
  url: string,
  init: RequestInit = {},
  currentUser: InstitutionalUser | null
): T {
  const store = loadStaticStore();
  const method = (init.method || 'GET').toUpperCase();
  const [pathname, queryStr] = url.split('?');
  const params = new URLSearchParams(queryStr || '');
  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  const user = currentUser || store.users[0];

  // Dashboard summary
  if (pathname === '/api/dashboard/summary') {
    const period = params.get('period') || '30d';
    const filterCat = params.get('category') || 'all';
    const filterStatus = params.get('status') || 'all';
    const nowMs = Date.now();
    const periodMs =
      period === '7d'
        ? 7 * 86400_000
        : period === '30d'
          ? 30 * 86400_000
          : period === '90d'
            ? 90 * 86400_000
            : Number.POSITIVE_INFINITY;

    const filteredCases = store.cases.filter((c) => {
      if (filterCat !== 'all' && c.category !== filterCat) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (Number.isFinite(periodMs)) {
        if (nowMs - new Date(c.createdAt).getTime() > periodMs) return false;
      }
      return true;
    });

    const buckets = new Map<string, { working: number; training: number }>();
    const days = period === '7d' ? 7 : 14;
    for (let i = days - 1; i >= 0; i--) {
      buckets.set(new Date(nowMs - i * 86400_000).toISOString().slice(0, 10), {
        working: 0,
        training: 0,
      });
    }
    for (const c of filteredCases) {
      const b = buckets.get(c.createdAt.slice(0, 10));
      if (b) {
        if (c.kind === 'working') b.working += 1;
        else b.training += 1;
      }
    }

    const catMap = new Map<string, number>();
    const stMap = new Map<string, number>();
    for (const c of filteredCases) {
      catMap.set(c.category, (catMap.get(c.category) || 0) + 1);
      stMap.set(c.status, (stMap.get(c.status) || 0) + 1);
    }

    const pendingTasks = filteredCases
      .flatMap((c) =>
        c.tasks
          .filter((tk) => tk.status !== 'done')
          .map((tk) => ({ ...tk, caseId: c.id, caseNumber: c.caseNumber }))
      )
      .slice(0, 8);

    const pendingEvidenceCount = store.evidence.filter((e) => e.verificationStatus === 'pending').length;

    return {
      systemStatus: {
        operational: true,
        aiConfigured: false,
        authEnforced: true,
        role: user.role,
        departmentId: user.departmentId,
      },
      metrics: {
        accessibleTotal: filteredCases.length,
        trainingCasesCount: filteredCases.filter((c) => c.kind === 'training').length,
        workingCasesCount: filteredCases.filter((c) => c.kind === 'working').length,
        pendingMaterialsCount:
          filteredCases.filter((c) => c.status === 'pending_review').length + pendingEvidenceCount,
        pendingEvidenceCount,
        evidenceTotal: store.evidence.length,
        openTasksCount: pendingTasks.length,
      },
      dynamics: Array.from(buckets.entries()).map(([label, counts]) => ({ label, ...counts })),
      categoryDistribution: Array.from(catMap.entries()).map(([category, count]) => ({
        category,
        count,
      })),
      statusDistribution: Array.from(stMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      evidenceStatusCounts: {
        verified: store.evidence.filter((e) => e.verificationStatus === 'verified').length,
        pending: pendingEvidenceCount,
        mismatch: store.evidence.filter((e) => e.verificationStatus === 'mismatch').length,
        archived: store.evidence.filter((e) => e.verificationStatus === 'archived').length,
      },
      recentCases: [...filteredCases].slice(0, 6),
      pendingTasks,
      latestEvidence: [...store.evidence].slice(0, 6),
      recentAudit: store.auditLog.slice(0, 8),
      userActivity: store.users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        departmentId: u.departmentId,
        lastActive: u.lastActive,
        status: u.status,
      })),
    } as T;
  }

  // Cases list & creation
  if (pathname === '/api/cases') {
    if (method === 'GET') {
      const kind = params.get('kind') || 'all';
      const status = params.get('status') || 'all';
      const q = (params.get('q') || '').toLowerCase();
      const filtered = store.cases.filter((c) => {
        if (kind !== 'all' && c.kind !== kind) return false;
        if (status !== 'all' && c.status !== status) return false;
        if (q && !`${c.caseNumber} ${c.title} ${c.summary}`.toLowerCase().includes(q)) return false;
        return true;
      });
      return { cases: filtered } as T;
    }
    if (method === 'POST') {
      const now = new Date().toISOString();
      const created: CaseRecord = {
        id: `case_${Date.now()}`,
        caseNumber: String(body.caseNumber || `TRN-${Date.now().toString().slice(-4)}`),
        title: String(body.title || 'New Case'),
        kind: (body.kind as CaseRecord['kind']) || 'training',
        category: (body.category as CaseRecord['category']) || 'apk_fraud',
        createdAt: now,
        updatedAt: now,
        status: 'open',
        departmentId: (body.departmentId as DepartmentId) || user.departmentId,
        assignedOfficer: String(body.assignedOfficer || user.name),
        assignedUserIds: [user.id],
        accessLevel: (body.accessLevel as AccessLevel) || 'training',
        relatedArticleId: body.relatedArticleId ? String(body.relatedArticleId) : undefined,
        summary: String(body.summary || ''),
        qualificationNotes: String(body.qualificationNotes || ''),
        timeline: [],
        entities: [],
        materials: [],
        tasks: [],
        linkedReportIds: [],
        history: [
          {
            id: `hist_${Date.now()}`,
            timestamp: now,
            actorId: user.id,
            actorName: user.name,
            actorRole: user.role,
            action: 'created_case',
            details: `Создано дело ${String(body.caseNumber || '')}`,
          },
        ],
      };
      store.cases.unshift(created);
      saveStaticStore(store);
      return { caseRecord: created } as T;
    }
  }

  // Case detail & mutations
  const caseMatch = pathname.match(/^\/api\/cases\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?$/);
  if (caseMatch) {
    const caseId = decodeURIComponent(caseMatch[1]);
    const sub = caseMatch[2];
    const subId = caseMatch[3];
    const idx = store.cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error('Case not found');
    const c = store.cases[idx];
    const now = new Date().toISOString();

    if (!sub && method === 'GET') {
      return {
        caseRecord: c,
        linkedEvidence: store.evidence.filter((e) => e.caseId === c.id),
        linkedReports: store.reports.filter((r) => r.caseId === c.id),
      } as T;
    }
    if (!sub && method === 'PATCH') {
      if (body.title !== undefined) c.title = String(body.title);
      if (body.summary !== undefined) c.summary = String(body.summary);
      if (body.qualificationNotes !== undefined) c.qualificationNotes = String(body.qualificationNotes);
      if (body.assignedOfficer !== undefined) c.assignedOfficer = String(body.assignedOfficer);
      c.updatedAt = now;
      saveStaticStore(store);
      return { caseRecord: c } as T;
    }
    if (sub === 'status' && method === 'POST') {
      c.status = (body.status as CaseStatus) || c.status;
      c.updatedAt = now;
      saveStaticStore(store);
      return { caseRecord: c } as T;
    }
    if (sub === 'timeline' && method === 'POST') {
      c.timeline.push({
        id: `tl_${Date.now()}`,
        timestamp: now,
        description: String(body.description || ''),
        source: String(body.source || ''),
        severity: (body.severity as 'info' | 'warning' | 'critical') || 'info',
        authorName: user.name,
      });
      c.updatedAt = now;
      saveStaticStore(store);
      return { caseRecord: c } as T;
    }
    if (sub === 'entities' && method === 'POST') {
      c.entities.push({
        id: `ent_${Date.now()}`,
        type: (body.type as CaseRecord['entities'][number]['type']) || 'domain',
        label: String(body.label || ''),
        roleOrContext: String(body.roleOrContext || ''),
        confidence: (body.confidence as 'confirmed' | 'indirect' | 'hypothesis') || 'hypothesis',
        source: String(body.source || ''),
        addedAt: now,
      });
      c.updatedAt = now;
      saveStaticStore(store);
      return { caseRecord: c } as T;
    }
    if (sub === 'materials' && method === 'POST') {
      c.materials.push({
        id: `mat_${Date.now()}`,
        title: String(body.title || ''),
        fileName: String(body.fileName || ''),
        mimeType: String(body.mimeType || 'application/octet-stream'),
        fileSize: Number(body.fileSize || 0),
        sha256: String(body.sha256 || '0'.repeat(64)),
        source: String(body.source || ''),
        receivedAt: now,
        verificationStatus: 'pending',
        uploadedBy: user.name,
        notes: String(body.notes || ''),
      });
      c.updatedAt = now;
      saveStaticStore(store);
      return { caseRecord: c } as T;
    }
    if (sub === 'tasks' && !subId && method === 'POST') {
      c.tasks.push({
        id: `tsk_${Date.now()}`,
        title: String(body.title || ''),
        assignee: String(body.assignee || user.name),
        dueDate: String(body.dueDate || now.slice(0, 10)),
        priority: (body.priority as 'low' | 'medium' | 'high') || 'medium',
        status: 'todo',
        createdAt: now,
      });
      c.updatedAt = now;
      saveStaticStore(store);
      return { caseRecord: c } as T;
    }
    if (sub === 'tasks' && subId && method === 'PATCH') {
      const tk = c.tasks.find((x) => x.id === subId);
      if (tk && body.status) {
        tk.status = body.status as 'todo' | 'in_progress' | 'done';
      }
      c.updatedAt = now;
      saveStaticStore(store);
      return { caseRecord: c } as T;
    }
  }

  // Evidence endpoints
  if (pathname === '/api/evidence') {
    if (method === 'GET') {
      const st = params.get('status') || 'all';
      const q = (params.get('q') || '').toLowerCase();
      const filtered = store.evidence.filter((e) => {
        if (st !== 'all' && e.verificationStatus !== st) return false;
        if (q && !`${e.id} ${e.name} ${e.caseNumber} ${e.sha256}`.toLowerCase().includes(q)) return false;
        return true;
      });
      return { evidence: filtered } as T;
    }
    if (method === 'POST') {
      const linked = store.cases.find((c) => c.id === String(body.caseId || ''));
      const now = new Date().toISOString();
      const created: EvidenceRecord = {
        id: `EV-${Date.now().toString().slice(-6)}`,
        caseId: linked?.id || String(body.caseId || 'case_trn_014'),
        caseNumber: linked?.caseNumber || 'TRN-2026-014',
        departmentId: linked?.departmentId || user.departmentId,
        accessLevel: linked?.accessLevel || 'training',
        name: String(body.name || 'Evidence file'),
        fileType: String(body.fileType || 'application/octet-stream'),
        fileSize: Number(body.fileSize || 0),
        sha256: String(body.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
        receivedAt: now,
        source: String(body.source || ''),
        custodian: String(body.custodian || user.name),
        sealNumber: String(body.sealNumber || `SEAL-${Date.now().toString().slice(-4)}`),
        storageLocation: String(body.storageLocation || ''),
        verificationStatus: 'pending',
        metadata: {
          mimeType: String(body.fileType || 'application/octet-stream'),
          magicHeader: 'Verified SHA-256 client digest',
          extractedSummary: String(body.extractedSummary || ''),
        },
        workingCopyNotes: '',
        workingCopyUpdatedAt: now,
        custodyHistory: [],
        accessLog: [
          {
            id: `eal_${Date.now()}`,
            timestamp: now,
            actorName: user.name,
            actorRole: user.role,
            action: 'registered',
            details: 'Registered in offline static store.',
          },
        ],
      };
      store.evidence.unshift(created);
      saveStaticStore(store);
      return { evidence: created } as T;
    }
  }

  const evMatch = pathname.match(/^\/api\/evidence\/([^/]+)\/(verify|transfer|working-copy)$/);
  if (evMatch) {
    const evId = decodeURIComponent(evMatch[1]);
    const action = evMatch[2];
    const ev = store.evidence.find((e) => e.id === evId);
    if (!ev) throw new Error('Evidence not found');
    const now = new Date().toISOString();
    if (action === 'verify') {
      const candidate = String(body.sha256 || '').trim().toLowerCase();
      const match = candidate === ev.sha256.toLowerCase();
      ev.verificationStatus = match ? 'verified' : 'mismatch';
      saveStaticStore(store);
      return { evidence: ev, match } as T;
    }
    if (action === 'transfer') {
      ev.custodian = String(body.toPerson || ev.custodian);
      ev.custodyHistory.unshift({
        id: `COC-${Date.now().toString().slice(-4)}`,
        evidenceId: ev.id,
        timestamp: now,
        fromPerson: user.name,
        toPerson: ev.custodian,
        purpose: String(body.purpose || ''),
        hashVerified: true,
      });
      saveStaticStore(store);
      return { evidence: ev } as T;
    }
    if (action === 'working-copy') {
      ev.workingCopyNotes = String(body.workingCopyNotes || '');
      ev.workingCopyUpdatedAt = now;
      saveStaticStore(store);
      return { evidence: ev } as T;
    }
  }

  // Graph
  if (pathname === '/api/graph') {
    const caseId = params.get('caseId');
    const nodes = caseId ? store.graphNodes.filter((n) => n.caseId === caseId) : store.graphNodes;
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = caseId
      ? store.graphEdges.filter((e) => e.caseId === caseId || (nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)))
      : store.graphEdges;
    return { nodes, edges } as T;
  }
  if (pathname === '/api/graph/nodes' && method === 'POST') {
    const node: GraphNode = {
      id: `gn_${Date.now()}`,
      type: (body.type as GraphNode['type']) || 'domain',
      label: String(body.label || 'Node'),
      subtitle: String(body.subtitle || ''),
      caseId: String(body.caseId || ''),
      departmentId: user.departmentId,
      accessLevel: 'training',
      x: Number(body.x || 350),
      y: Number(body.y || 240),
      attributes: (body.attributes as Record<string, string>) || {},
    };
    store.graphNodes.push(node);
    saveStaticStore(store);
    return { node } as T;
  }
  if (pathname === '/api/graph/edges' && method === 'POST') {
    const edge: GraphEdge = {
      id: `ge_${Date.now()}`,
      sourceId: String(body.sourceId || ''),
      targetId: String(body.targetId || ''),
      relation: String(body.relation || ''),
      source: String(body.source || ''),
      establishedAt: new Date().toISOString(),
      confidence: (body.confidence as GraphEdge['confidence']) || 'hypothesis',
      caseId: String(body.caseId || ''),
    };
    store.graphEdges.push(edge);
    saveStaticStore(store);
    return { edge } as T;
  }

  // Reports
  if (pathname === '/api/reports') {
    if (method === 'GET') return { reports: store.reports } as T;
    if (method === 'POST') {
      const linked = store.cases.find((c) => c.id === String(body.caseId || ''));
      const rep: StaticReportRecord = {
        id: `rep_${Date.now()}`,
        caseId: linked?.id,
        caseNumber: linked?.caseNumber || String(body.caseNumber || 'TRN-2026'),
        departmentId: linked?.departmentId || user.departmentId,
        accessLevel: linked?.accessLevel || 'training',
        title: String(body.title || 'Report'),
        template: (body.template as StaticReportRecord['template']) || 'incident',
        authorId: user.id,
        authorName: user.name,
        createdAt: new Date().toISOString(),
        summary: String(body.summary || ''),
      };
      store.reports.unshift(rep);
      if (linked) linked.linkedReportIds.push(rep.id);
      saveStaticStore(store);
      return { report: rep } as T;
    }
  }

  // Global search
  if (pathname === '/api/search') {
    const q = (params.get('q') || '').toLowerCase();
    const results: unknown[] = [];
    for (const c of store.cases) {
      if (!q || `${c.caseNumber} ${c.title} ${c.summary}`.toLowerCase().includes(q)) {
        results.push({
          id: c.id,
          type: 'case',
          title: `${c.caseNumber} — ${c.title}`,
          subtitle: c.summary.slice(0, 100),
          status: c.status,
          date: c.updatedAt,
          targetPage: 'case',
          routeOpts: { id: c.id },
        });
      }
    }
    for (const e of store.evidence) {
      if (!q || `${e.id} ${e.name} ${e.sha256}`.toLowerCase().includes(q)) {
        results.push({
          id: e.id,
          type: 'evidence',
          title: `${e.id} — ${e.name}`,
          subtitle: e.source,
          status: e.verificationStatus,
          date: e.receivedAt,
          targetPage: 'evidenceCenter',
          routeOpts: { id: e.id },
        });
      }
    }
    return { results: results.slice(0, 20) } as T;
  }

  // Audit & Admin
  if (pathname === '/api/audit') return { logs: store.auditLog } as T;
  if (pathname === '/api/admin/users') {
    if (method === 'GET') return { users: store.users } as T;
    if (method === 'POST') {
      const created: InstitutionalUser = {
        id: `usr_${Date.now()}`,
        name: String(body.name || 'User'),
        email: String(body.email || `user${Date.now()}@kiber.local`),
        role: (body.role as InstitutionalRole) || 'officer',
        departmentId: (body.departmentId as DepartmentId) || 'dept_cyber',
        badgeNumber: String(body.badgeNumber || `ID-${Date.now().toString().slice(-3)}`),
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      store.users.push(created);
      saveStaticStore(store);
      return { user: created } as T;
    }
  }
  const usrMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (usrMatch && method === 'PATCH') {
    const u = store.users.find((x) => x.id === decodeURIComponent(usrMatch[1]));
    if (!u) throw new Error('User not found');
    if (body.role) u.role = body.role as InstitutionalRole;
    if (body.departmentId) u.departmentId = body.departmentId as DepartmentId;
    if (body.status) u.status = body.status as 'active' | 'suspended';
    saveStaticStore(store);
    return { user: u } as T;
  }
  if (pathname === '/api/admin/roles') {
    if (method === 'GET') return { rolePermissions: store.rolePermissions } as T;
    if (method === 'PUT') {
      const role = body.role as InstitutionalRole;
      if (role && body.permissions) {
        store.rolePermissions[role] = body.permissions as InstitutionalPermissionSet;
        saveStaticStore(store);
      }
      return { rolePermissions: store.rolePermissions } as T;
    }
  }

  if (pathname === '/api/ai/predict') {
    throw new Error('AI predictive forecasting requires an active backend server with GEMINI_API_KEY configured.');
  }

  return {} as T;
}
