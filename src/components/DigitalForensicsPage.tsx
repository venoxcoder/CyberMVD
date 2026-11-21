import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  FilePlus2,
  FileText,
  HardDrive,
  Link2,
  ListFilter,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { SAMPLE_FORENSIC_LOGS } from '../data/platformData';
import type {
  CustodyRecord,
  EvidenceItem,
  ForensicTimelineEvent,
  Lang,
  PageId,
  ReportDraft,
} from '../types';
import { pickText, t } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

interface DigitalForensicsPageProps {
  lang: Lang;
  caseNo: string;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
  onToast: (msg: string) => void;
}

type ForensicsTab = 'hash' | 'logs' | 'timeline' | 'custody';

async function computeSha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const DigitalForensicsPage: React.FC<DigitalForensicsPageProps> = ({
  lang,
  caseNo,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const [tab, setTab] = useState<ForensicsTab>('hash');

  // Hash Verifier state
  const [fileA, setFileA] = useState<{ name: string; size: number; sha256: string } | null>(null);
  const [fileB, setFileB] = useState<{ name: string; size: number; sha256: string } | null>(null);
  const [expectedHash, setExpectedHash] = useState('');

  // Log Analyzer state
  const [rawLog, setRawLog] = useState(SAMPLE_FORENSIC_LOGS[0].rawLog);
  const [sevFilter, setSevFilter] = useState<'ALL' | 'info' | 'warning' | 'critical'>('ALL');

  // Timeline state
  const [timeline, setTimeline] = useState<ForensicTimelineEvent[]>(() =>
    lsJSON<ForensicTimelineEvent[]>('kj_forensics_timeline', [
      {
        id: 'tl_init_1',
        timestamp: '2026-07-15T14:02:11Z',
        source: 'Telegram',
        severity: 'info',
        description: '[Sample] Downloaded Soliq_Qarzdorlik_2026.apk',
      },
      {
        id: 'tl_init_2',
        timestamp: '2026-07-15T14:04:19Z',
        source: 'TelephonyProvider',
        severity: 'critical',
        description: '[Sample] OTP SMS intercepted & sent to C2',
        ioc: '185.220.101.44',
      },
    ])
  );
  const [tlDraft, setTlDraft] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    source: '',
    severity: 'warning' as 'info' | 'warning' | 'critical',
    description: '',
    ioc: '',
  });

  // Evidence Catalog & Chain of Custody state
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>(() =>
    lsJSON<EvidenceItem[]>('kj_forensics_evidence', [])
  );
  const [custodyList, setCustodyList] = useState<CustodyRecord[]>(() =>
    lsJSON<CustodyRecord[]>('kj_forensics_custody', [])
  );
  const [evForm, setEvForm] = useState({
    caseNumber: caseNo || '2026-123',
    name: '',
    type: 'APK / Mobile Image',
    sourceDevice: '',
    sha256: '',
    collectedBy: '',
    sealNumber: '',
    storageLocation: 'Evidence Vault #1',
    notes: '',
  });
  const [custodyForm, setCustodyForm] = useState({
    evidenceId: '',
    fromPerson: '',
    toPerson: '',
    purpose: '',
    hashVerified: true,
  });

  const handleHashFile = async (slot: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sha256 = await computeSha256(file);
    const info = { name: file.name, size: file.size, sha256 };
    if (slot === 'A') setFileA(info);
    else setFileB(info);
    logActivity('forensics', `Computed SHA-256 for ${file.name}`);
  };

  const parsedLogs = useMemo(() => {
    return rawLog
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        const parts = line.split('|').map((p) => p.trim());
        const lower = line.toLowerCase();
        const sev: 'info' | 'warning' | 'critical' =
          lower.includes('critical') || lower.includes('intercepted') || lower.includes('mysqldump')
            ? 'critical'
            : lower.includes('warning') || lower.includes('failed') || lower.includes('unknown')
              ? 'warning'
              : 'info';
        return {
          id: `log_${i}`,
          timestamp: parts[0] || `Line ${i + 1}`,
          severity: sev,
          source: parts[2] || parts[1] || 'System',
          message: parts.slice(parts.length >= 4 ? 3 : 1).join(' | ') || line,
        };
      })
      .filter((row) => sevFilter === 'ALL' || row.severity === sevFilter);
  }, [rawLog, sevFilter]);

  const saveTimeline = (next: ForensicTimelineEvent[]) => {
    const sorted = [...next].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    setTimeline(sorted);
    lsSetJSON('kj_forensics_timeline', sorted);
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evForm.name.trim()) return;
    const item: EvidenceItem = {
      id: `EV-${Date.now().toString().slice(-6)}`,
      caseNumber: evForm.caseNumber.trim() || 'DRAFT',
      name: evForm.name.trim(),
      type: evForm.type,
      sourceDevice:
        evForm.sourceDevice.trim() ||
        (lang === 'ru' ? 'Не указано' : lang === 'en' ? 'Unspecified' : 'Ko‘rsatilmagan'),
      sha256:
        evForm.sha256.trim() ||
        fileA?.sha256 ||
        (lang === 'ru' ? 'Ожидает хеширования' : lang === 'en' ? 'Pending hash' : 'Xesh kutilmoqda'),
      collectedBy:
        evForm.collectedBy.trim() ||
        (lang === 'ru' ? 'Следователь' : lang === 'en' ? 'Investigator' : 'Tergovchi'),
      collectedAt: new Date().toISOString(),
      sealNumber: evForm.sealNumber.trim() || `SEAL-${Math.floor(1000 + Math.random() * 9000)}`,
      storageLocation: evForm.storageLocation.trim(),
      notes: evForm.notes.trim(),
    };
    const next = [item, ...evidenceList];
    setEvidenceList(next);
    lsSetJSON('kj_forensics_evidence', next);
    setCustodyForm((p) => ({ ...p, evidenceId: item.id }));
    setEvForm((p) => ({ ...p, name: '', sourceDevice: '', sha256: '', sealNumber: '', notes: '' }));
    logActivity('forensics', `Cataloged digital evidence ${item.id}`);
    onToast(t('saved', lang));
  };

  const handleAddCustody = (e: React.FormEvent) => {
    e.preventDefault();
    const evId = custodyForm.evidenceId || evidenceList[0]?.id;
    if (!evId || !custodyForm.fromPerson.trim() || !custodyForm.toPerson.trim()) return;
    const rec: CustodyRecord = {
      id: `COC-${Date.now().toString().slice(-5)}`,
      evidenceId: evId,
      timestamp: new Date().toISOString(),
      fromPerson: custodyForm.fromPerson.trim(),
      toPerson: custodyForm.toPerson.trim(),
      purpose:
        custodyForm.purpose.trim() ||
        (lang === 'ru'
          ? 'Судебная экспертиза'
          : lang === 'en'
            ? 'Forensic Examination'
            : 'Ekspertiza uchun'),
      hashVerified: custodyForm.hashVerified,
    };
    const next = [rec, ...custodyList];
    setCustodyList(next);
    lsSetJSON('kj_forensics_custody', next);
    setCustodyForm((p) => ({ ...p, fromPerson: '', toPerson: '', purpose: '' }));
    logActivity('forensics', `Logged Chain of Custody transfer for ${evId}`);
    onToast(t('saved', lang));
  };

  const handleSendToReport = () => {
    const existing = lsJSON<ReportDraft>('kj_report_draft', {
      template: 'evidence',
      title:
        lang === 'ru'
          ? 'Отчёт цифровой криминалистики и Chain of Custody'
          : lang === 'en'
            ? 'Digital Forensics & Chain of Custody Report'
            : 'Raqamli kriminalistika va dalillar zanjiri hisoboti',
      caseNumber: caseNo || evForm.caseNumber,
      investigator:
        lang === 'ru'
          ? 'Специалист-криминалист'
          : lang === 'en'
            ? 'Forensic Specialist'
            : 'Kriminalist mutaxassis',
      date: new Date().toISOString().slice(0, 10),
      summary: '',
      evidenceText: '',
      timelineText: '',
      conclusions: '',
      recommendations: '',
    });

    const evSummary = evidenceList
      .map(
        (ev) =>
          `• [${ev.id}] ${ev.name} (${ev.type}) | Seal: ${ev.sealNumber} | SHA-256: ${ev.sha256}`
      )
      .join('\n');
    const tlSummary = timeline
      .map((tl) => `${tl.timestamp} [${tl.severity.toUpperCase()}] (${tl.source}): ${tl.description}`)
      .join('\n');

    lsSetJSON('kj_report_draft', {
      ...existing,
      evidenceText: evSummary || existing.evidenceText,
      timelineText: tlSummary || existing.timelineText,
    });
    onNavigate('reports');
  };

  const tabs: { id: ForensicsTab; label: string }[] = [
    { id: 'hash', label: lang === 'ru' ? 'SHA-256 и целостность' : lang === 'en' ? 'SHA-256 & Integrity' : 'SHA-256 va yaxlitlik' },
    { id: 'logs', label: lang === 'ru' ? 'Анализатор логов' : lang === 'en' ? 'Event Log Analyzer' : 'Loglar tahlili' },
    { id: 'timeline', label: `${lang === 'ru' ? 'Временная шкала' : lang === 'en' ? 'Timeline' : 'Vaqt shkalasi'} (${timeline.length})` },
    { id: 'custody', label: `${lang === 'ru' ? 'Каталог и Chain of Custody' : lang === 'en' ? 'Evidence & Custody' : 'Dalillar va zanjir'} (${evidenceList.length})` },
  ];

  const filesMatch = fileA && fileB && fileA.sha256 === fileB.sha256;
  const expectedMatch =
    fileA && expectedHash.trim()
      ? fileA.sha256.toLowerCase() === expectedHash.trim().toLowerCase()
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_forensics', lang)}
        title={t('p_forensics', lang)}
        subtitle={
          lang === 'ru'
            ? 'Криптографическое хеширование SHA-256, анализ журналов событий, временная шкала и учёт цепочки сохранности (Chain of Custody).'
            : lang === 'en'
              ? 'Real SHA-256 integrity verification, educational event log analysis, incident timeline, and Chain of Custody ledger.'
              : 'Haqiqiy SHA-256 xeshlash, o‘quv hodisalar jurnali tahlili, vaqt shkalasi va dalillar zanjiri (Chain of Custody).'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <button
            type="button"
            onClick={handleSendToReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-ink)]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t('sendToReport', lang)}</span>
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => {
          const isActive = tab === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`relative rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                isActive
                  ? 'border-transparent text-[var(--accent-ink)]'
                  : 'border-[var(--line)] bg-[var(--panel)] text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="forensics-tab-pill"
                  transition={{ type: 'spring', stiffness: 430, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[var(--accent)]"
                />
              )}
              <span className="relative z-10">{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SHA-256 */}
      {tab === 'hash' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text)]">
                  {lang === 'ru' ? '1. Исходный файл (Эталон)' : lang === 'en' ? '1. Original Evidence File' : '1. Asl dalil fayli'}
                </h3>
                <label className="cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-ink)]">
                  <span>{lang === 'ru' ? 'Выбрать' : lang === 'en' ? 'Select' : 'Tanlash'}</span>
                  <input type="file" onChange={(e) => handleHashFile('A', e)} className="hidden" />
                </label>
              </div>
              {fileA ? (
                <div className="space-y-1.5 rounded-xl bg-[var(--panel2)] p-3 text-xs">
                  <div className="font-semibold text-[var(--text)]">{fileA.name} ({fileA.size} B)</div>
                  <div className="break-all font-mono text-[11px] text-[var(--accent)]">{fileA.sha256}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setEvForm((p) => ({ ...p, name: fileA.name, sha256: fileA.sha256 }));
                      setTab('custody');
                    }}
                    className="inline-flex items-center gap-1 pt-1 font-bold text-[var(--accent)] hover:underline"
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
                    <span>{lang === 'ru' ? 'Добавить в каталог улик' : lang === 'en' ? 'Register in Evidence Catalog' : 'Dalillar katalogiga qo‘shish'}</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  {lang === 'ru' ? 'Файл не выбран. Расчёт SHA-256 выполняется локально через Web Crypto API.' : lang === 'en' ? 'No file loaded. SHA-256 runs locally via Web Crypto API.' : 'Fayl tanlanmagan. SHA-256 brauzerda Web Crypto orqali hisoblanadi.'}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text)]">
                  {lang === 'ru' ? '2. Сравниваемая копия' : lang === 'en' ? '2. Comparison File (Optional)' : '2. Solishtiriladigan nusxa'}
                </h3>
                <label className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-bold text-[var(--text)] hover:border-[var(--accent)]">
                  <span>{lang === 'ru' ? 'Выбрать' : lang === 'en' ? 'Select' : 'Tanlash'}</span>
                  <input type="file" onChange={(e) => handleHashFile('B', e)} className="hidden" />
                </label>
              </div>
              {fileB ? (
                <div className="space-y-1.5 rounded-xl bg-[var(--panel2)] p-3 text-xs">
                  <div className="font-semibold text-[var(--text)]">{fileB.name} ({fileB.size} B)</div>
                  <div className="break-all font-mono text-[11px] text-[var(--accent)]">{fileB.sha256}</div>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  {lang === 'ru' ? 'Загрузите второй файл для проверки идентичности.' : lang === 'en' ? 'Load a second file to verify bit-for-bit identity.' : 'Bitma-bit moslikni tekshirish uchun ikkinchi faylni tanlang.'}
                </p>
              )}
            </div>
          </div>

          {fileA && fileB && (
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-bold ${
                filesMatch
                  ? 'border-[var(--ok)]/40 bg-[var(--ok)]/10 text-[var(--ok)]'
                  : 'border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)]'
              }`}
            >
              {filesMatch ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span>
                {filesMatch
                  ? lang === 'ru'
                    ? 'СОВПАДЕНИЕ: SHA-256 хеш-суммы полностью идентичны.'
                    : lang === 'en'
                      ? 'MATCH: Both files have identical SHA-256 digests.'
                      : 'MOSLIK: Ikkala faylning SHA-256 xeshi 100% bir xil.'
                  : lang === 'ru'
                    ? 'РАСХОЖДЕНИЕ: Файлы отличаются (нарушена целостность или другой объект).'
                    : lang === 'en'
                      ? 'MISMATCH: Files are NOT identical.'
                      : 'FARQ: Fayllar bir xil emas (yaxlitlik buzilgan yoki boshqa fayl).'}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-2">
            <label className="block text-xs font-bold text-[var(--secondary-text)]">
              {lang === 'ru' ? 'Сверка с известным SHA-256 из протокола:' : lang === 'en' ? 'Compare File 1 against known SHA-256 digest:' : '1-faylni bayonnomadagi SHA-256 bilan solishtirish:'}
            </label>
            <input
              type="text"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              placeholder={
                lang === 'ru'
                  ? 'Вставьте 64-символьный SHA-256 хеш...'
                  : lang === 'en'
                    ? 'Paste 64-char SHA-256 hex...'
                    : '64 belgili SHA-256 xeshni kiriting...'
              }
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
            {expectedMatch !== null && (
              <div className={`text-xs font-bold ${expectedMatch ? 'text-[var(--ok)]' : 'text-[var(--red)]'}`}>
                {expectedMatch
                  ? lang === 'ru'
                    ? '✓ Хеш подтверждён'
                    : lang === 'en'
                      ? '✓ Hash Verified'
                      : '✓ Xesh tasdiqlandi'
                  : lang === 'ru'
                    ? '✗ Хеш не совпадает'
                    : lang === 'en'
                      ? '✗ Hash Does Not Match'
                      : '✗ Xesh mos kelmadi'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVENT LOG ANALYZER */}
      {tab === 'logs' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--text)]">
                {lang === 'ru' ? 'Учебные наборы логов:' : lang === 'en' ? 'Training Log Datasets:' : 'O‘quv log namunalari:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_FORENSIC_LOGS.map((ds) => (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => setRawLog(ds.rawLog)}
                    className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)]"
                  >
                    {pickText(ds.title, lang)}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={6}
              value={rawLog}
              onChange={(e) => setRawLog(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <ListFilter className="h-4 w-4 text-[var(--muted)]" />
                {(['ALL', 'critical', 'warning', 'info'] as const).map((sv) => (
                  <button
                    key={sv}
                    type="button"
                    onClick={() => setSevFilter(sv)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                      sevFilter === sv
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'bg-[var(--panel2)] text-[var(--secondary-text)]'
                    }`}
                  >
                    {sv === 'ALL' ? (lang === 'ru' ? 'ВСЕ' : lang === 'en' ? 'ALL' : 'BARCHASI') : sv}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-[var(--muted)]">
                {parsedLogs.length} {lang === 'ru' ? 'событий' : lang === 'en' ? 'events' : 'hodisa'}
              </span>
            </div>
          </div>

          <div className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
            {parsedLogs.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    <span className="text-[var(--muted)]">{row.timestamp}</span>
                    <span
                      className={`font-bold uppercase ${
                        row.severity === 'critical'
                          ? 'text-[var(--red)]'
                          : row.severity === 'warning'
                            ? 'text-[var(--orange)]'
                            : 'text-[var(--accent)]'
                      }`}
                    >
                      {row.severity}
                    </span>
                    <span className="font-semibold text-[var(--text)]">{row.source}</span>
                  </div>
                  <div className="font-mono text-[var(--secondary-text)]">{row.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveTimeline([
                      ...timeline,
                      {
                        id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                        timestamp: row.timestamp,
                        source: row.source,
                        severity: row.severity,
                        description: row.message,
                      },
                    ]);
                    onToast(lang === 'ru' ? 'Добавлено в шкалу' : lang === 'en' ? 'Added to timeline' : 'Vaqt shkalasiga qo‘shildi');
                  }}
                  className="shrink-0 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]"
                >
                  + {lang === 'ru' ? 'В шкалу' : lang === 'en' ? 'Timeline' : 'Taymlayn'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TIMELINE */}
      {tab === 'timeline' && (
        <div className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!tlDraft.description.trim()) return;
              saveTimeline([
                ...timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: tlDraft.timestamp,
                  source: tlDraft.source.trim() || 'Manual',
                  severity: tlDraft.severity,
                  description: tlDraft.description.trim(),
                  ioc: tlDraft.ioc.trim() || undefined,
                },
              ]);
              setTlDraft((p) => ({ ...p, description: '', ioc: '' }));
              onToast(t('saved', lang));
            }}
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 grid grid-cols-1 gap-3 sm:grid-cols-4"
          >
            <input
              type="text"
              value={tlDraft.timestamp}
              onChange={(e) => setTlDraft((p) => ({ ...p, timestamp: e.target.value }))}
              placeholder="2026-07-15T14:04Z"
              className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs text-[var(--text)]"
            />
            <input
              type="text"
              value={tlDraft.source}
              onChange={(e) => setTlDraft((p) => ({ ...p, source: e.target.value }))}
              placeholder={lang === 'ru' ? 'Источник (Telegram, Bank)' : lang === 'en' ? 'Source (Telegram, Bank)' : 'Manba (Telegram, Bank)'}
              className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
            />
            <select
              value={tlDraft.severity}
              onChange={(e) => setTlDraft((p) => ({ ...p, severity: e.target.value as 'info' | 'warning' | 'critical' }))}
              className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
            >
              <option value="info">INFO</option>
              <option value="warning">WARNING</option>
              <option value="critical">CRITICAL</option>
            </select>
            <input
              type="text"
              value={tlDraft.ioc}
              onChange={(e) => setTlDraft((p) => ({ ...p, ioc: e.target.value }))}
              placeholder={lang === 'ru' ? 'IOC (необязательно)' : lang === 'en' ? 'IOC (optional)' : 'IOC (ixtiyoriy)'}
              className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs text-[var(--text)]"
            />
            <input
              type="text"
              value={tlDraft.description}
              onChange={(e) => setTlDraft((p) => ({ ...p, description: e.target.value }))}
              placeholder={lang === 'ru' ? 'Описание события...' : lang === 'en' ? 'Event description...' : 'Hodisa tavsifi...'}
              className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)] sm:col-span-3"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--accent-ink)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('add', lang)}</span>
            </button>
          </form>

          <div className="space-y-2.5">
            {timeline.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span className="font-bold text-[var(--text)]">{ev.timestamp}</span>
                    <span className="text-[var(--muted)]">· {ev.source} ·</span>
                    <span
                      className={`font-bold uppercase ${
                        ev.severity === 'critical'
                          ? 'text-[var(--red)]'
                          : ev.severity === 'warning'
                            ? 'text-[var(--orange)]'
                            : 'text-[var(--accent)]'
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text)]">{ev.description}</p>
                  {ev.ioc && <div className="font-mono text-[11px] text-[var(--accent)]">IOC: {ev.ioc}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => saveTimeline(timeline.filter((x) => x.id !== ev.id))}
                  className="text-[var(--muted)] hover:text-[var(--red)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EVIDENCE CATALOG & CHAIN OF CUSTODY */}
      {tab === 'custody' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Evidence Catalog */}
          <div className="space-y-4">
            <form
              onSubmit={handleAddEvidence}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <HardDrive className="h-4 w-4 text-[var(--accent)]" />
                <span>{lang === 'ru' ? 'Регистрация цифрового доказательства' : lang === 'en' ? 'Catalog Digital Evidence' : 'Raqamli dalilni ro‘yxatga olish'}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  type="text"
                  value={evForm.name}
                  onChange={(e) => setEvForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={lang === 'ru' ? 'Название объекта (напр. Soliq.apk)' : lang === 'en' ? 'Evidence name (e.g. Soliq.apk)' : 'Dalil nomi (mas. Soliq.apk)'}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
                />
                <input
                  type="text"
                  value={evForm.caseNumber}
                  onChange={(e) => setEvForm((p) => ({ ...p, caseNumber: e.target.value }))}
                  placeholder={t('cbNo', lang)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
                />
                <input
                  type="text"
                  value={evForm.sourceDevice}
                  onChange={(e) => setEvForm((p) => ({ ...p, sourceDevice: e.target.value }))}
                  placeholder={lang === 'ru' ? 'Устройство-источник' : lang === 'en' ? 'Source Device' : 'Manba qurilma'}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
                />
                <input
                  type="text"
                  value={evForm.sealNumber}
                  onChange={(e) => setEvForm((p) => ({ ...p, sealNumber: e.target.value }))}
                  placeholder={lang === 'ru' ? 'Номер пломбы / бирки' : lang === 'en' ? 'Seal / Bag Number' : 'Muhr raqami'}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
                />
              </div>
              <input
                type="text"
                value={evForm.sha256}
                onChange={(e) => setEvForm((p) => ({ ...p, sha256: e.target.value }))}
                placeholder={lang === 'ru' ? 'Хеш SHA-256' : lang === 'en' ? 'SHA-256 digest' : 'SHA-256 xesh'}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs text-[var(--text)]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'ru' ? 'Внести в каталог' : lang === 'en' ? 'Register Evidence' : 'Katalogga kiritish'}</span>
              </button>
            </form>

            <div className="space-y-2.5">
              {evidenceList.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[var(--accent)]">
                      {ev.id} · {t('caseWord', lang)} {ev.caseNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = evidenceList.filter((x) => x.id !== ev.id);
                        setEvidenceList(next);
                        lsSetJSON('kj_forensics_evidence', next);
                      }}
                      className="text-[var(--muted)] hover:text-[var(--red)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="font-bold text-sm text-[var(--text)]">{ev.name}</div>
                  <div className="text-[var(--secondary-text)]">
                    {lang === 'ru' ? 'Пломба:' : lang === 'en' ? 'Seal:' : 'Muhr:'} {ev.sealNumber} · {lang === 'ru' ? 'Источник:' : lang === 'en' ? 'Source:' : 'Manba:'} {ev.sourceDevice}
                  </div>
                  <div className="break-all font-mono text-[11px] text-[var(--muted)]">SHA-256: {ev.sha256}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chain of Custody Ledger */}
          <div className="space-y-4">
            <form
              onSubmit={handleAddCustody}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <Link2 className="h-4 w-4 text-[var(--accent)]" />
                <span>{lang === 'ru' ? 'Передача по цепочке сохранности (Chain of Custody)' : lang === 'en' ? 'Chain of Custody Transfer Log' : 'Dalillar zanjiri (Chain of Custody)'}</span>
              </div>

              <select
                value={custodyForm.evidenceId}
                onChange={(e) => setCustodyForm((p) => ({ ...p, evidenceId: e.target.value }))}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
              >
                <option value="">
                  {evidenceList.length === 0
                    ? lang === 'ru'
                      ? 'Сначала зарегистрируйте доказательство'
                      : lang === 'en'
                        ? 'Register evidence first'
                        : 'Avval dalilni ro‘yxatga oling'
                    : lang === 'ru'
                      ? 'Выберите объект...'
                      : lang === 'en'
                        ? 'Select evidence item...'
                        : 'Dalilni tanlang...'}
                </option>
                {evidenceList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.id} — {ev.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  type="text"
                  value={custodyForm.fromPerson}
                  onChange={(e) => setCustodyForm((p) => ({ ...p, fromPerson: e.target.value }))}
                  placeholder={lang === 'ru' ? 'Передал (ФИО)' : lang === 'en' ? 'Released By' : 'Topshiruvchi'}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
                />
                <input
                  type="text"
                  value={custodyForm.toPerson}
                  onChange={(e) => setCustodyForm((p) => ({ ...p, toPerson: e.target.value }))}
                  placeholder={lang === 'ru' ? 'Принял (ФИО/Эксперт)' : lang === 'en' ? 'Received By' : 'Qabul qiluvchi'}
                  className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
                />
              </div>

              <input
                type="text"
                value={custodyForm.purpose}
                onChange={(e) => setCustodyForm((p) => ({ ...p, purpose: e.target.value }))}
                placeholder={lang === 'ru' ? 'Цель передачи (напр. КТЭ экспертиза)' : lang === 'en' ? 'Purpose (e.g. Forensic Exam)' : 'Maqsad (mas. Ekspertiza)'}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)]"
              />

              <label className="flex items-center gap-2 text-xs text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={custodyForm.hashVerified}
                  onChange={(e) => setCustodyForm((p) => ({ ...p, hashVerified: e.target.checked }))}
                />
                <span>{lang === 'ru' ? 'SHA-256 и целостность пломбы сверены при передаче' : lang === 'en' ? 'SHA-256 & seal verified on transfer' : 'Topshirishda SHA-256 va muhr tekshirildi'}</span>
              </label>

              <button
                type="submit"
                disabled={evidenceList.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)] disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{lang === 'ru' ? 'Зафиксировать передачу' : lang === 'en' ? 'Record Transfer' : 'Topshirishni qayd etish'}</span>
              </button>
            </form>

            <div className="space-y-2.5">
              {custodyList.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-[var(--accent)]">{rec.evidenceId} · {rec.id}</span>
                    <span className="text-[var(--muted)]">{rec.timestamp.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div className="text-[var(--text)] font-semibold">
                    {rec.fromPerson} → {rec.toPerson}
                  </div>
                  <div className="text-[var(--secondary-text)]">
                    {rec.purpose} ·{' '}
                    {rec.hashVerified
                      ? lang === 'ru'
                        ? '✓ Хеш сверен'
                        : lang === 'en'
                          ? '✓ Hash Verified'
                          : '✓ Xesh tasdiqlandi'
                      : lang === 'ru'
                        ? 'Ожидает сверки'
                        : lang === 'en'
                          ? 'Pending Verification'
                          : 'Tasdiqlash kutilmoqda'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
