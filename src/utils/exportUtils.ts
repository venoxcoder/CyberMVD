import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import type { Lang, ReportDraft } from '../types';

let cachedFonts: { regular: string; bold: string } | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function loadUnicodeFonts(): Promise<{ regular: string; bold: string } | null> {
  if (cachedFonts) return cachedFonts;
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('./fonts/DejaVuSans.ttf'),
      fetch('./fonts/DejaVuSans-Bold.ttf'),
    ]);
    if (!regRes.ok || !boldRes.ok) return null;
    const [regBuf, boldBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);
    cachedFonts = {
      regular: arrayBufferToBase64(regBuf),
      bold: arrayBufferToBase64(boldBuf),
    };
    return cachedFonts;
  } catch {
    return null;
  }
}

function registerFonts(doc: jsPDF, fonts: { regular: string; bold: string } | null): string {
  if (!fonts) return 'helvetica';
  doc.addFileToVFS('DejaVuSans.ttf', fonts.regular);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', fonts.bold);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
  return 'DejaVuSans';
}

export async function exportReportToPdf(draft: ReportDraft, lang: Lang): Promise<void> {
  const fonts = await loadUnicodeFonts();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fontFamily = registerFonts(doc, fonts);

  const labels = {
    uz: {
      header: 'KIBERJINOYATLAR — O‘QUV TERGOV HISOBOTI',
      notice: 'Eslatma: Ushbu hujjat o‘quv va tahliliy maqsadlarda yaratilgan.',
      caseNo: 'Ish raqami',
      investigator: 'Tergovchi / Tahlilchi',
      date: 'Sana',
      summary: '1. Hodisa va dastlabki tahlil',
      evidence: '2. Raqamli dalillar va xesh-qiymatlar',
      timeline: '3. Hodisalar xronologiyasi',
      conclusions: '4. Xulosa va huquqiy kvalifikatsiya',
      recommendations: '5. Tavsiyalar va keyingi harakatlar',
    },
    ru: {
      header: 'KIBERJINOYATLAR — УЧЕБНЫЙ АНАЛИТИЧЕСКИЙ ОТЧЁТ',
      notice: 'Примечание: Документ сформирован в учебных и аналитических целях.',
      caseNo: 'Номер дела',
      investigator: 'Следователь / Аналитик',
      date: 'Дата',
      summary: '1. Описание инцидента и анализ',
      evidence: '2. Цифровые доказательства и хеш-суммы',
      timeline: '3. Хронология событий',
      conclusions: '4. Выводы и правовая квалификация',
      recommendations: '5. Рекомендации и дальнейшие шаги',
    },
    en: {
      header: 'KIBERJINOYATLAR — EDUCATIONAL INVESTIGATION REPORT',
      notice: 'Notice: This report was generated for educational and analytical purposes.',
      caseNo: 'Case Number',
      investigator: 'Investigator / Analyst',
      date: 'Date',
      summary: '1. Incident Summary & Analysis',
      evidence: '2. Digital Evidence & Hash Values',
      timeline: '3. Event Timeline',
      conclusions: '4. Conclusions & Legal Qualification',
      recommendations: '5. Recommendations & Next Steps',
    },
  }[lang];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 143, 128);
  doc.text(labels.header, margin, y);
  y += 7;

  doc.setFontSize(16);
  doc.setTextColor(23, 35, 56);
  const fallbackTitle =
    lang === 'ru'
      ? 'Отчёт о киберинциденте'
      : lang === 'en'
        ? 'Cyber Incident Report'
        : 'Kiberhodisa hisoboti';
  const titleLines = doc.splitTextToSize(draft.title || fallbackTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(labels.notice, margin, y);
  y += 6;

  doc.setDrawColor(200, 210, 224);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`${labels.caseNo}: ${draft.caseNumber || '—'}   |   ${labels.date}: ${draft.date || '—'}`, margin, y);
  y += 6;
  doc.text(`${labels.investigator}: ${draft.investigator || '—'}`, margin, y);
  y += 9;

  const sections: [string, string][] = [
    [labels.summary, draft.summary],
    [labels.evidence, draft.evidenceText],
    [labels.timeline, draft.timelineText],
    [labels.conclusions, draft.conclusions],
    [labels.recommendations, draft.recommendations],
  ];

  for (const [heading, body] of sections) {
    ensureSpace(16);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(heading, margin, y);
    y += 6;

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize((body || '—').trim(), maxWidth);
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5.2;
    }
    y += 5;
  }

  const filename = `kiberjinoyatlar-report-${(draft.caseNumber || 'draft').replace(/[^a-z0-9-_]/gi, '_')}.pdf`;
  doc.save(filename);
}

