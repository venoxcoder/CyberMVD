export type Lang = 'uz' | 'ru' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';
export type DensityMode = 'standard' | 'compact';

export type PageId =
  | 'dashboard'
  | 'catalog'
  | 'art'
  | 'wizard'
  | 'universal'
  | 'evidence'
  | 'evidenceCenter'
  | 'case'
  | 'graph'
  | 'knowledge'
  | 'law'
  | 'expert'
  | 'dead'
  | 'reject'
  | 'ai'
  | 'osint'
  | 'forensics'
  | 'simulator'
  | 'map'
  | 'prediction'
  | 'tests'
  | 'profile'
  | 'reports'
  | 'admin';

export interface RouteState {
  page: PageId;
  a?: string;
  m?: string;
  view?: string;
  id?: string;
  tab?: string;
}

export interface StageItem {
  t: string;
  s: string[];
}

export interface MethodItem {
  id: string;
  n: string;
  x?: string;
  mech: string;
  extra?: string;
  vers: [string, string][];
  stages: StageItem[];
  key: string;
  err: string[];
  exp: string[];
}

export interface ArticleItem {
  id: string;
  g: string;
  code: string;
  title: string;
  about: string;
  qual: string[];
  st: { t: string; x: string };
  m: MethodItem[];
}

export interface TrilingualText {
  uz: string;
  ru: string;
  en: string;
}

export interface KBArticle {
  id: string;
  category: 'cybercrime' | 'evidence' | 'osint' | 'security' | 'standards' | 'glossary';
  title: TrilingualText;
  summary: TrilingualText;
  content: TrilingualText;
  tags: string[];
  readMinutes: number;
  isCustom?: boolean;
}

export interface OsintTask {
  id: string;
  title: TrilingualText;
  scenario: TrilingualText;
  artifact: string;
  question: TrilingualText;
  hint: TrilingualText;
  acceptedAnswers: string[];
  explanation: TrilingualText;
}

export interface OsintSavedItem {
  id: string;
  createdAt: string;
  kind: 'domain' | 'ip' | 'metadata' | 'footprint';
  target: string;
  summary: string;
  data: unknown;
}

export interface EvidenceItem {
  id: string;
  caseNumber: string;
  name: string;
  type: string;
  sourceDevice: string;
  sha256: string;
  collectedBy: string;
  collectedAt: string;
  sealNumber: string;
  storageLocation: string;
  notes: string;
}

export interface CustodyRecord {
  id: string;
  evidenceId: string;
  timestamp: string;
  fromPerson: string;
  toPerson: string;
  purpose: string;
  hashVerified: boolean;
}

export interface ForensicTimelineEvent {
  id: string;
  timestamp: string;
  source: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  ioc?: string;
}

export interface SimChoice {
  id: string;
  label: TrilingualText;
  isOptimal: boolean;
  points: number;
  feedback: TrilingualText;
  nextStepId?: string;
}

export interface SimStep {
  id: string;
  prompt: TrilingualText;
  choices: SimChoice[];
}

export interface SimCase {
  id: string;
  code: string;
  difficulty: 'junior' | 'middle' | 'senior';
  title: TrilingualText;
  briefing: TrilingualText;
  relatedArticleId: string;
  artifacts: {
    label: TrilingualText;
    kind: string;
    content: string;
  }[];
  steps: SimStep[];
  isCustom?: boolean;
}

export interface SimCompletion {
  caseId: string;
  score: number;
  maxScore: number;
  completedAt: string;
  decisions: string[];
}

export interface MapIncident {
  id: string;
  title: TrilingualText;
  region: string;
  country: string;
  coords: [number, number];
  threatType: 'apk' | 'phishing' | 'crypto' | 'ransomware' | 'simbox' | 'leak';
  severity: 'medium' | 'high' | 'critical';
  dataLabel: 'TRAINING_FICTIONAL';
  date: string;
  summary: TrilingualText;
  iocs: string[];
  relatedArticleId: string;
}

export interface TestQuestion {
  id: string;
  difficulty: 'junior' | 'middle' | 'senior';
  category: 'qualification' | 'forensics' | 'osint' | 'law';
  question: TrilingualText;
  options: { uz: string[]; ru: string[]; en: string[] };
  correctIndex: number;
  explanation: TrilingualText;
  isCustom?: boolean;
}

export interface TestResult {
  id: string;
  date: string;
  difficulty: 'junior' | 'middle' | 'senior' | 'mixed';
  category: string;
  score: number;
  total: number;
  percentage: number;
  durationSec: number;
  passed: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'investigator' | 'student';
  status: 'active' | 'suspended';
  lastActive: string;
}

export interface RolePermissions {
  manage_content: boolean;
  create_tests: boolean;
  manage_users: boolean;
  export_reports: boolean;
  use_ai: boolean;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  module: PageId;
  action: string;
}

export interface ReportDraft {
  template: 'incident' | 'evidence' | 'investigation';
  title: string;
  caseNumber: string;
  investigator: string;
  date: string;
  summary: string;
  evidenceText: string;
  timelineText: string;
  conclusions: string;
  recommendations: string;
}

/* ======================== DEPARTMENTAL RBAC & OPERATIONAL MODELS ======================== */

export type InstitutionalRole =
  | 'admin'
  | 'department_head'
  | 'officer'
  | 'analyst'
  | 'observer';

export type DepartmentId =
  | 'dept_cyber'
  | 'dept_forensics'
  | 'dept_osint'
  | 'dept_oversight';

