import type { IncidentCategory, Lang, TrilingualText } from '../types';

export interface UzbekistanRegionOfficialStats {
  periodLabel: TrilingualText;
  registeredCases?: number;
  nationalSharePct?: number;
  clearanceRatePct?: number;
  operationalClearancePct?: number;
  damageBlnsUzs?: number;
  recoveredBlnsUzs?: number;
  recoveredPct?: number;
  suspendedCases?: number;
  topArticleHighlights?: { code: string; count: string }[];
  sourceNote: TrilingualText;
}

export interface UzbekistanRegionDef {
  id: string;
  code: string;
  name: TrilingualText;
  unitName: TrilingualText;
  center: [number, number];
  path: string;
  isCapitalCity?: boolean;
  keywords: string[];
  officialStats?: UzbekistanRegionOfficialStats;
}

export const UZBEKISTAN_REGIONS: UzbekistanRegionDef[] = [
  {
    id: 'ts',
    code: 'UZ-TK',
    name: {
      uz: 'Toshkent shahri',
      ru: 'г. Ташкент',
      en: 'Tashkent City',
    },
    unitName: {
      uz: 'Toshkent sh. IIBB Kiberjinoyatlarga qarshi kurashish bo‘limi',
      ru: 'УБК ГУВД г. Ташкента (Центральный узел)',
      en: 'Tashkent City Police Cybercrime Directorate',
    },
    center: [748, 306],
    path: 'M737,297 L759,297 L763,315 L737,315 Z',
    isCapitalCity: true,
    keywords: ['ташкент', 'tashkent', 'toshkent', 'централ', 'markaziy', 'tranzit', 'дроп'],
    officialStats: {
      periodLabel: {
        uz: '2025-yil 9 oy (rasmiy jamlanma)',
        ru: '9 месяцев 2025 г. (официальная сводка)',
        en: '9 months of 2025 (official summary)',
      },
      registeredCases: 11166,
      nationalSharePct: 52.6,
      topArticleHighlights: [
        { code: '168', count: '20 257' },
        { code: '169', count: '4 295' },
        { code: '278-6', count: '1 923' },
        { code: '278-2', count: '812' },
      ],
      sourceNote: {
        uz: 'Manba: Toshkent sh. statistikasi (.xlsx) — mamlakat bo‘yicha kiberjinoyatlarning 52,6% ulushi.',
        ru: 'Источник: статистика г. Ташкента (.xlsx) — 52,6% от всех зарегистрированных киберпреступлений в РУз.',
        en: 'Source: Tashkent City official dataset (.xlsx) — 52.6% share of national registered cybercrime.',
      },
    },
  },
  {
    id: 'xo',
    code: 'UZ-XO',
    name: {
      uz: 'Xorazm viloyati',
      ru: 'Хорезмская область',
      en: 'Khorezm Region',
    },
    unitName: {
      uz: 'Xorazm viloyati IIB Kiberjinoyatlarga qarshi kurashish bo‘limi',
      ru: 'УБК УВД Хорезмской области',
      en: 'Khorezm Regional MVD Cybercrime Unit',
    },
    center: [296, 322],
    path: 'M246,312 L274,274 L310,282 L338,298 L334,346 L318,358 L274,348 Z',
    keywords: ['хорезм', 'xorazm', 'khorezm', 'urganch', 'ургенч'],
    officialStats: {
      periodLabel: {
        uz: '10 oy 10 kun (viloyat ma’lumotnomasi)',
        ru: '10 мес. 10 дней (областная справка)',
        en: '10 mo. 10 days (regional official brief)',
      },
      registeredCases: 2927,
      clearanceRatePct: 7.4,
      operationalClearancePct: 24.7,
      damageBlnsUzs: 21.3,
      recoveredBlnsUzs: 6.2,
      recoveredPct: 29,
      suspendedCases: 1885,
      sourceNote: {
        uz: 'Manba: Viloyat IIB ma’lumotnomasi (.docx) — 18 ta kiberjinoyat usuli kesimida batafsil hisobot.',
        ru: 'Источник: областная ведомственная справка (.docx) — детализация по 18 способам (KHOR).',
        en: 'Source: Regional MVD analytical brief (.docx) — detailed breakdown across 18 attack methods.',
      },
    },
  },
  {
    id: 'qr',
    code: 'UZ-QR',
    name: {
      uz: 'Qoraqalpog‘iston Respublikasi',
      ru: 'Республика Каракалпакстан',
      en: 'Republic of Karakalpakstan',
    },
    unitName: {
      uz: 'Qoraqalpog‘iston IIV Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности МВД Каракалпакстана',
      en: 'Karakalpakstan MIA Cybercrime Division',
    },
    center: [212, 205],
    path: 'M52,65 L205,52 L218,120 L238,148 L270,132 L286,70 L368,62 L390,138 L372,196 L336,246 L310,282 L274,274 L246,312 L228,286 L152,292 L88,274 L58,204 Z',
    keywords: ['каракалпак', 'qoraqalpoq', 'karakalpak', 'nukus', 'нукус'],
  },
  {
    id: 'na',
    code: 'UZ-NW',
    name: {
      uz: 'Navoiy viloyati',
      ru: 'Навоийская область',
      en: 'Navoiy Region',
    },
    unitName: {
      uz: 'Navoiy viloyati IIB Kiberjinoyatlarga qarshi kurashish bo‘linmasi',
      ru: 'Подразделение УБК УВД Навоийской области',
      en: 'Navoiy Regional MVD Cyber Unit',
    },
    center: [482, 286],
    path: 'M390,138 L408,182 L438,200 L568,195 L642,272 L630,322 L592,356 L552,374 L496,356 L448,340 L398,356 L356,374 L334,346 L338,298 L310,282 L336,246 L372,196 Z',
    keywords: ['навои', 'navoiy', 'navoi'],
  },
  {
    id: 'bu',
    code: 'UZ-BU',
    name: {
      uz: 'Buxoro viloyati',
      ru: 'Бухарская область',
      en: 'Bukhara Region',
    },
    unitName: {
      uz: 'Buxoro viloyati IIB Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности УВД Бухарской области',
      en: 'Bukhara Regional MVD Cyber Unit',
    },
    center: [442, 404],
    path: 'M356,374 L398,356 L448,340 L496,356 L516,406 L486,448 L452,462 L408,426 Z',
    keywords: ['бухар', 'buxoro', 'bukhara'],
  },
  {
    id: 'sa',
    code: 'UZ-SA',
    name: {
      uz: 'Samarqand viloyati',
      ru: 'Самаркандская область',
      en: 'Samarkand Region',
    },
    unitName: {
      uz: 'Samarqand viloyati IIB Kiberjinoyatlarga qarshi kurashish bo‘linmasi',
      ru: 'УБК УВД Самаркандской области',
      en: 'Samarkand Regional MVD Cyber Unit',
    },
    center: [568, 405],
    path: 'M496,356 L552,374 L592,356 L624,386 L624,424 L612,448 L562,446 L526,434 L516,406 Z',
    keywords: ['самарканд', 'samarqand', 'samarkand'],
  },
  {
    id: 'qa',
    code: 'UZ-QA',
    name: {
      uz: 'Qashqadaryo viloyati',
      ru: 'Кашкадарьинская область',
      en: 'Kashkadarya Region',
    },
    unitName: {
      uz: 'Qashqadaryo viloyati IIB Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности УВД Кашкадарьинской области',
      en: 'Kashkadarya Regional MVD Cyber Unit',
    },
    center: [548, 482],
    path: 'M486,448 L516,406 L526,434 L562,446 L612,448 L636,464 L618,494 L594,522 L566,536 L506,502 L452,462 Z',
    keywords: ['кашкадар', 'qashqadaryo', 'kashkadarya', 'qarshi', 'карши'],
  },
  {
    id: 'su',
    code: 'UZ-SU',
    name: {
      uz: 'Surxondaryo viloyati',
      ru: 'Сурхандарьинская область',
      en: 'Surkhandarya Region',
    },
    unitName: {
      uz: 'Surxondaryo viloyati IIB Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности УВД Сурхандарьинской области',
      en: 'Surkhandarya Regional MVD Cyber Unit',
    },
    center: [642, 526],
    path: 'M612,448 L644,458 L668,488 L688,520 L676,568 L642,588 L608,568 L594,522 L618,494 L636,464 Z',
    keywords: ['сурхандар', 'surxondaryo', 'surkhandarya', 'termez', 'термез'],
  },
  {
    id: 'ji',
    code: 'UZ-JI',
    name: {
      uz: 'Jizzax viloyati',
      ru: 'Джизакская область',
      en: 'Jizzakh Region',
    },
    unitName: {
      uz: 'Jizzax viloyati IIB Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности УВД Джизакской области',
      en: 'Jizzakh Regional MVD Cyber Unit',
    },
    center: [654, 370],
    path: 'M592,356 L630,322 L642,272 L676,302 L688,338 L688,378 L672,442 L644,458 L612,448 L624,424 L624,386 Z',
    keywords: ['джизак', 'jizzax', 'jizzakh'],
  },
  {
    id: 'si',
    code: 'UZ-SI',
    name: {
      uz: 'Sirdaryo viloyati',
      ru: 'Сырдарьинская область',
      en: 'Syrdarya Region',
    },
    unitName: {
      uz: 'Sirdaryo viloyati IIB Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности УВД Сырдарьинской области',
      en: 'Syrdarya Regional MVD Cyber Unit',
    },
    center: [706, 344],
    path: 'M676,302 L706,272 L722,306 L724,358 L724,394 L688,402 L688,378 L688,338 Z',
    keywords: ['сырдар', 'sirdaryo', 'syrdarya', 'guliston', 'гулистан'],
  },
  {
    id: 'tv',
    code: 'UZ-TO',
    name: {
      uz: 'Toshkent viloyati',
      ru: 'Ташкентская область',
      en: 'Tashkent Region',
    },
    unitName: {
      uz: 'Toshkent viloyati IIBB Kiberjinoyatlarga qarshi kurashish bo‘limi',
      ru: 'УБК ГУВД Ташкентской области',
      en: 'Tashkent Regional MVD Cyber Unit',
    },
    center: [770, 278],
    path: 'M706,272 L744,228 L798,218 L814,270 L798,308 L792,344 L776,368 L740,368 L724,358 L722,306 Z',
    keywords: ['ташкентская', 'toshkent viloyat', 'nurafshon', 'нурафшан', 'chirchiq'],
  },
  {
    id: 'nm',
    code: 'UZ-NG',
    name: {
      uz: 'Namangan viloyati',
      ru: 'Наманганская область',
      en: 'Namangan Region',
    },
    unitName: {
      uz: 'Namangan viloyati IIB Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности УВД Наманганской области',
      en: 'Namangan Regional MVD Cyber Unit',
    },
    center: [856, 322],
    path: 'M798,308 L842,294 L906,294 L922,324 L894,344 L842,350 L792,344 Z',
    keywords: ['наманган', 'namangan'],
  },
  {
    id: 'fa',
    code: 'UZ-FA',
    name: {
      uz: 'Farg‘ona viloyati',
      ru: 'Ферганская область',
      en: 'Fergana Region',
    },
    unitName: {
      uz: 'Farg‘ona viloyati IIB Kiberjinoyatlarga qarshi kurashish bo‘limi',
      ru: 'УБК УВД Ферганской области',
      en: 'Fergana Regional MVD Cyber Unit',
    },
    center: [850, 382],
    path: 'M792,344 L842,350 L894,344 L918,382 L884,412 L822,414 L784,386 Z',
    keywords: ['ферган', 'farg‘ona', 'fergana', 'fargona', 'коканд', 'qo‘qon'],
  },
  {
    id: 'an',
    code: 'UZ-AN',
    name: {
      uz: 'Andijon viloyati',
      ru: 'Андижанская область',
      en: 'Andijan Region',
    },
    unitName: {
      uz: 'Andijon viloyati IIB Kiberxavfsizlik bo‘linmasi',
      ru: 'Отдел кибербезопасности УВД Андижанской области',
      en: 'Andijan Regional MVD Cyber Unit',
    },
    center: [930, 355],
    path: 'M894,344 L922,324 L932,324 L964,344 L950,378 L918,382 Z',
    keywords: ['андижан', 'andijon', 'andijan'],
  },
];