export async function exportReportToDocx(draft: ReportDraft, lang: Lang): Promise<void> {
  const labels = {
    uz: {
      header: 'KIBERJINOYATLAR — O‘QUV TERGOV HISOBOTI',
      notice: 'Eslatma: Ushbu hujjat o‘quv va tahliliy maqsadlarda yaratilgan.',
      caseNo: 'Ish raqami',
      investigator: 'Tergovchi / Tahlilchi',
      date: 'Sana',
      summary: '1. Hodisa va dastlabki tahlil',
      evidence: '2. Raqamli dalillar va xesh-qiymatlar',
      timeline: '3. Hodisalar xronologiyasi',
      conclusions: '4. Xulosa va huquqiy kvalifikatsiya',
      recommendations: '5. Tavsiyalar va keyingi harakatlar',
    },
    ru: {
      header: 'KIBERJINOYATLAR — УЧЕБНЫЙ АНАЛИТИЧЕСКИЙ ОТЧЁТ',
      notice: 'Примечание: Документ сформирован в учебных и аналитических целях.',
      caseNo: 'Номер дела',
      investigator: 'Следователь / Аналитик',
      date: 'Дата',
      summary: '1. Описание инцидента и анализ',
      evidence: '2. Цифровые доказательства и хеш-суммы',
      timeline: '3. Хронология событий',
      conclusions: '4. Выводы и правовая квалификация',
      recommendations: '5. Рекомендации и дальнейшие шаги',
    },
    en: {
      header: 'KIBERJINOYATLAR — EDUCATIONAL INVESTIGATION REPORT',
      notice: 'Notice: This report was generated for educational and analytical purposes.',
      caseNo: 'Case Number',
      investigator: 'Investigator / Analyst',
      date: 'Date',
      summary: '1. Incident Summary & Analysis',
      evidence: '2. Digital Evidence & Hash Values',
      timeline: '3. Event Timeline',
      conclusions: '4. Conclusions & Legal Qualification',
      recommendations: '5. Recommendations & Next Steps',
    },
  }[lang];

  const makeSection = (heading: string, content: string): Paragraph[] => {
    const lines = (content || '—').split('\n');
    return [
      new Paragraph({
        text: heading,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 },
      }),
      ...lines.map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line || ' ', size: 22 })],
            spacing: { after: 80 },
          })
      ),
    ];
  };

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: labels.header,
                bold: true,
                color: '0B8F80',
                size: 20,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            text:
              draft.title ||
              (lang === 'ru'
                ? 'Отчёт о киберинциденте'
                : lang === 'en'
                  ? 'Cyber Incident Report'
                  : 'Kiberhodisa hisoboti'),
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: labels.notice,
                italics: true,
                color: '64748B',
                size: 18,
              }),
            ],
            border: {
              bottom: { color: 'CBD5E1', space: 8, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${labels.caseNo}: `, bold: true, size: 22 }),
              new TextRun({ text: `${draft.caseNumber || '—'}   |   `, size: 22 }),
              new TextRun({ text: `${labels.date}: `, bold: true, size: 22 }),
              new TextRun({ text: draft.date || '—', size: 22 }),
            ],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${labels.investigator}: `, bold: true, size: 22 }),
              new TextRun({ text: draft.investigator || '—', size: 22 }),
            ],
            spacing: { after: 200 },
          }),
          ...makeSection(labels.summary, draft.summary),
          ...makeSection(labels.evidence, draft.evidenceText),
          ...makeSection(labels.timeline, draft.timelineText),
          ...makeSection(labels.conclusions, draft.conclusions),
          ...makeSection(labels.recommendations, draft.recommendations),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kiberjinoyatlar-report-${(draft.caseNumber || 'draft').replace(/[^a-z0-9-_]/gi, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function generateCertificatePdf(params: {
  recipientName: string;
  score: number;
  total: number;
  percentage: number;
  difficulty: string;
  date: string;
  lang: Lang;
}): Promise<void> {
  const fonts = await loadUnicodeFonts();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fontFamily = registerFonts(doc, fonts);
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const copy = {
    uz: {
      brand: 'KIBERJINOYATLAR · CYBER INTELLIGENCE CENTER',
      title: 'O‘QUV SERTIFIKATI',
      subtitle: 'Ushbu sertifikat quyidagi tinglovchiga beriladi:',
      body: 'Kiberjinoyatlar, OSINT va raqamli kriminalistika bo‘yicha o‘quv testini muvaffaqiyatli topshirgani uchun.',
      level: 'Daraja',
      result: 'Natija',
      date: 'Sana',
    },
    ru: {
      brand: 'KIBERJINOYATLAR · ЦЕНТР КИБЕРРАЗВЕДКИ',
      title: 'УЧЕБНЫЙ СЕРТИФИКАТ',
      subtitle: 'Настоящий сертификат подтверждает, что',
      body: 'успешно прошёл учебное тестирование по расследованию киберпреступлений, OSINT и цифровой криминалистике.',
      level: 'Уровень',
      result: 'Результат',
      date: 'Дата',
    },
    en: {
      brand: 'KIBERJINOYATLAR · CYBER INTELLIGENCE CENTER',
      title: 'CERTIFICATE OF COMPLETION',
      subtitle: 'This educational certificate is awarded to',
      body: 'for successfully completing the Cybercrime Investigation, OSINT, and Digital Forensics assessment.',
      level: 'Difficulty',
      result: 'Score',
      date: 'Date',
    },
  }[params.lang];

  // Background frame
  doc.setFillColor(8, 14, 27);
  doc.rect(0, 0, w, h, 'F');
  doc.setDrawColor(54, 214, 195);
  doc.setLineWidth(1.2);
  doc.rect(12, 12, w - 24, h - 24);
  doc.setDrawColor(35, 51, 75);
  doc.setLineWidth(0.4);
  doc.rect(16, 16, w - 32, h - 32);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(54, 214, 195);
  doc.text(copy.brand, w / 2, 36, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(234, 241, 251);
  doc.text(copy.title, w / 2, 62, { align: 'center' });

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(13);
  doc.setTextColor(139, 155, 178);
  doc.text(copy.subtitle, w / 2, 82, { align: 'center' });

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  const fallbackRecipient =
    params.lang === 'ru'
      ? 'Стажёр-следователь'
      : params.lang === 'en'
        ? 'Investigator Trainee'
        : 'Tergovchi amaliyotchisi';
  doc.text(params.recipientName || fallbackRecipient, w / 2, 102, { align: 'center' });

  doc.setDrawColor(54, 214, 195);
  doc.line(w / 2 - 70, 108, w / 2 + 70, 108);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(12);
  doc.setTextColor(200, 214, 230);
  const bodyLines = doc.splitTextToSize(copy.body, 200);
  doc.text(bodyLines, w / 2, 124, { align: 'center' });

  const diffMap: Record<string, Record<Lang, string>> = {
    junior: { uz: 'Boshlang‘ich', ru: 'Базовый', en: 'Junior' },
    middle: { uz: 'O‘rta', ru: 'Средний', en: 'Middle' },
    senior: { uz: 'Yuqori', ru: 'Продвинутый', en: 'Senior' },
    mixed: { uz: 'Aralash', ru: 'Смешанный', en: 'Mixed' },
  };
  const localizedDiff = diffMap[params.difficulty]?.[params.lang] || params.difficulty.toUpperCase();

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(54, 214, 195);
  doc.text(
    `${copy.level}: ${localizedDiff}   |   ${copy.result}: ${params.score}/${params.total} (${params.percentage}%)   |   ${copy.date}: ${params.date}`,
    w / 2,
    162,
    { align: 'center' }
  );

  doc.save(`certificate-${params.date}.pdf`);
}

export async function exportEvidenceInventoryPdf(
  records: Array<{
    id: string;
    caseNumber: string;
    name: string;
    fileType: string;
    fileSize: number;
    sha256: string;
    receivedAt: string;
    source: string;
    custodian: string;
    sealNumber: string;
    verificationStatus: string;
  }>,
  lang: Lang
): Promise<void> {
  const fonts = await loadUnicodeFonts();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fontFamily = registerFonts(doc, fonts);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 118, 110);
  doc.text('KIBERJINOYATLAR — DIGITAL EVIDENCE INVENTORY', margin, y);
  y += 6;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const disclaimer =
    lang === 'ru'
      ? 'Примечание: техническая фиксация SHA-256 не заменяет процессуальное заключение экспертизы и постановление о приобщении.'
      : lang === 'en'
        ? 'Notice: technical SHA-256 verification does not replace formal procedural examination or legal admissibility rulings.'
        : 'Eslatma: SHA-256 texnik tekshiruvi rasmiy ekspertiza xulosasi o‘rnini bosmaydi.';
  const discLines = doc.splitTextToSize(disclaimer, maxWidth);
  doc.text(discLines, margin, y);
  y += discLines.length * 4 + 4;

  for (const ev of records) {
    ensureSpace(34);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${ev.id} | ${ev.name} [${ev.verificationStatus.toUpperCase()}]`, margin, y);
    y += 5;

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Case: ${ev.caseNumber}  |  Seal: ${ev.sealNumber}  |  Custodian: ${ev.custodian}  |  Date: ${ev.receivedAt.slice(0, 10)}`,
      margin,
      y
    );
    y += 4.5;
    doc.text(`SHA-256: ${ev.sha256}`, margin, y);
    y += 4.5;
    doc.text(`Source: ${ev.source} (${ev.fileType}, ${ev.fileSize} bytes)`, margin, y);
    y += 6;
  }

  doc.save(`evidence-inventory-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportEvidenceInventoryDocx(
  records: Array<{
    id: string;
    caseNumber: string;
    name: string;
    fileType: string;
    fileSize: number;
    sha256: string;
    receivedAt: string;
    source: string;
    custodian: string;
    sealNumber: string;
    verificationStatus: string;
  }>,
  lang: Lang
): Promise<void> {
  const disclaimer =
    lang === 'ru'
      ? 'Техническая фиксация хеш-суммы не подменяет процессуальную оценку допустимости доказательств.'
      : lang === 'en'
        ? 'Technical digest verification does not substitute formal legal admissibility review.'
        : 'Texnik xesh-tekshiruv rasmiy protsessual ekspertiza o‘rnini bosmaydi.';

  const children: Paragraph[] = [
    new Paragraph({
      text: 'KIBERJINOYATLAR — DIGITAL EVIDENCE INVENTORY',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: disclaimer, italics: true, color: '64748B', size: 18 })],
      spacing: { after: 200 },
    }),
  ];

  for (const ev of records) {
    children.push(
      new Paragraph({
        text: `${ev.id} — ${ev.name} [${ev.verificationStatus.toUpperCase()}]`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Case: ${ev.caseNumber} | Seal: ${ev.sealNumber} | Custodian: ${ev.custodian} | Received: ${ev.receivedAt.slice(0, 19)}`,
            size: 20,
          }),
        ],
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `SHA-256: ${ev.sha256}`, size: 18 })],
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Source: ${ev.source} (${ev.fileType}, ${ev.fileSize} bytes)`,
            size: 18,
          }),
        ],
        spacing: { after: 120 },
      })
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `evidence-inventory-${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

