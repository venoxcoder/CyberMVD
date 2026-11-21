import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Download,
  FileCheck,
  HardDrive,
  History,
  Plus,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { CaseRecord, EvidenceRecord, Lang } from '../types';
import {
  exportEvidenceInventoryDocx,
  exportEvidenceInventoryPdf,
} from '../utils/exportUtils';
import { localizeRecordText, t, tr } from '../utils/i18n';
import { DataTable, EmptyState, PageHeader, StatusBadge, TableSkeleton } from './CommonUI';

interface EvidenceCenterPageProps {
  lang: Lang;
  selectedEvidenceId?: string;
  canGoBack: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}

async function computeFileDigestAndMeta(file: File): Promise<{
  sha256: string;
  magicHeader: string;
}> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const sha256 = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const head = Array.from(new Uint8Array(buf.slice(0, 8)))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  return { sha256, magicHeader: head || 'EMPTY' };
}

export const EvidenceCenterPage: React.FC<EvidenceCenterPageProps> = ({
  lang,
  selectedEvidenceId,
  canGoBack,
  onBack,
  onToast,
}) => {
  const { apiFetch, permissions, user } = useAuth();

  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<EvidenceRecord | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Registration form
  const [draft, setDraft] = useState({
    caseId: '',
    name: '',
    fileType: 'application/octet-stream',
    fileSize: 0,
    sha256: '',
    magicHeader: '',
    lastModified: '',
    source: '',
    custodian: user?.name || '',
    sealNumber: '',
    storageLocation: 'Секция цифрового хранения',
    workingCopyNotes: '',
  });

  // Verification / Custody / Working copy forms
  const [verifyHash, setVerifyHash] = useState('');
  const [transferForm, setTransferForm] = useState({
    toPerson: '',
    purpose: '',
    hashVerified: true,
  });
  const [workingNotes, setWorkingNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (query.trim()) params.set('q', query.trim());
      const [evRes, caseRes] = await Promise.all([
        apiFetch<{ evidence: EvidenceRecord[] }>(`/api/evidence?${params.toString()}`),
        apiFetch<{ cases: CaseRecord[] }>('/api/cases'),
      ]);
      setEvidence(evRes.evidence || []);
      setCases(caseRes.cases || []);
      if (!draft.caseId && caseRes.cases?.[0]) {
        setDraft((p) => ({ ...p, caseId: caseRes.cases[0].id }));
      }
      if (selectedEvidenceId) {
        const hit = (evRes.evidence || []).find((e) => e.id === selectedEvidenceId);
        if (hit) {
          setSelected(hit);
          setWorkingNotes(hit.workingCopyNotes || '');
        }
      }
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, statusFilter, query, selectedEvidenceId, onToast, draft.caseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUploadPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      onToast(tr(lang, 'Fayl hajmi 25 MB dan oshmasligi kerak.', 'Максимальный размер файла 25 МБ.', 'Max file size is 25 MB.'));
      return;
    }
    const { sha256, magicHeader } = await computeFileDigestAndMeta(file);
    setDraft((p) => ({
      ...p,
      name: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      sha256,
      magicHeader,
      lastModified: new Date(file.lastModified).toISOString().slice(0, 19),
    }));
  };

  const handleRegisterEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ evidence: EvidenceRecord }>('/api/evidence', {
        method: 'POST',
        body: JSON.stringify({
          caseId: draft.caseId,
          name: draft.name,
          fileType: draft.fileType,
          fileSize: draft.fileSize,
          sha256: draft.sha256,
          source: draft.source,
          custodian: draft.custodian,
          sealNumber: draft.sealNumber,
          storageLocation: draft.storageLocation,
          workingCopyNotes: draft.workingCopyNotes,
          metadata: {
            mimeType: draft.fileType,
            magicHeader: draft.magicHeader,
            lastModified: draft.lastModified,
          },
        }),
      });
      setUploadOpen(false);
      setSelected(res.evidence);
      setWorkingNotes(res.evidence.workingCopyNotes || '');
      await loadData();
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const handleVerifyFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { sha256 } = await computeFileDigestAndMeta(file);
    setVerifyHash(sha256);
  };

  const handleVerifyHash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await apiFetch<{ evidence: EvidenceRecord; match: boolean }>(
        `/api/evidence/${selected.id}/verify`,
        { method: 'POST', body: JSON.stringify({ sha256: verifyHash }) }
      );
      setSelected(res.evidence);
      setEvidence((prev) => prev.map((x) => (x.id === res.evidence.id ? res.evidence : x)));
      onToast(
        res.match
          ? tr(
              lang,
              'SHA-256 mos keldi (butunlik tasdiqlandi).',
              'SHA-256 совпал (целостность подтверждена).',
              'SHA-256 verified.'
            )
          : tr(
              lang,
              'DIQQAT: nazorat summasi mos kelmadi!',
              'ВНИМАНИЕ: несовпадение контрольной суммы!',
              'WARNING: SHA-256 mismatch!'
            )
      );
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleTransferCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await apiFetch<{ evidence: EvidenceRecord }>(
        `/api/evidence/${selected.id}/transfer`,
        { method: 'POST', body: JSON.stringify(transferForm) }
      );
      setSelected(res.evidence);
      setEvidence((prev) => prev.map((x) => (x.id === res.evidence.id ? res.evidence : x)));
      setTransferForm({ toPerson: '', purpose: '', hashVerified: true });
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Transfer failed');
    }
  };

  const handleSaveWorkingNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await apiFetch<{ evidence: EvidenceRecord }>(
        `/api/evidence/${selected.id}/working-copy`,
        { method: 'PATCH', body: JSON.stringify({ workingCopyNotes: workingNotes }) }
      );
      setSelected(res.evidence);
      setEvidence((prev) => prev.map((x) => (x.id === res.evidence.id ? res.evidence : x)));
      onToast(t('saved', lang));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Failed to update working copy notes');
    }
  };

  if (!permissions?.evidence_read) {
    return (
      <div className="space-y-5">
        <PageHeader
          lang={lang}
          eyebrow={t('e_evidenceCenter', lang)}
          title={t('p_evidenceCenter', lang)}
          canGoBack={canGoBack}
          onBack={onBack}
        />
        <EmptyState
          title={tr(lang, 'Kirish RBAC siyosati bilan cheklangan', 'Доступ ограничен политикой RBAC', 'Access Restricted by RBAC')}
          description={tr(
            lang,
            'Sizning rolingiz raqamli dalillar reyestriga kirish huquqini bermaydi.',
            'Ваша роль не предусматривает доступ к реестру цифровых доказательств.',
            'Your role does not include digital evidence registry permissions.'
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        lang={lang}
        eyebrow={t('e_evidenceCenter', lang)}
        title={t('p_evidenceCenter', lang)}
        subtitle={
          lang === 'ru'
            ? 'Учёт вещественных цифровых объектов, расчёт SHA-256 при поступлении, проверка целостности без изменения эталона, журнал передачи (Chain of Custody) и опись.'
            : lang === 'en'
              ? 'Digital evidence registry, Web Crypto SHA-256 ingestion, non-destructive integrity verification, custody transfers, and inventory export.'
              : 'Raqamli dalillar reyestri, SHA-256 nazorati, saqlash zanjiri va eksport.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <div className="flex flex-wrap gap-2">
            {permissions.reports_export && evidence.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => exportEvidenceInventoryPdf(evidence, lang)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
                >
                  <Download className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>{t('exportPdf', lang)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportEvidenceInventoryDocx(evidence, lang)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
                >
                  <Download className="h-3.5 w-3.5 text-[var(--blue)]" />
                  <span>{t('exportDocx', lang)}</span>
                </button>
              </>
            )}
            {permissions.evidence_create && (
              <button
                type="button"
                onClick={() => setUploadOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent-ink)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{tr(lang, 'Obyektni ro‘yxatga olish', 'Зарегистрировать объект', 'Register Evidence')}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Technical vs Legal Boundary Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--orange)]/40 bg-[var(--orange)]/10 px-4 py-3 text-xs text-[var(--text)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--orange)]" />
        <p>
          {lang === 'ru'
            ? 'Граница достоверности: проверка SHA-256 и журнал Chain of Custody подтверждают техническую неизменность записи в системе, но не заменяют процессуальное постановление и заключение судебной экспертизы.'
            : lang === 'en'
              ? 'Scope notice: SHA-256 digests and custody logs verify technical record consistency inside this registry and do not replace formal procedural rulings or forensic expert admissibility findings.'
              : 'Cheklov: SHA-256 tekshiruvi texnik butunlikni tasdiqlaydi va rasmiy sud-ekspertiza xulosasi o‘rnini bosmaydi.'}
        </p>
      </div>

      {/* Registration Form */}
      {uploadOpen && permissions.evidence_create && (
        <form
          onSubmit={handleRegisterEvidence}
          className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] p-5 text-xs md:grid-cols-3"
        >
          <div className="md:col-span-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--accent)]/60 bg-[var(--panel2)] px-4 py-4 font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]">
              <Upload className="h-4 w-4" />
              <span>
                {draft.name
                  ? `${draft.name} (${Math.round(draft.fileSize / 1024)} KB · Magic: ${draft.magicHeader})`
                  : tr(
                      lang,
                      'Raqamli fayl tanlang (25 MB gacha) — SHA-256 va signatura avtomatik hisoblanadi',
                      'Выберите цифровой файл (до 25 МБ) — автоматический расчёт SHA-256 и сигнатуры',
                      'Select digital file (up to 25 MB) for SHA-256 & metadata extraction'
                    )}
              </span>
              <input type="file" onChange={handleFileUploadPick} className="hidden" />
            </label>
          </div>
          <select
            required
            value={draft.caseId}
            onChange={(e) => setDraft((p) => ({ ...p, caseId: e.target.value }))}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} — {localizeRecordText(c.title, lang).slice(0, 42)}
              </option>
            ))}
          </select>
          <input
            required
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder={tr(lang, 'Fayl / obyekt nomi', 'Имя файла / объекта', 'File / object name')}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
          />
          <input
            required
            type="text"
            value={draft.sha256}
            onChange={(e) => setDraft((p) => ({ ...p, sha256: e.target.value }))}
            placeholder="SHA-256 (64 hex)"
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-[11px]"
          />
          <input
            required
            type="text"
            value={draft.source}
            onChange={(e) => setDraft((p) => ({ ...p, source: e.target.value }))}
            placeholder={tr(lang, 'Olib qo‘yish / qabul qilish manbasi', 'Источник изъятия / получения', 'Seizure / acquisition source')}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
          />
          <input
            type="text"
            value={draft.sealNumber}
            onChange={(e) => setDraft((p) => ({ ...p, sealNumber: e.target.value }))}
            placeholder={tr(lang, 'Plomba / birka raqami', 'Номер пломбы / бирки', 'Seal / tag number')}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono"
          />
          <input
            type="text"
            value={draft.custodian}
            onChange={(e) => setDraft((p) => ({ ...p, custodian: e.target.value }))}
            placeholder={tr(lang, 'Saqlovchi / Mas’ul shaxs', 'Хранитель / Ответственный', 'Custodian')}
            className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2"
          />
          <div className="flex gap-2 md:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-ink)]"
            >
              {t('save', lang)}
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="rounded-lg border border-[var(--line)] px-4 py-2 font-semibold"
            >
              {tr(lang, 'Bekor qilish', 'Отмена', 'Cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Registry Search & Filter */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr(
            lang,
            'ID, nom, SHA-256, ish, saqlovchi bo‘yicha qidirish...',
            'Поиск по ID, имени, SHA-256, делу, хранителю...',
            'Search evidence, SHA-256, case, custodian...'
          )}
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-1.5"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
        >
          <option value="all">{tr(lang, 'Barcha holatlar', 'Все статусы', 'All statuses')}</option>
          <option value="verified">{tr(lang, 'Tasdiqlangan', 'Подтверждён', 'Verified')}</option>
          <option value="pending">{tr(lang, 'Kutilmoqda', 'Ожидает проверки', 'Pending')}</option>
          <option value="mismatch">{tr(lang, 'Mos kelmadi', 'Несовпадение', 'Mismatch')}</option>
        </select>
      </div>

      {/* Main Split: Registry Table + Detail Card */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className={selected ? 'xl:col-span-7' : 'xl:col-span-12'}>
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <DataTable
              lang={lang}
              rows={evidence}
              rowKey={(e) => e.id}
              onRowClick={(e) => {
                setSelected(e);
                setWorkingNotes(e.workingCopyNotes || '');
                setVerifyHash('');
              }}
              emptyTitle={tr(lang, 'Obyektlar topilmadi', 'Объекты не найдены', 'No evidence objects found')}
              emptyDescription={tr(
                lang,
                'Raqamli obyektni ro‘yxatga oling yoki qidiruv filtrlarini o‘zgartiring.',
                'Зарегистрируйте цифровой объект или измените фильтры поиска.',
                'Register a digital evidence object or adjust search filters.'
              )}
              columns={[
                {
                  key: 'id',
                  header: 'ID',
                  sortValue: (e) => e.id,
                  render: (e) => <span className="font-mono font-bold text-[var(--accent)]">{e.id}</span>,
                },
                {
                  key: 'name',
                  header: tr(lang, 'Fayl / Obyekt', 'Файл / Объект', 'Object'),
                  sortValue: (e) => e.name,
                  render: (e) => (
                    <div>
                      <div className="font-semibold text-[var(--text)]">{localizeRecordText(e.name, lang)}</div>
                      <div className="font-mono text-[10px] text-[var(--muted)]">
                        {e.caseNumber} · {Math.round(e.fileSize / 1024)} KB
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'sha256',
                  header: 'SHA-256',
                  render: (e) => (
                    <span className="font-mono text-[11px] text-[var(--secondary-text)]">
                      {e.sha256.slice(0, 14)}…
                    </span>
                  ),
                },
                {
                  key: 'custodian',
                  header: tr(lang, 'Saqlovchi', 'Хранитель', 'Custodian'),
                  sortValue: (e) => e.custodian,
                  render: (e) => <span>{localizeRecordText(e.custodian, lang)}</span>,
                },
                {
                  key: 'status',
                  header: tr(lang, 'Holat', 'Статус', 'Status'),
                  sortValue: (e) => e.verificationStatus,
                  render: (e) => <StatusBadge status={e.verificationStatus} lang={lang} />,
                },
              ]}
            />
          )}
        </div>

        {selected && (
          <aside className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-xs xl:col-span-5">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-[var(--accent)]" />
                  <span className="font-mono font-extrabold text-[var(--accent)]">{selected.id}</span>
                  <StatusBadge status={selected.verificationStatus} lang={lang} />
                </div>
                <h2 className="mt-1 text-sm font-bold text-[var(--text)]">
                  {localizeRecordText(selected.name, lang)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                ×
              </button>
            </div>

            {/* Immutable Original Metadata */}
            <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3 space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
                {tr(
                  lang,
                  'Etalon rekvizitlar (o‘zgarmas)',
                  'Эталонные реквизиты (неизменяемы)',
                  'Immutable Reference Digest'
                )}
              </div>
              <div className="break-all font-mono text-[11px] text-[var(--text)]">
                SHA-256: {selected.sha256}
              </div>
              <div className="font-mono text-[10px] text-[var(--secondary-text)]">
                {selected.caseNumber} · {tr(lang, 'Plomba', 'Пломба', 'Seal')}: {selected.sealNumber} · Magic: {selected.metadata.magicHeader || '—'}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {tr(lang, 'Manba', 'Источник', 'Source')}: {localizeRecordText(selected.source, lang)} · {selected.receivedAt.slice(0, 19).replace('T', ' ')}
              </div>
            </div>

            {/* Integrity Verification */}
            {permissions.evidence_verify && (
              <form onSubmit={handleVerifyHash} className="space-y-2 rounded-lg border border-[var(--line)] p-3">
                <div className="flex items-center justify-between font-bold text-[var(--text)]">
                  <span className="inline-flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                    {tr(lang, 'SHA-256 butunligini tekshirish', 'Сверка целостности SHA-256', 'Verify Integrity (SHA-256)')}
                  </span>
                  <label className="cursor-pointer font-mono text-[10px] text-[var(--accent)] hover:underline">
                    {tr(lang, 'Fayl tanlash', 'Выбрать файл', 'Pick file')}
                    <input type="file" onChange={handleVerifyFilePick} className="hidden" />
                  </label>
                </div>
                <input
                  required
                  type="text"
                  value={verifyHash}
                  onChange={(e) => setVerifyHash(e.target.value)}
                  placeholder={tr(
                    lang,
                    'Etalon bilan solishtirish uchun SHA-256 kiriting...',
                    'Вставьте SHA-256 для сверки с эталоном...',
                    'Paste SHA-256 to compare against reference...'
                  )}
                  className="w-full rounded border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5 font-mono text-[11px]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1.5 font-bold text-[var(--accent-ink)]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{tr(lang, 'Tekshirish', 'Проверить', 'Verify Hash')}</span>
                </button>
              </form>
            )}

            {/* Working Copy Analysis Notes (Original stays untouched) */}
            <form onSubmit={handleSaveWorkingNotes} className="space-y-2 rounded-lg border border-[var(--line)] p-3">
              <div className="font-bold text-[var(--text)]">
                {tr(
                  lang,
                  'Ishchi nusxa — tahlil qaydlari (asl nusxa o‘zgarmaydi)',
                  'Рабочая копия — заметки анализа (оригинал не затрагивается)',
                  'Working Copy Analysis Notes (Original stays untouched)'
                )}
              </div>
              <textarea
                rows={2}
                value={workingNotes}
                onChange={(e) => setWorkingNotes(e.target.value)}
                className="w-full rounded border border-[var(--line)] bg-[var(--input-bg)] p-2 text-xs"
              />
              <button
                type="submit"
                className="rounded border border-[var(--line)] bg-[var(--panel2)] px-3 py-1 font-semibold hover:border-[var(--accent)]"
              >
                {t('save', lang)}
              </button>
            </form>

            {/* Custody Transfer */}
            {permissions.evidence_transfer && (
              <form onSubmit={handleTransferCustody} className="space-y-2 rounded-lg border border-[var(--line)] p-3">
                <div className="inline-flex items-center gap-1.5 font-bold text-[var(--text)]">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--blue)]" />
                  <span>{tr(lang, 'Saqlashni topshirish (Chain of Custody)', 'Передача хранения (Chain of Custody)', 'Custody Transfer')}</span>
                </div>
                <input
                  required
                  type="text"
                  value={transferForm.toPerson}
                  onChange={(e) => setTransferForm((p) => ({ ...p, toPerson: e.target.value }))}
                  placeholder={tr(lang, 'Kimga topshirildi', 'Кому передано', 'Recipient')}
                  className="w-full rounded border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
                />
                <input
                  required
                  type="text"
                  value={transferForm.purpose}
                  onChange={(e) => setTransferForm((p) => ({ ...p, purpose: e.target.value }))}
                  placeholder={tr(lang, 'Topshirish asosi / maqsadi', 'Основание / цель передачи', 'Transfer purpose')}
                  className="w-full rounded border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5"
                />
                <button
                  type="submit"
                  className="rounded border border-[var(--blue)]/40 bg-[var(--blue)]/10 px-3 py-1.5 font-bold text-[var(--blue)]"
                >
                  {tr(lang, 'Topshirishni qayd etish', 'Зафиксировать передачу', 'Record Transfer')}
                </button>
              </form>
            )}

            {/* Custody & Access Audit Log */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 font-bold text-[var(--text)]">
                <History className="h-3.5 w-3.5 text-[var(--muted)]" />
                <span>{tr(lang, 'Saqlash va murojaatlar tarixi', 'История хранения и обращений', 'Custody & Access Trail')}</span>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {selected.custodyHistory.map((c) => (
                  <div key={c.id} className="rounded border border-[var(--line)] bg-[var(--panel2)]/60 p-2 text-[11px]">
                    <div className="font-semibold text-[var(--text)]">
                      {localizeRecordText(c.fromPerson, lang)} → {localizeRecordText(c.toPerson, lang)}
                    </div>
                    <div className="text-[var(--muted)]">
                      {localizeRecordText(c.purpose, lang)} · {c.timestamp.slice(0, 16).replace('T', ' ')}
                    </div>
                  </div>
                ))}
                {selected.accessLog.map((a) => (
                  <div key={a.id} className="flex items-start gap-1.5 text-[10px] text-[var(--muted)]">
                    <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent)]" />
                    <span>
                      <b className="text-[var(--secondary-text)]">{a.action}</b> ({localizeRecordText(a.actorName, lang)}): {localizeRecordText(a.details, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
