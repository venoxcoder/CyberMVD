import React, { useState } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  FileSearch,
  Globe,
  HelpCircle,
  Search,
  Shield,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OSINT_TASKS } from '../data/platformData';
import type { Lang, OsintSavedItem, PageId, ReportDraft } from '../types';
import { pickText, t } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

interface OsintLabPageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
  onToast: (msg: string) => void;
}

type OsintTab = 'lookup' | 'metadata' | 'footprint' | 'tasks' | 'saved';

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function detectMagicType(bytes: Uint8Array): string {
  const hex = Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (hex.startsWith('25504446')) return 'PDF Document (%PDF)';
  if (hex.startsWith('504b0304')) return 'ZIP / APK / DOCX Container (PK..)';
  if (hex.startsWith('89504e47')) return 'PNG Image';
  if (hex.startsWith('ffd8ff')) return 'JPEG Image (EXIF/JFIF)';
  if (hex.startsWith('4d5a')) return 'Windows PE Executable (MZ)';
  if (hex.startsWith('7f454c46')) return 'Linux ELF Executable';
  return `Binary / Text (header: ${hex || 'empty'})`;
}

export const OsintLabPage: React.FC<OsintLabPageProps> = ({
  lang,
  canGoBack,
  onBack,
  onNavigate,
  onToast,
}) => {
  const { token } = useAuth();
  const [tab, setTab] = useState<OsintTab>('lookup');
  const [target, setTarget] = useState('example.org');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [metaReport, setMetaReport] = useState<{
    name: string;
    size: number;
    mime: string;
    lastModified: string;
    sha256: string;
    magic: string;
    extractedIocs: string[];
    creatorHint: string | null;
  } | null>(null);

  const [footprintInput, setFootprintInput] = useState('');
  const [footprintResult, setFootprintResult] = useState<{
    classification: string;
    details: string[];
    iocs: string[];
  } | null>(null);

  const [savedItems, setSavedItems] = useState<OsintSavedItem[]>(() =>
    lsJSON<OsintSavedItem[]>('kj_osint_saved', [])
  );
  const [solvedTasks, setSolvedTasks] = useState<Record<string, boolean>>(() =>
    lsJSON<Record<string, boolean>>('kj_osint_solved', {})
  );
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  const [taskHints, setTaskHints] = useState<Record<string, boolean>>({});
  const [taskFeedback, setTaskFeedback] = useState<Record<string, 'ok' | 'bad'>>({});

  const saveOsintItem = (item: Omit<OsintSavedItem, 'id' | 'createdAt'>) => {
    const next: OsintSavedItem[] = [
      { ...item, id: `osint_${Date.now()}`, createdAt: new Date().toISOString() },
      ...savedItems,
    ];
    setSavedItems(next);
    lsSetJSON('kj_osint_saved', next);
    logActivity('osint', `Saved ${item.kind}: ${item.target}`);
    onToast(t('saved', lang));
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = target.trim();
    if (!cleaned) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch('/api/osint/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ target: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookupError(
          data?.message ||
            (lang === 'ru'
              ? 'Ошибка OSINT-запроса'
              : lang === 'en'
                ? 'OSINT lookup failed'
                : 'OSINT so‘rovida xatolik')
        );
        return;
      }
      setLookupResult(data);
      logActivity('osint', `OSINT lookup: ${cleaned}`);
    } catch {
      setLookupError(
        lang === 'ru'
          ? 'Ошибка сети при обращении к /api/osint/lookup'
          : lang === 'en'
            ? 'Network error calling /api/osint/lookup'
            : '/api/osint/lookup bilan bog‘lanishda xato'
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleMetadataFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const sha256 = await sha256Hex(buf);
    const magic = detectMagicType(bytes);

    // Extract printable ASCII strings from first 256 KB for safe IOC & PDF/EXIF Creator scanning
    const slice = bytes.slice(0, 262144);
    const ascii = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ' '))
      .join('');

    const urlMatches = ascii.match(/https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s"'<>]*)?/g) || [];
    const ipMatches = ascii.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
    const emailMatches = ascii.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const creatorMatch = ascii.match(/(?:Creator|Producer|Software)[^\w]{1,4}([A-Za-z0-9 ._/-]{3,40})/);

    const iocs = Array.from(new Set([...urlMatches, ...ipMatches, ...emailMatches])).slice(0, 20);
    setMetaReport({
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
      lastModified: new Date(file.lastModified).toISOString(),
      sha256,
      magic,
      extractedIocs: iocs,
      creatorHint: creatorMatch ? creatorMatch[0] : null,
    });
    logActivity('osint', `Metadata inspection: ${file.name}`);
  };

  const handleFootprintAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = footprintInput.trim();
    if (!raw) return;

    const details: string[] = [];
    let classification = lang === 'ru' ? 'Смешанный след' : lang === 'en' ? 'Composite Footprint' : 'Aralash iz';

    if (/^T[A-Za-z1-9]{33}$/.test(raw)) {
      classification =
        lang === 'ru'
          ? 'Адрес криптокошелька TRON (TRC-20)'
          : lang === 'en'
            ? 'TRON (TRC-20) Wallet Address'
            : 'TRON (TRC-20) hamyon manzili';
      details.push(
        lang === 'ru'
          ? 'Сеть: TRON Mainnet | Типичное использование: P2P USDT TRC-20 и вывод похищенных средств'
          : lang === 'en'
            ? 'Network: TRON Mainnet | Typical scam usage: USDT TRC-20 P2P / ransom'
            : 'Tarmoq: TRON Mainnet | Tipik sxema: USDT TRC-20 P2P / tovlamachilik'
      );
    } else if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
      classification =
        lang === 'ru'
          ? 'Адрес EVM (Ethereum / BSC / Polygon)'
          : lang === 'en'
            ? 'EVM (Ethereum / BSC / Polygon) Address'
            : 'EVM (Ethereum / BSC / Polygon) manzili';
      details.push(
        lang === 'ru'
          ? 'Проверьте в публичных обозревателях блоков: Etherscan / BscScan'
          : lang === 'en'
            ? 'Check on public explorers: Etherscan / BscScan'
            : 'Ochiq blokcheyn eksplorerlarda tekshiring: Etherscan / BscScan'
      );
    } else if (/^\d{15}$/.test(raw)) {
      classification =
        lang === 'ru'
          ? 'IMEI мобильного устройства (15 цифр)'
          : lang === 'en'
            ? 'Mobile Device IMEI (15 digits)'
            : 'Mobil qurilma IMEI raqami (15 xona)';
      details.push(
        lang === 'ru'
          ? 'Сверьте связку IMEI–SIM по запросу оператору связи (ст. 169–169-2 УПК).'
          : lang === 'en'
            ? 'Cross-check IMEI–SIM bindings via operator request (Art. 169–169-2 CPC).'
            : 'Operatorga so‘rov orqali IMEI–SIM bog‘lanishini tekshiring (JPK 169–169-2-m.).'
      );
    } else if (/^\d{8,12}$/.test(raw)) {
      classification =
        lang === 'ru'
          ? 'Числовой User ID мессенджера (Telegram)'
          : lang === 'en'
            ? 'Numeric Messenger User ID (Telegram)'
            : 'Messenjer raqamli User ID (Telegram)';
      details.push(
        lang === 'ru'
          ? 'Постоянный идентификатор — сохраняется даже при смене @username.'
          : lang === 'en'
            ? 'Immutable ID — remains valid even if @username is changed.'
            : 'O‘zgarmas ID — @username o‘zgarganda ham o‘zgarishsiz qoladi.'
      );
    } else if (/^@\w{3,}$/.test(raw)) {
      classification =
        lang === 'ru'
          ? 'Никнейм мессенджера / соцсети (@username)'
          : lang === 'en'
            ? 'Social / Messenger Handle (@username)'
            : 'Ijtimoiy tarmoq / messenjer niki (@username)';
      details.push(
        lang === 'ru'
          ? 'Внимание: никнейм можно изменить. Немедленно зафиксируйте числовой User ID.'
          : lang === 'en'
            ? 'Warning: Mutable handle. Record numeric User ID immediately.'
            : 'Diqqat: @username o‘zgaruvchan. Darhol raqamli User ID ni qayd eting.'
      );
    } else if (/^https?:\/\//i.test(raw)) {
      classification =
        lang === 'ru'
          ? 'URL / потенциальная фишинговая ссылка'
          : lang === 'en'
            ? 'URL / Potential Phishing Link'
            : 'URL / ehtimoliy fishing havola';
      try {
        const u = new URL(raw);
        details.push(
          lang === 'ru'
            ? `Хост: ${u.hostname} | Протокол: ${u.protocol}`
            : lang === 'en'
              ? `Host: ${u.hostname} | Protocol: ${u.protocol}`
              : `Xost: ${u.hostname} | Protokol: ${u.protocol}`
        );
        if (u.hostname.includes('xn--'))
          details.push(
            lang === 'ru'
              ? 'Обнаружен Punycode IDN-домен (риск подмены символов).'
              : lang === 'en'
                ? 'Punycode IDN domain detected (homograph risk).'
                : 'Punycode IDN domen aniqlandi (o‘xshash belgilar xavfi).'
          );
        if (u.protocol === 'http:')
          details.push(
            lang === 'ru'
              ? 'Нешифрованное HTTP-соединение.'
              : lang === 'en'
                ? 'Unencrypted HTTP endpoint.'
                : 'Shifrlanmagan HTTP ulanish.'
          );
      } catch {
        details.push(
          lang === 'ru'
            ? 'Некорректный синтаксис URL.'
            : lang === 'en'
              ? 'Malformed URL syntax.'
              : 'Noto‘g‘ri URL sintaksisi.'
        );
      }
    }

    const iocs = Array.from(
      new Set([
        ...(raw.match(/https?:\/\/[^\s]+/g) || []),
        ...(raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []),
        ...(raw.match(/T[A-Za-z1-9]{33}/g) || []),
        ...(raw.match(/0x[a-fA-F0-9]{40}/g) || []),
        ...(raw.match(/@[a-zA-Z0-9_]{3,}/g) || []),
      ])
    );

    if (details.length === 0) {
      details.push(
        lang === 'ru'
          ? `Извлечено структурированных индикаторов (IOC): ${iocs.length}.`
          : lang === 'en'
            ? `Extracted ${iocs.length} structured indicator(s) from text.`
            : `Matndan ${iocs.length} ta tuzilgan indikator (IOC) ajratib olindi.`
      );
    }

    setFootprintResult({ classification, details, iocs });
  };

  const handleTaskSubmit = (taskId: string, accepted: string[]) => {
    const val = (taskInputs[taskId] || '').trim().toLowerCase();
    const ok = accepted.some((a) => val.includes(a.toLowerCase()));
    setTaskFeedback((prev) => ({ ...prev, [taskId]: ok ? 'ok' : 'bad' }));
    if (ok) {
      const next = { ...solvedTasks, [taskId]: true };
      setSolvedTasks(next);
      lsSetJSON('kj_osint_solved', next);
      logActivity('osint', `Solved OSINT task ${taskId}`);
    }
  };

  const sendSavedToReport = (item: OsintSavedItem) => {
    const existing = lsJSON<ReportDraft>('kj_report_draft', {
      template: 'incident',
      title:
        lang === 'ru'
          ? `OSINT-анализ: ${item.target}`
          : lang === 'en'
            ? `OSINT Analysis: ${item.target}`
            : `OSINT tahlili: ${item.target}`,
      caseNumber: '',
      investigator:
        lang === 'ru' ? 'Аналитик OSINT' : lang === 'en' ? 'OSINT Analyst' : 'OSINT tahlilchisi',
      date: new Date().toISOString().slice(0, 10),
      summary: '',
      evidenceText: '',
      timelineText: '',
      conclusions: '',
      recommendations: '',
    });
    const addition = `[OSINT ${item.kind.toUpperCase()}] ${item.target}\n${item.summary}`;
    lsSetJSON('kj_report_draft', {
      ...existing,
      summary: existing.summary ? `${existing.summary}\n\n${addition}` : addition,
    });
    onNavigate('reports');
  };

  const tabs: { id: OsintTab; label: string }[] = [
    { id: 'lookup', label: lang === 'ru' ? 'Домен и IP' : lang === 'en' ? 'Domain & IP' : 'Domen va IP' },
    { id: 'metadata', label: lang === 'ru' ? 'Метаданные файла' : lang === 'en' ? 'File Metadata' : 'Fayl metama’lumoti' },
    { id: 'footprint', label: lang === 'ru' ? 'Цифровые следы / IOC' : lang === 'en' ? 'Footprint / IOC' : 'Raqamli iz / IOC' },
    { id: 'tasks', label: lang === 'ru' ? 'Учебные задания' : lang === 'en' ? 'Training Tasks' : 'O‘quv topshiriqlari' },
    { id: 'saved', label: `${lang === 'ru' ? 'Сохранённые' : lang === 'en' ? 'Saved' : 'Saqlangan'} (${savedItems.length})` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        eyebrow={t('e_osint', lang)}
        title={t('p_osint', lang)}
        subtitle={
          lang === 'ru'
            ? 'Легальный анализ публичных реестров (DNS, RDAP, crt.sh, IP/ASN), метаданных файлов и учебные задания OSINT.'
            : lang === 'en'
              ? 'Lawful public registry lookup (DNS, RDAP, crt.sh, IP/ASN), client-side file metadata inspection, and OSINT drills.'
              : 'Qonuniy ochiq manbalar (DNS, RDAP, crt.sh, IP/ASN), fayl metama’lumotlari va OSINT o‘quv topshiriqlari.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
              tab === tb.id
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'border-[var(--line)] bg-[var(--panel)] text-[var(--secondary-text)] hover:text-[var(--text)]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PUBLIC DOMAIN & IP LOOKUP */}
      {tab === 'lookup' && (
        <div className="space-y-5">
          <form onSubmit={handleLookup} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <label className="block text-xs font-bold text-[var(--secondary-text)]">
              {lang === 'ru'
                ? 'Публичный домен или IP-адрес (приватные/внутренние сети заблокированы)'
                : lang === 'en'
                  ? 'Public Domain or IPv4/IPv6 Address (private/internal networks are blocked)'
                  : 'Ochiq domen yoki IP manzil (ichki/mahalliy tarmoqlar cheklangan)'}
            </label>
            <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={lang === 'ru' ? 'example.org или 1.1.1.1' : lang === 'en' ? 'example.org or 1.1.1.1' : 'example.org yoki 1.1.1.1'}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] py-2.5 pr-3 pl-9 font-mono text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                <span>{lookupLoading ? '...' : lang === 'ru' ? 'Проверить' : lang === 'en' ? 'Lookup' : 'Tekshirish'}</span>
              </button>
            </div>
          </form>

          {lookupError && (
            <div className="rounded-xl border border-[var(--red)]/40 bg-[var(--red)]/10 p-4 text-xs text-[var(--red)]">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-[var(--accent)]">
                    {String(lookupResult.type || 'OSINT')}
                  </span>
                  <h3 className="font-mono text-lg font-bold text-[var(--text)]">
                    {String(lookupResult.target)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    saveOsintItem({
                      kind: lookupResult.type === 'ip' ? 'ip' : 'domain',
                      target: String(lookupResult.target),
                      summary: JSON.stringify(lookupResult).slice(0, 320),
                      data: lookupResult,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  <span>{t('save', lang)}</span>
                </button>
              </div>

              <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--input-bg)] p-4 font-mono text-xs leading-relaxed text-[var(--text)]">
                {JSON.stringify(lookupResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FILE METADATA */}
      {tab === 'metadata' && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">
                {lang === 'ru'
                  ? 'Локальный инспектор метаданных и сигнатур файла'
                  : lang === 'en'
                    ? 'Client-Side File Metadata & Signature Inspector'
                    : 'Fayl metama’lumoti va signatura tahlilchisi'}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {lang === 'ru'
                  ? 'Файл анализируется локально в браузере (SHA-256, Magic Bytes, поиск URL/IP/Creator).'
                  : lang === 'en'
                    ? 'Analyzed locally in-browser: SHA-256, Magic Bytes, PDF/EXIF creator hints, and IOCs.'
                    : 'Fayl brauzer ichida mahalliy tahlil qilinadi (SHA-256, Magic Bytes, Creator va IOC).'}
              </p>
            </div>
            <label className="cursor-pointer rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]">
              <span>{lang === 'ru' ? 'Выбрать файл' : lang === 'en' ? 'Choose File' : 'Faylni tanlash'}</span>
              <input type="file" onChange={handleMetadataFile} className="hidden" />
            </label>
          </div>

          {metaReport && (
            <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-[var(--text)]">{metaReport.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    saveOsintItem({
                      kind: 'metadata',
                      target: metaReport.name,
                      summary: `SHA-256: ${metaReport.sha256} | Magic: ${metaReport.magic}`,
                      data: metaReport,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-bold text-[var(--accent)]"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  <span>{t('save', lang)}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div><span className="text-[var(--muted)]">{lang === 'ru' ? 'Размер:' : lang === 'en' ? 'Size:' : 'Hajmi:'}</span> <span className="font-mono">{metaReport.size} {lang === 'ru' ? 'байт' : lang === 'en' ? 'bytes' : 'bayt'}</span></div>
                <div><span className="text-[var(--muted)]">{lang === 'ru' ? 'Сигнатура:' : lang === 'en' ? 'Signature:' : 'Signatura:'}</span> <span className="font-mono text-[var(--accent)]">{metaReport.magic}</span></div>
                <div><span className="text-[var(--muted)]">MIME:</span> <span className="font-mono">{metaReport.mime}</span></div>
                <div><span className="text-[var(--muted)]">{lang === 'ru' ? 'Изменён:' : lang === 'en' ? 'Modified:' : 'O‘zgartirilgan:'}</span> <span className="font-mono">{metaReport.lastModified}</span></div>
              </div>
              <div className="break-all font-mono">
                <span className="text-[var(--muted)]">SHA-256: </span>
                <span className="text-[var(--ok)]">{metaReport.sha256}</span>
              </div>
              {metaReport.creatorHint && (
                <div className="font-mono text-[var(--orange)]">
                  {lang === 'ru' ? 'Подсказка метаданных:' : lang === 'en' ? 'Metadata Hint:' : 'Metama’lumot izi:'} {metaReport.creatorHint}
                </div>
              )}
              <div>
                <div className="mb-1 font-bold text-[var(--text)]">
                  {lang === 'ru' ? 'Извлечённые индикаторы (IOC)' : lang === 'en' ? 'Extracted IOCs' : 'Ajratilgan indikatorlar (IOC)'} ({metaReport.extractedIocs.length}):
                </div>
                {metaReport.extractedIocs.length === 0 ? (
                  <span className="text-[var(--muted)]">
                    {lang === 'ru'
                      ? 'В начале файла ASCII URL/IP/email не обнаружены.'
                      : lang === 'en'
                        ? 'No ASCII URLs/IPs/emails detected in header slice.'
                        : 'Fayl boshida ASCII URL/IP/email topilmadi.'}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {metaReport.extractedIocs.map((ioc) => (
                      <code key={ioc} className="rounded bg-[var(--panel)] px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]">
                        {ioc}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIGITAL FOOTPRINT / IOC */}
      {tab === 'footprint' && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          <form onSubmit={handleFootprintAnalyze} className="space-y-3">
            <label className="block text-xs font-bold text-[var(--secondary-text)]">
              {lang === 'ru'
                ? 'Вставьте URL, крипто-адрес, IMEI, Telegram ID/ник или текст с индикаторами'
                : lang === 'en'
                  ? 'Paste a URL, crypto wallet, IMEI, Telegram ID/handle, or raw artifact text'
                  : 'URL, kripto-hamyon, IMEI, Telegram ID/nik yoki matnli izni kiriting'}
            </label>
            <textarea
              rows={3}
              value={footprintInput}
              onChange={(e) => setFootprintInput(e.target.value)}
              placeholder={lang === 'ru' ? 'Напр.: TV7xK9pQ... или https://... или 358910094412001' : lang === 'en' ? 'e.g. TV7xK9pQ... or https://... or 358910094412001' : 'Masalan: TV7xK9pQ... yoki https://... yoki 358910094412001'}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)]"
            >
              <FileSearch className="h-4 w-4" />
              <span>{lang === 'ru' ? 'Анализировать след' : lang === 'en' ? 'Inspect Footprint' : 'Izni tahlil qilish'}</span>
            </button>
          </form>

          {footprintResult && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--accent)]">{footprintResult.classification}</span>
                <button
                  type="button"
                  onClick={() =>
                    saveOsintItem({
                      kind: 'footprint',
                      target: footprintInput.slice(0, 48),
                      summary: `${footprintResult.classification}: ${footprintResult.details.join(' ')}`,
                      data: footprintResult,
                    })
                  }
                  className="font-bold text-[var(--accent)] hover:underline"
                >
                  + {t('save', lang)}
                </button>
              </div>
              {footprintResult.details.map((d) => (
                <p key={d} className="text-[var(--text)]">{d}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INTERACTIVE OSINT TRAINING TASKS */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          {OSINT_TASKS.map((task) => {
            const solved = !!solvedTasks[task.id];
            const fb = taskFeedback[task.id];
            return (
              <div key={task.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text)]">{pickText(task.title, lang)}</h3>
                  {solved && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[var(--ok)]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{lang === 'ru' ? 'Решено' : lang === 'en' ? 'Solved' : 'Yechilgan'}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--secondary-text)]">{pickText(task.scenario, lang)}</p>
                <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--accent)]">
                  {task.artifact}
                </pre>
                <p className="text-xs font-semibold text-[var(--text)]">{pickText(task.question, lang)}</p>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={taskInputs[task.id] || ''}
                    onChange={(e) => setTaskInputs((p) => ({ ...p, [task.id]: e.target.value }))}
                    placeholder={lang === 'ru' ? 'Ваш ответ...' : lang === 'en' ? 'Your answer...' : 'Javobingiz...'}
                    className="min-w-[220px] flex-1 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleTaskSubmit(task.id, task.acceptedAnswers)}
                    className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent-ink)]"
                  >
                    {lang === 'ru' ? 'Проверить' : lang === 'en' ? 'Check' : 'Tekshirish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskHints((p) => ({ ...p, [task.id]: !p[task.id] }))}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-1.5 text-xs font-semibold text-[var(--secondary-text)]"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>{lang === 'ru' ? 'Подсказка' : lang === 'en' ? 'Hint' : 'Yordam'}</span>
                  </button>
                </div>

                {taskHints[task.id] && (
                  <p className="text-xs text-[var(--orange)]">{pickText(task.hint, lang)}</p>
                )}
                {fb === 'ok' && (
                  <div className="rounded-lg bg-[var(--ok)]/10 px-3 py-2 text-xs text-[var(--ok)]">
                    {pickText(task.explanation, lang)}
                  </div>
                )}
                {fb === 'bad' && (
                  <div className="rounded-lg bg-[var(--red)]/10 px-3 py-2 text-xs text-[var(--red)]">
                    {lang === 'ru' ? 'Попробуйте ещё раз — изучите артефакт внимательнее.' : lang === 'en' ? 'Not quite — inspect the artifact closely.' : 'Noto‘g‘ri — artefaktni diqqat bilan tekshiring.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: SAVED OSINT ANALYSES */}
      {tab === 'saved' && (
        <div className="space-y-3">
          {savedItems.length === 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center text-xs text-[var(--muted)]">
              <Shield className="mx-auto mb-2 h-6 w-6 opacity-50" />
              {lang === 'ru' ? 'Нет сохранённых результатов' : lang === 'en' ? 'No saved analyses yet' : 'Saqlangan natijalar yo‘q'}
            </div>
          ) : (
            savedItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold text-[var(--accent)]">
                    {item.kind.toUpperCase()} · {item.target}
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--secondary-text)]">{item.summary}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => sendSavedToReport(item)}
                    className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)]"
                  >
                    {t('sendToReport', lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = savedItems.filter((x) => x.id !== item.id);
                      setSavedItems(next);
                      lsSetJSON('kj_osint_saved', next);
                    }}
                    className="p-1.5 text-[var(--muted)] hover:text-[var(--red)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