export type CaseKind = 'working' | 'training';
export type CaseStatus = 'open' | 'in_progress' | 'pending_review' | 'closed' | 'archived';
export type AccessLevel = 'training' | 'department' | 'restricted' | 'confidential';
export type IncidentCategory =
  | 'apk_fraud'
  | 'phishing'
  | 'crypto_fraud'
  | 'data_breach'
  | 'simbox'
  | 'ransomware'
  | 'social_engineering';

export type VerificationStatus = 'pending' | 'verified' | 'mismatch' | 'archived';

export interface InstitutionalPermissionSet {
  cases_read: boolean;
  cases_create: boolean;
  cases_update: boolean;
  cases_delete: boolean;
  cases_change_status: boolean;
  evidence_read: boolean;
  evidence_create: boolean;
  evidence_verify: boolean;
  evidence_transfer: boolean;
  documents_create: boolean;
  reports_export: boolean;
  ai_use: boolean;
  osint_use: boolean;
  graph_edit: boolean;
  audit_read: boolean;
  users_manage: boolean;
  rbac_manage: boolean;
}

export interface InstitutionalUser {
  id: string;
  name: string;
  email: string;
  role: InstitutionalRole;
  departmentId: DepartmentId;
  badgeNumber: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastActive: string;
}

export interface CaseTimelineEntry {
  id: string;
  timestamp: string;
  description: string;
  source: string;
  severity: 'info' | 'warning' | 'critical';
  authorName: string;
}

export interface CaseEntity {
  id: string;
  type: 'domain' | 'ip' | 'participant' | 'organization' | 'account' | 'wallet';
  label: string;
  roleOrContext: string;
  confidence: 'confirmed' | 'indirect' | 'hypothesis';
  source: string;
  addedAt: string;
}

export interface CaseMaterial {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  source: string;
  receivedAt: string;
  verificationStatus: VerificationStatus;
  uploadedBy: string;
  notes: string;
}

export interface CaseTaskItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  createdAt: string;
}

export interface CaseHistoryEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: InstitutionalRole;
  action: string;
  field?: string;
  details: string;
}

export interface CaseRecord {
  id: string;
  caseNumber: string;
  title: string;
  kind: CaseKind;
  category: IncidentCategory;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  departmentId: DepartmentId;
  assignedOfficer: string;
  assignedUserIds: string[];
  accessLevel: AccessLevel;
  relatedArticleId?: string;
  relatedMethodId?: string;
  summary: string;
  qualificationNotes: string;
  timeline: CaseTimelineEntry[];
  entities: CaseEntity[];
  materials: CaseMaterial[];
  tasks: CaseTaskItem[];
  linkedReportIds: string[];
  history: CaseHistoryEvent[];
}

export interface EvidenceAccessLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: InstitutionalRole;
  action: 'registered' | 'viewed' | 'verified' | 'transferred' | 'working_copy_updated' | 'exported';
  details: string;
}

export interface EvidenceRecord {
  id: string;
  caseId: string;
  caseNumber: string;
  departmentId: DepartmentId;
  accessLevel: AccessLevel;
  name: string;
  fileType: string;
  fileSize: number;
  sha256: string;
  receivedAt: string;
  source: string;
  custodian: string;
  sealNumber: string;
  storageLocation: string;
  verificationStatus: VerificationStatus;
  metadata: {
    mimeType?: string;
    lastModified?: string;
    magicHeader?: string;
    extractedSummary?: string;
  };
  workingCopyNotes: string;
  workingCopyUpdatedAt?: string;
  custodyHistory: CustodyRecord[];
  accessLog: EvidenceAccessLogEntry[];
}

export type GraphNodeType =
  | 'case'
  | 'evidence'
  | 'domain'
  | 'ip'
  | 'file'
  | 'event'
  | 'organization'
  | 'participant';

export type LinkConfidence = 'confirmed' | 'indirect' | 'hypothesis';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  subtitle?: string;
  caseId: string;
  departmentId: DepartmentId;
  accessLevel: AccessLevel;
  x: number;
  y: number;
  attributes: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
  source: string;
  establishedAt: string;
  confidence: LinkConfidence;
  caseId: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: InstitutionalRole | 'anonymous';
  departmentId: string;
  action: string;
  resourceType: 'auth' | 'case' | 'evidence' | 'document' | 'graph' | 'search' | 'report' | 'admin' | 'ai' | 'osint';
  resourceId: string;
  outcome: 'success' | 'denied' | 'error';
  details: string;
}

export interface GlobalSearchResultItem {
  id: string;
  kind: 'case' | 'material' | 'evidence' | 'kb' | 'catalog' | 'report' | 'audit';
  title: string;
  snippet: string;
  date?: string;
  status?: string;
  targetPage: PageId;
  routeOpts?: { a?: string; m?: string; id?: string; tab?: string };
}

export interface AppNotification {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  read: boolean;
  targetPage?: PageId;
  routeOpts?: { id?: string; tab?: string };
}

export interface WorkspacePreferences {
  density: DensityMode;
  pinnedPages: PageId[];
  favorites: { id: string; kind: 'case' | 'evidence' | 'article'; label: string; page: PageId; routeOpts?: { a?: string; id?: string } }[];
  recentCases: { id: string; caseNumber: string; title: string; openedAt: string }[];
  savedFilters: { id: string; name: string; page: PageId; query: string }[];
  showHints: boolean;
  workspacePreset: 'investigator' | 'analyst' | 'supervisor';
}