export const ARAL_SEA_BAY_PATH = 'M205,52 L218,120 L238,148 L270,132 L286,70 Z';

export function getRegionName(region: UzbekistanRegionDef, lang: Lang): string {
  return region.name[lang] || region.name.ru || region.name.uz;
}

export function matchCaseRegionId(text: string, fallbackDeptId?: string): string {
  const lower = text.toLowerCase();
  for (const r of UZBEKISTAN_REGIONS) {
    if (r.keywords.some((kw) => lower.includes(kw))) {
      return r.id;
    }
  }
  if (fallbackDeptId === 'dept_forensics' || fallbackDeptId === 'dept_oversight' || fallbackDeptId === 'dept_cyber') {
    return 'ts';
  }
  return 'ts';
}

export const CATEGORY_LABELS: Record<IncidentCategory | 'all', TrilingualText> = {
  all: { uz: 'Barcha toifalar', ru: 'Все категории', en: 'All Categories' },
  apk_fraud: { uz: 'APK zararli dasturlar', ru: 'APK-трояны', en: 'APK Trojans' },
  phishing: { uz: 'Fishing va soxta saytlar', ru: 'Фишинг', en: 'Phishing' },
  crypto_fraud: { uz: 'Kripto / P2P firibgarlik', ru: 'Крипто / P2P', en: 'Crypto / P2P' },
  data_breach: { uz: 'Ma’lumotlar sizishi', ru: 'Утечки данных / НСД', en: 'Data Breach' },
  simbox: { uz: 'SIM-Box shlyuzlar', ru: 'SIM-Box шлюзы', en: 'SIM-Box Gateways' },
  ransomware: { uz: 'Shifrlovchi dasturlar', ru: 'Шифровальщики', en: 'Ransomware' },
  social_engineering: { uz: 'Ijtimoiy muhandislik', ru: 'Соц. инженерия', en: 'Social Engineering' },
};
