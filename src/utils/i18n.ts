import { UZ_CYR_TRANSLATIONS } from '../data/translations';
import type { Lang, TrilingualText } from '../types';

const CYR: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y',
  'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '’', 'ь': '', 'ы': 'i',
  'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o‘', 'қ': 'q', 'ғ': 'g‘', 'ҳ': 'h',
};
const CYR_VOWELS = 'аеёиоуўэюя';
const CYR_RE = /[\u0400-\u04FF\u0500-\u052F]/;
const isUpperCyr = (c?: string) => !!c && c !== c.toLowerCase() && CYR_RE.test(c);

function transliterateCyrToLat(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const lo = ch.toLowerCase();
    let m: string;
    if (lo === 'е') {
      const prev = (input[i - 1] || '').toLowerCase();
      m = !prev || !/\p{L}/u.test(prev) || CYR_VOWELS.includes(prev) ? 'ye' : 'e';
    } else if (Object.prototype.hasOwnProperty.call(CYR, lo)) {
      m = CYR[lo];
    } else {
      out += ch;
      continue;
    }
    if (ch !== lo && m) {
      const nextUpper = isUpperCyr(input[i + 1]);
      m = m.length > 1 && nextUpper ? m.toUpperCase() : m[0].toUpperCase() + m.slice(1);
    }
    out += m;
  }
  return out;
}

/**
 * Translates Uzbek Cyrillic source strings into Russian ('ru'), English ('en'),
 * or transliterates into Uzbek Latin ('uz') using UZ_CYR_TRANSLATIONS.
 */
export function tx(str: unknown, lang: Lang): string {
  if (!str) return '';
  if (typeof str === 'object' && str !== null && ('uz' in str || 'ru' in str || 'en' in str)) {
    return pickText(str as TrilingualText, lang);
  }
  const input = String(str);
  if (!input) return input;

  if (lang === 'ru' || lang === 'en') {
    const direct = UZ_CYR_TRANSLATIONS[input];
    if (direct) {
      return lang === 'ru' ? direct[0] : direct[1];
    }
    const trimmed = input.trim();
    const trimmedHit = trimmed ? UZ_CYR_TRANSLATIONS[trimmed] : undefined;
    if (trimmedHit) {
      const lead = input.slice(0, input.indexOf(trimmed));
      const trail = input.slice(input.indexOf(trimmed) + trimmed.length);
      return `${lead}${lang === 'ru' ? trimmedHit[0] : trimmedHit[1]}${trail}`;
    }
    if (lang === 'ru' || !CYR_RE.test(input)) return input;
    return transliterateCyrToLat(input);
  }

  if (!CYR_RE.test(input)) return input;
  return transliterateCyrToLat(input);
}

export function pickText(text: unknown, lang: Lang): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'object' && text !== null) {
    const tObj = text as Record<string, string>;
    return tObj[lang] || tObj.ru || tObj.uz || tObj.en || '';
  }
  return String(text);
}

export function artLabel(code: string, lang: Lang): string {
  return lang === 'ru' ? `ст. ${code} УК` : lang === 'en' ? `Art. ${code} CC` : `JK ${code}`;
}

export const LANG_LABELS: Record<Lang, string> = {
  uz: 'O‘zbekcha',
  ru: 'Русский',
  en: 'English',
};

const DICT: Record<string, [string, string, string]> = {
  brandSub: ['IIV KIBER-TERGOV TIZIMI', 'МВД · КИБЕР-СЛЕДСТВИЕ', 'MVD CYBER INVESTIGATION'],
  grpMain: ['ASOSIY', 'ОСНОВНОЕ', 'MAIN'],
  grpLabs: ['LABORATORIYALAR', 'ЛАБОРАТОРИИ', 'INTELLIGENCE LABS'],
  grpWork: ['O‘QISH VA ISHLAR', 'ОБУЧЕНИЕ И ДЕЛА', 'LEARNING & CASES'],
  grpRef: ['MA’LUMOTNOMA VA ADMIN', 'СПРАВОЧНИК И АДМИН', 'REFERENCE & ADMIN'],
  status: ['Tizim faol', 'Система активна', 'System active'],
  mode: ['IIV Kiberxavfsizlik markazi', 'Центр кибербезопасности МВД', 'MVD Cyber Security Center'],
  platform: ['Platforma', 'Платформа', 'Platform'],
  footer: ['O‘quv va tahliliy kiber-razvedka platformasi', 'Учебная и аналитическая платформа киберразведки', 'Educational & analytical cyber intelligence platform'],
  contentNote: ['', 'Содержание алгоритмов приведено на узбекском языке (язык оригинала).', 'Algorithm content is shown in Uzbek (source language).'],
  back: ['Orqaga', 'Назад', 'Back'],
  backToDash: ['Bosh sahifaga', 'На главную', 'Home'],
  backToCat: ['Katalogga qaytish', 'В каталог', 'Back to catalog'],

  // Pages
  p_dashboard: ['Tahliliy markaz', 'Аналитический центр', 'Analytical Center'],
  p_catalog: ['Jinoyatlar katalogi', 'Каталог преступлений', 'Crime catalog'],
  p_wizard: ['Kvalifikatsiya yordamchisi', 'Помощник квалификации', 'Qualification assistant'],
  p_universal: ['Universal algoritm', 'Универсальный алгоритм', 'Universal algorithm'],
  p_evidence: ['Dalillar chek-listi', 'Чек-лист доказательств', 'Evidence checklist'],
  p_evidenceCenter: ['Dalillar markazi', 'Центр доказательств', 'Evidence Center'],
  p_case: ['Ishlar reyestri va dosyie', 'Дела и досье', 'Cases & Dossier'],
  p_graph: ['Aloqalar grafi', 'Граф связей', 'Intelligence Graph'],
  p_knowledge: ['Bilimlar bazasi 2.0', 'База знаний 2.0', 'Knowledge Base 2.0'],
  p_law: ['Huquqiy asos', 'Правовая основа', 'Legal basis'],
  p_expert: ['Ekspertiza markazi', 'Экспертиза', 'Expert examination'],
  p_dead: ['Tupikdan chiqish yo‘llari', 'Выход из тупика', 'Ways out of a dead end'],
  p_reject: ['Rad etishdan oldin', 'Перед отказом', 'Before rejecting'],
  p_ai: ['AI Yordamchi', 'ИИ-помощник', 'AI Assistant'],
  p_osint: ['OSINT Laboratoriya', 'OSINT Лаборатория', 'OSINT Lab'],
  p_forensics: ['Raqamli kriminalistika', 'Цифровая криминалистика', 'Digital Forensics'],
  p_simulator: ['Tergov simulyatori', 'Симулятор расследований', 'Case Simulator'],
  p_map: ['O‘zbekiston kiberxaritasi', 'Киберкарта Узбекистана', 'Uzbekistan Cyber Map'],
  p_prediction: ['AI Jinoyatlar Prognozi', 'ИИ-прогноз угроз', 'AI Crime Forecast'],
  p_tests: ['Test markazi', 'Центр тестирования', 'Test Center'],
  p_profile: ['Shaxsiy kabinet', 'Личный кабинет', 'Personal Dashboard'],
  p_reports: ['Hisobotlar generatori', 'Генератор отчётов', 'Report Generator'],
  p_admin: ['Xavfsizlik va Admin', 'Управление и аудит', 'Admin & Security'],

  // Eyebrows
  e_dashboard: ['IDORAVIY TAHLIL MARKAZI', 'ВЕДОМСТВЕННЫЙ АНАЛИТИЧЕСКИЙ ЦЕНТР', 'INSTITUTIONAL ANALYTICAL CENTER'],
  e_catalog: ['JK MODDALARI VA USULLAR', 'СТАТЬИ УК И СПОСОБЫ', 'CRIMINAL CODE ARTICLES & METHODS'],
  e_art: ['TERGOV ALGORITMI', 'АЛГОРИТМ РАССЛЕДОВАНИЯ', 'INVESTIGATION ALGORITHM'],
  e_wizard: ['DASTLABKI TAHLIL', 'ПРЕДВАРИТЕЛЬНЫЙ АНАЛИЗ', 'PRELIMINARY ANALYSIS'],
  e_universal: ['BIRINCHI SOAT', 'ПЕРВЫЙ ЧАС', 'THE FIRST HOUR'],
  e_evidence: ['NAZORAT VA TEKSHIRUV', 'КОНТРОЛЬ И ПРОВЕРКА', 'CONTROL & VERIFICATION'],
  e_evidenceCenter: ['SAQLASH ZANJIRI VA SHA-256', 'РЕЕСТР И ЦЕЛОСТНОСТЬ ДАННЫХ', 'DIGITAL EVIDENCE & CUSTODY'],
  e_case: ['ISH DOSYESI VA PROTSESS', 'ДОСЬЕ ИНЦИДЕНТА И ТАЙМЛАЙН', 'CASE DOSSIER & WORKFLOW'],
  e_graph: ['OBYEKTLAR VA BOG‘LIQLIKLAR', 'АНАЛИТИЧЕСКИЙ ГРАФ СВЯЗЕЙ', 'ENTITY & LINK INTELLIGENCE'],
  e_knowledge: ['BILIMLAR BAZASI 2.0', 'БАЗА ЗНАНИЙ 2.0', 'KNOWLEDGE BASE 2.0'],
  e_law: ['HUQUQIY ASOS', 'ПРАВОВАЯ ОСНОВА', 'LEGAL BASIS'],
  e_expert: ['EKSPERTIZA MARKAZI', 'ЭКСПЕРТИЗА', 'FORENSIC EXAMINATION'],
  e_dead: ['TUPIKDAN CHIQISH', 'ВЫХОД ИЗ ТУПИКА', 'WAY OUT OF A DEAD END'],
  e_reject: ['RAD ETISHDAN OLDIN', 'ПЕРЕД ОТКАЗОМ', 'BEFORE REJECTING'],
  e_ai: ['SUN’IY INTELLEKT MODULI', 'ИНТЕЛЛЕКТУАЛЬНЫЙ АССИСТЕНТ', 'AI INTELLIGENCE ASSISTANT'],
  e_osint: ['OCHIQ MANBALAR RAZVEDKASI', 'РАЗВЕДКА ПО ОТКРЫТЫМ ИСТОЧНИКАМ', 'OPEN SOURCE INTELLIGENCE'],
  e_forensics: ['RAQAMLI DALILLAR LABORATORIYASI', 'ЛАБОРАТОРИЯ ЦИФРОВОЙ КРИМИНАЛИСТИКИ', 'DIGITAL FORENSICS LAB'],
  e_simulator: ['INTERAKTIV TERGOV', 'ИНТЕРАКТИВНОЕ РАССЛЕДОВАНИЕ', 'CASE SIMULATION'],
  e_map: ['O‘ZBEKISTON RESPUBLIKASI · HUDUDIY TAHLIL', 'РЕСПУБЛИКА УЗБЕКИСТАН · КИБЕРКАРТА', 'REPUBLIC OF UZBEKISTAN · THREAT MAP'],
  e_prediction: ['PREDIKTIV AI ANALITIKA', 'ПРЕДИКТИВНАЯ ИИ-АНАЛИТИКА', 'PREDICTIVE AI ANALYTICS'],
  e_tests: ['BILIMNI TEKSHIRISH', 'ПРОВЕРКА ЗНАНИЙ', 'ASSESSMENT CENTER'],
  e_profile: ['SHAXSIY PROGRESS', 'ПРОФИЛЬ И ДОСТИЖЕНИЯ', 'PERSONAL PROGRESS'],
  e_reports: ['EKSPORT VA HUJJATLAR', 'ГЕНЕРАЦИЯ И ЭКСПОРТ ОТЧЁТОВ', 'REPORT BUILDER & EXPORT'],
  e_admin: ['RBAC, XAVFSIZLIK VA AUDIT', 'АДМИНИСТРИРОВАНИЕ И ЖУРНАЛ АУДИТА', 'RBAC & SECURITY AUDIT'],

  // Dashboard
  heroTitle: ['Kiberjinoyatlar bo‘yicha tergov va razvedka platformasi.', 'Платформа расследования киберпреступлений и киберразведки.', 'Cybercrime investigation & intelligence training platform.'],
  heroIntro: ['JK moddasi → sodir etish usuli → soatma-soat harakatlar. Kvalifikatsiya, OSINT laboratoriya, raqamli kriminalistika, tergov simulyatori, testlar va AI yordamchi.', 'Статья УК → способ совершения → действия по часам. Квалификация, лаборатория OSINT, цифровая криминалистика, симулятор расследований, тестирование и ИИ-помощник.', 'Criminal Code article → method → hour-by-hour steps. Qualification, OSINT lab, digital forensics, case simulator, testing center, and AI assistant.'],
  btnWizard: ['Kvalifikatsiyani aniqlash →', 'Определить квалификацию →', 'Determine qualification →'],
  btnCatalog: ['Katalogni ochish', 'Открыть каталог', 'Open catalog'],
  btnSimulator: ['Simulyatorni boshlash', 'Запустить симулятор', 'Launch simulator'],
  sArt: ['JK moddalari', 'Статьи УК', 'Code articles'],
  sMeth: ['Sodir etish usullari', 'Способы совершения', 'Methods'],
  sSteps: ['Algoritm harakatlari', 'Шагов алгоритма', 'Algorithm steps'],
  sSolve: ['Ochilish (viloyat)', 'Раскрываемость (область)', 'Clearance rate (region)'],
  nArt: ['Katalog bo‘limiga kirish →', 'Перейти в каталог →', 'Open catalog →'],
  nMeth: ['Barcha 41 usulni ko‘rish →', 'Смотреть все способы →', 'View all methods →'],
  nSteps: ['Universal algoritm va nazorat →', 'Алгоритм и чек-лист →', 'Algorithm & progress →'],
  nSolve: ['Operativ 24,7% · Tahlil →', 'Оперативно 24,7% · Анализ →', 'Operational 24.7% · Stats →'],
  quick: ['Tezkor kirish', 'Быстрый доступ', 'Quick access'],
  quickDesc: ['Tergov va ta’lim modullarini tanlang', 'Выберите нужный модуль платформы', 'Choose a platform module'],
  statsTitle: ['Viloyat va shahar statistikasi (rasmiy ma’lumotnoma)', 'Статистика области и города (справочные данные)', 'Regional & city statistics (reference)'],
  khorTitle: ['Viloyatdagi 18 ta usul → tegishli modda va algoritm', '18 способов в области → статья и алгоритм', '18 regional methods → article & algorithm'],
  artStatTitle: ['Modda bo‘yicha statistika', 'Статистика по статьям', 'Statistics by article'],

  // Quick descriptions
  d_catalog: ['25 ta JK moddasi, 41 ta usul va to‘liq algoritmlar.', '25 статей УК, 41 способ и полные алгоритмы.', '25 Code articles, 41 methods and full algorithms.'],
  d_wizard: ['Ariza mazmuniga qarab modda va usulni aniqlash.', 'Определение статьи и способа по содержанию заявления.', 'Find article and method from report details.'],
  d_universal: ['Har bir kiber-ariza uchun majburiy minimum.', 'Обязательный минимум для каждого киберзаявления.', 'Mandatory first-hour actions for any cyber report.'],
  d_evidence: ['Raqamli dalilni sudda rad etilmaydigan qilib rasmiylashtirish.', 'Оформление цифровых доказательств, устойчивое в суде.', 'Court-ready digital evidence handling checklist.'],
  d_ai: ['Savol-javob, hujjat tahlili (PDF/DOCX) va test tuzish.', 'Вопросы-ответы, анализ PDF/DOCX и генерация тестов.', 'Q&A, PDF/DOCX document analysis & quiz builder.'],
  d_osint: ['Domen, IP, metama’lumot tahlili va o‘quv topshiriqlari.', 'Анализ доменов, IP, метаданных и учебные задания.', 'Domain, IP, metadata analysis & training tasks.'],
  d_forensics: ['SHA-256 xesh, log tahlili, vaqt shkalasi va Chain of Custody.', 'Хеши SHA-256, анализ логов, таймлайн и Chain of Custody.', 'SHA-256 hashing, log analysis, timeline & Chain of Custody.'],
  d_simulator: ['O‘quv jinoyat ishlari bo‘yicha interaktiv tergov qarorlari.', 'Интерактивное расследование учебных кибер-кейсов.', 'Interactive cybercrime case decision simulator.'],
  d_map: ['O‘zbekistonning 14 hududi bo‘yicha real ishlar va rasmiy statistika.', 'Киберкарта 14 регионов Узбекистана с реальной статистикой и делами.', 'Interactive 14-region Uzbekistan map with live cases and official stats.'],
  d_prediction: ['Real ma’lumotlar asosida kelgusi kiberjinoyatlarni AI orqali prognozlash.', 'ИИ-прогнозирование будущих киберпреступлений, рисков и мер упреждения.', 'AI forecasting of emerging cybercrime threats and preventive measures.'],
  d_tests: ['Qiyinlik darajalari, taymer va PDF sertifikat.', 'Уровни сложности, таймер и PDF-сертификат.', 'Difficulty tiers, timer & PDF completion certificate.'],
  d_reports: ['PDF va DOCX formatida tergov hisobotini eksport qilish.', 'Экспорт отчётов об инциденте и уликах в PDF и DOCX.', 'Export incident & forensic reports to PDF and DOCX.'],
  d_expert: ['Kompyuter-texnik va boshqa ekspertiza savollari konstruktori.', 'Конструктор вопросов для компьютерно-технической и других экспертиз.', 'Interactive forensic examination question builder.'],

  // Catalog
  catDesc: ['25 ta JK moddasi va 41 ta sodir etish usuli. Modda yoki usul ko‘rinishini tanlang yoxud barcha algoritmlar bo‘yicha qidiring.', '25 статей УК и 41 способ совершения. Выберите режим статей/способов или ищите по всем алгоритмам.', '25 Criminal Code articles and 41 methods. Switch between articles/methods or search across all algorithms.'],
  catSearch: ['Modda, usul yoki kalit so‘z (masalan: APK, drop, 168)...', 'Статья, способ или ключевое слово (например: APK, дроп, 168)...', 'Article, method or keyword (e.g. APK, drop, 168)...'],
  allGroups: ['Barcha bo‘limlar', 'Все разделы', 'All sections'],
  viewArticles: ['Moddalar bo‘yicha (25)', 'По статьям УК (25)', 'By Articles (25)'],
  viewMethods: ['Barcha usullar (41)', 'Все способы (41)', 'All Methods (41)'],
  nMethods: ['{0} ta usul', 'Способов: {0}', '{0} methods'],
  open: ['Ochish', 'Открыть', 'Open'],
  noResults: ['Hech narsa topilmadi.', 'Ничего не найдено.', 'Nothing found.'],
  foundN: ['Topildi: {0}', 'Найдено: {0}', 'Found: {0}'],

  // Article detail
  qualH: ['Malakalash', 'Квалификация', 'Qualification'],
  pillCity: ['Toshkent sh.: {0}', 'г. Ташкент: {0}', 'Tashkent city: {0}'],
  pillRegion: ['Viloyat: {0}', 'Область: {0}', 'Region: {0}'],
  methodH: ['Usul:', 'Способ:', 'Method:'],
  mechH: ['Mexanizm', 'Механизм', 'Mechanism'],
  extraH: ['Qo‘shimcha', 'Дополнительно', 'Additional'],
  versH: ['Versiyalar', 'Версии', 'Versions'],
  algH: ['Harakatlar algoritmi', 'Алгоритм действий', 'Action algorithm'],
  stepsN: ['{0} ta harakat', 'Действий: {0}', '{0} actions'],
  keyH: ['Fosh etish kaliti', 'Ключ к раскрытию', 'Key to solving'],
  errH: ['Tipik xatolar', 'Типичные ошибки', 'Typical mistakes'],
  expH: ['Ekspertizalar', 'Экспертизы', 'Expert examinations'],
  alsoH: ['Qo‘shimcha bo‘limlar:', 'См. также:', 'See also:'],
  notFound: ['Sahifa topilmadi.', 'Страница не найдена.', 'Page not found.'],

  // Casebar
  cbTitle: ['Ish varaqasi', 'Карточка дела', 'Case file'],
  cbNo: ['Ish raqami:', 'Номер дела:', 'Case no.:'],
  cbPh: ['masalan 2026-123', 'например 2026-123', 'e.g. 2026-123'],
  cbDone: ['{0}/{1} bajarildi', '{0}/{1} выполнено', '{0}/{1} done'],
  cbCopy: ['Matnni nusxalash', 'Копировать текст', 'Copy text'],
  cbClear: ['Belgilarni tozalash', 'Сбросить отметки', 'Clear marks'],
  copied: ['Nusxalandi', 'Скопировано', 'Copied'],
  copyFail: ['Nusxalab bo‘lmadi', 'Не удалось скопировать', 'Copy failed'],
  marksCleared: ['Belgilar tozalandi', 'Отметки сброшены', 'Marks cleared'],
  caseWord: ['Ish', 'Дело', 'Case'],

  // Wizard
  wzLead: ['Ariza mazmuniga qarab savollarga javob bering — yordamchi modda va usulni ko‘rsatadi. Yakuniy kvalifikatsiya tergovchi va prokuror qarori bilan belgilanadi.', 'Отвечайте на вопросы по содержанию заявления — помощник покажет статью и способ. Окончательную квалификацию определяют следователь и прокурор.', 'Answer the questions based on the report — the assistant points to the article and method. Final qualification is decided by the investigator and prosecutor.'],
  wzRestart: ['Qaytadan boshlash', 'Начать заново', 'Start over'],
  wzResH: ['Tegishli modda va usullar', 'Подходящие статьи и способы', 'Relevant articles & methods'],
  wzResNote: ['Bir nechta usul bo‘lsa, mexanizm tavsifini ariza bilan solishtirib tanlang. Jamlik (masalan, 169 + 278-6) malakalash bo‘limida ko‘rsatilgan.', 'Если способов несколько, сравните описание механизма с заявлением. Совокупность (например, 169 + 278-6) указана в разделе квалификации.', 'If multiple methods appear, compare each mechanism with the report. Combinations (e.g. 169 + 278-6) are shown in qualification.'],

  // Evidence checklist
  evLead: ['Raqamli dalil sudda rad etilmasligi uchun har bir bandni belgilang. Belgilar ish raqami bo‘yicha brauzerda saqlanadi.', 'Отметьте каждый пункт, чтобы цифровое доказательство не было отклонено судом. Отметки сохраняются в браузере по номеру дела.', 'Tick each item to ensure digital evidence stands in court. Saved per case number in your browser.'],

  // Case Page
  caseDesc: ['Hodisa bo‘yicha ishchi qaydlarni kiriting. Ma’lumotlar ushbu brauzer xotirasida saqlanadi va hisobot generatoriga uzatilishi mumkin.', 'Внесите рабочие записи по происшествию. Данные сохраняются в памяти этого браузера и могут быть переданы в генератор отчётов.', 'Enter working case notes. Stored locally in your browser and available for export in Report Generator.'],
  caseNumber: ['Ish raqami', 'Номер дела', 'Case number'],
  caseDate: ['Hodisa aniqlangan sana', 'Дата выявления происшествия', 'Date identified'],
  caseName: ['Hodisa nomi', 'Название происшествия', 'Incident title'],
  caseNamePh: ['Hodisa nomini kiriting', 'Введите название происшествия', 'Enter incident title'],
  caseDetails: ['Hodisa tafsilotlari', 'Подробности происшествия', 'Incident details'],
  caseDetailsPh: ['Hodisa bo‘yicha ishchi qaydlar...', 'Рабочие записи по происшествию...', 'Working notes about the incident...'],
  caseEvidence: ['Mavjud dalillar', 'Имеющиеся доказательства', 'Available evidence'],
  caseEvidencePh: ['Mavjud dalillar, manbalar va qaydlar...', 'Имеющиеся доказательства, источники и заметки...', 'Available evidence, sources, and notes...'],
  caseTasks: ['Keyingi vazifalar', 'Следующие задачи', 'Next tasks'],
  caseTasksPh: ['Keyingi bajariladigan ishlar...', 'Предстоящие действия...', 'Actions to complete...'],
  save: ['Saqlash', 'Сохранить', 'Save'],
  print: ['Chop etish', 'Печать', 'Print'],
  clear: ['Tozalash', 'Очистить', 'Clear'],
  sendToReport: ['Hisobotga yuborish', 'Отправить в отчёт', 'Send to Report'],
  saved: ['Saqlandi', 'Сохранено', 'Saved'],
  cleared: ['Ma’lumotlar tozalandi', 'Данные очищены', 'Data cleared'],
  confirmClear: ['Barcha ish varaqasi ma’lumotlari o‘chirilsinmi?', 'Удалить все данные карточки дела?', 'Delete all case file data?'],
  privacy: ['Maxfiy yoki shaxsga doir real ma’lumotlarni ushbu o‘quv platformasiga kiritmang. Saqlash faqat shu brauzer doirasida amalga oshadi.', 'Не вводите конфиденциальные или реальные персональные данные в эту учебную платформу. Сохранение выполняется только в этом браузере.', 'Do not enter confidential or real personal data into this training platform. Stored only in this browser.'],
  progH: ['Algoritmlar bo‘yicha progress', 'Прогресс по алгоритмам', 'Algorithm progress'],
  progNone: ['Bu ish raqami bo‘yicha hali belgilangan harakat yo‘q. Katalogdan usulni tanlab, harakatlarni belgilang.', 'По этому номеру дела пока нет отметок. Выберите способ в каталоге и отмечайте действия.', 'No actions ticked for this case number yet. Choose a method in Catalog and tick steps.'],

  // General actions
  copy: ['Nusxalash', 'Копировать', 'Copy'],
  delete: ['O‘chirish', 'Удалить', 'Delete'],
  add: ['Qo‘shish', 'Добавить', 'Add'],
  exportPdf: ['PDF eksport', 'Экспорт в PDF', 'Export PDF'],
  exportDocx: ['DOCX eksport', 'Экспорт в DOCX', 'Export DOCX'],
  trainingBadge: ['O‘QUV MA’LUMOTI (SIMULYATSIYA)', 'УЧЕБНЫЕ ДАННЫЕ (СИМУЛЯЦИЯ)', 'TRAINING DATA (SIMULATED)'],
  officialBadge: ['RASMIY MA’LUMOTNOMA', 'ОФИЦИАЛЬНАЯ СПРАВКА', 'OFFICIAL REFERENCE'],
};

export function t(key: string, lang: Lang, ...args: (string | number)[]): string {
  const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
  const entry = DICT[key];
  const raw = entry ? entry[idx] : key;
  return raw.replace(/\{(\d+)\}/g, (_, n) => String(args[Number(n)] ?? ''));
}

export function tr(lang: Lang, uz: string, ru: string, en: string): string {
  return lang === 'uz' ? uz : lang === 'ru' ? ru : en;
}

const DEPT_LABELS: Record<string, [string, string, string]> = {
  dept_cyber: ['Kiberjinoyatlar bo‘limi', 'Отдел расследования киберпреступлений', 'Cybercrime Investigation Dept.'],
  dept_forensics: ['Raqamli kriminalistika', 'Лаборатория цифровой криминалистики', 'Digital Forensics Lab'],
  dept_osint: ['OSINT va razvedka', 'Отдел OSINT и киберразведки', 'OSINT & Intelligence Unit'],
  dept_oversight: ['Nazorat va tahlil', 'Управление анализа и контроля', 'Oversight & Analytical Bureau'],
};

export function deptLabel(deptId: string, lang: Lang): string {
  const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
  return DEPT_LABELS[deptId]?.[idx] || deptId;
}

const SEEDED_TEXT_MAP: Record<string, [string, string]> = {
  // Seeded cases & metadata
  'Учебный кейс: распространение вредоносного APK под видом налогового уведомления': [
    'O‘quv keys: soliq xabarnomasi niqobida zararli APK tarqatish',
    'Training Case: Malicious APK Distribution Disguised as Tax Notice',
  ],
  'Учебный кейс: фишинговый клон платёжного портала и перехват реквизитов': [
    'O‘quv keys: to‘lov portali fishing kloni va rekvizitlarni o‘g‘irlash',
    'Training Case: Payment Portal Phishing Clone & Credential Interception',
  ],
  'Учебный кейс: нелегальный SIM-Box шлюз и подмена вызовов': [
    'O‘quv keys: noqonuniy SIM-Box shlyuzi va qo‘ng‘iroqlarni soxtalashtirish',
    'Training Case: Illegal SIM-Box Gateway & Caller ID Spoofing',
  ],
  'Ведомственная проверка: компрометация корпоративного почтового шлюза': [
    'Idoraviy tekshiruv: korporativ pochta shlyuzining komprometatsiyasi',
    'Departmental Review: Corporate Mail Gateway Compromise',
  ],
  'Рабочее производство: компрометация корпоративного шлюза и P2P-вывод': [
    'Ishchi ish: korporativ shlyuz komprometatsiyasi va P2P chiqarib olish',
    'Working Case: Corporate Gateway Compromise & P2P Outflow',
  ],
  'Моделируемый учебный инцидент по перехвату OTP-кодов через Android-троян (Soliq_Qarzdorlik_2026.apk) с последующим выводом средств на транзитную карту.': [
    'Android troyan (Soliq_Qarzdorlik_2026.apk) orqali OTP-kodlarni ushlab qolish va mablag‘ni tranzit kartaga chiqarish bo‘yicha modellashtirilgan o‘quv hodisasi.',
    'Simulated training incident involving OTP interception via an Android trojan (Soliq_Qarzdorlik_2026.apk) followed by transit-card cashout.',
  ],
  'Учебное исследование аномалий CDR-логов базовых станций при маршрутизации VoIP-трафика через многослотовый GSM-шлюз.': [
    'Ko‘p slotli GSM-shlyuz orqali VoIP-trafikni yo‘naltirishda baza stansiyalari CDR-loglari anomaliyalarini o‘quv tahlil qilish.',
    'Training analysis of base-station CDR log anomalies during VoIP traffic routing through a multi-slot GSM gateway.',
  ],
  'Служебная проверка несанкционированного доступа к журналу аутентификации и подозрительного экспорта адресной книги.': [
    'Autentifikatsiya jurnaliga ruxsatsiz kirish va manzillar kitobining shubhali eksporti bo‘yicha xizmat tekshiruvi.',
    'Internal review of unauthorized authentication log access and suspicious address book export.',
  ],
  'Учебный сценарий анализа фишинговой инфраструктуры: клонированный сайт, Telegram-бот сбора данных, поиск связей через RDAP/crt.sh.': [
    'Fishing infratuzilmasini tahlil qilish o‘quv ssenariysi: klonlangan sayt, ma’lumot yig‘uvchi Telegram-bot va RDAP/crt.sh orqali aloqalarni izlash.',
    'Training phishing infrastructure scenario: cloned portal, Telegram credential bot, and infrastructure pivoting via RDAP/crt.sh.',
  ],
  'ст. 169 ч. 3 п. «б» + ст. 278-6 УК РУз (учебная фабула).': [
    'O‘zR JK 169-m. 3-q. «b» b. + 278-6-m. (o‘quv fabulasi).',
    'Art. 169(3)(b) + Art. 278-6 CC RUz (training scenario).',
  ],
  'ст. 278-2 / ст. 278-7 УК РУз (учебная симуляция).': [
    'O‘zR JK 278-2 / 278-7-m. (o‘quv simulyatsiyasi).',
    'Art. 278-2 / Art. 278-7 CC RUz (training simulation).',
  ],
  'Предварительная оценка по ст. 278-1, 278-3 УК РУз.': [
    'O‘zR JK 278-1, 278-3-moddalar bo‘yicha dastlabki baho.',
    'Preliminary qualification under Art. 278-1, 278-3 CC RUz.',
  ],
  'Учебная группа А-1': ['O‘quv guruhi A-1', 'Training Group A-1'],
  'Группа OSINT-2': ['OSINT-2 guruhi', 'OSINT-2 Group'],
  'Учебная группа OSINT-2': ['OSINT-2 o‘quv guruhi', 'OSINT-2 Training Group'],
  'Отдел киберрасследований №1': ['1-son kibertergov bo‘limi', 'Cyber Investigation Unit #1'],
  'Отдел КБ (ограниченный доступ)': ['Kiberxavfsizlik bo‘limi (cheklangan)', 'Cyber Unit (Restricted)'],

  // Timeline & authors
  'Заявитель получил файл Soliq_Qarzdorlik_2026.apk в мессенджере Telegram.': [
    'Arizachi Telegram messenjerida Soliq_Qarzdorlik_2026.apk faylini qabul qilgan.',
    'Complainant received Soliq_Qarzdorlik_2026.apk via Telegram.',
  ],
  'Опрос заявителя (учебный сценарий)': [
    'Arizachi bilan suhbat (o‘quv ssenariysi)',
    'Complainant interview (training scenario)',
  ],
  'Методический центр': ['Metodik markaz', 'Methodological Center'],
  'Обнаружено исходящее соединение на узел 185.220.101.44:8443 и запрос RECEIVE_SMS.': [
    '185.220.101.44:8443 tuguniga chiquvchi ulanish va RECEIVE_SMS so‘rovi aniqlandi.',
    'Outbound connection to 185.220.101.44:8443 and RECEIVE_SMS permission detected.',
  ],
  'Песочница / Статический анализ APK': [
    'Sandboks / APK statik tahlili',
    'Sandbox / Static APK Analysis',
  ],
  'Лаборатория КТЭ': ['KTE laboratoriyasi', 'Digital Forensics Lab'],
  'Зафиксирован перевод через P2P-шлюз; сформирован запрос на заморозку транзакции.': [
    'P2P-shlyuz orqali o‘tkazma qayd etildi; tranzaksiyani muzlatish so‘rovi shakllantirildi.',
    'P2P gateway transfer recorded; transaction freeze request generated.',
  ],
  'Антифрод-журнал (модель)': ['Antifrod jurnali (model)', 'Anti-Fraud Log (Model)'],
  'Отдел расследований': ['Tergov bo‘limi', 'Investigation Department'],
  'Выявлена концентрация 420 исходящих вызовов с одного IMEI-пула за 2 часа.': [
    '2 soat ichida bitta IMEI-puldan 420 ta chiquvchi qo‘ng‘iroq jamlanishi aniqlandi.',
    '420 outbound calls concentrated from a single IMEI pool within 2 hours.',
  ],
  'Телеком-мониторинг (учебн.)': ['Telekom-monitoring (o‘quv)', 'Telecom Monitoring (Training)'],
  'Аналитический центр': ['Tahliliy markaz', 'Analytical Center'],
  'Зафиксирована попытка входа вне рабочего времени с IP 91.214.124.19.': [
    'Ish vaqtidan tashqari 91.214.124.19 IP-manzilidan kirish urinishi qayd etildi.',
    'Off-hours login attempt recorded from IP 91.214.124.19.',
  ],
  'Дежурная смена': ['Navbatchi smena', 'Duty Shift'],

  // Entities
  'Фишинговая страница загрузки APK (учебный индикатор)': [
    'APK yuklab olish fishing sahifasi (o‘quv indikatori)',
    'Phishing APK download page (training indicator)',
  ],
  'Предполагаемый C2-сервер сбора SMS': [
    'SMS yig‘uvchi taxminiy C2-server',
    'Suspected SMS-harvesting C2 server',
  ],
  'Условный дроп-аккаунт #D-402': [
    'Shartli drop-akkaunt #D-402',
    'Simulated Mule Account #D-402',
  ],
  'Транзитный получатель в учебном сценарии': [
    'O‘quv ssenariysidagi tranzit qabul qiluvchi',
    'Transit recipient in training scenario',
  ],
  'Межбанковская сверка (учебн.)': [
    'Banklararo solishtirish (o‘quv)',
    'Interbank reconciliation (training)',
  ],
  'Учебный VoIP-агрегатор Node-7': [
    'O‘quv VoIP-agregatori Node-7',
    'Training VoIP Aggregator Node-7',
  ],
  'Точка входа SIP-трафика (модель)': [
    'SIP-trafik kirish nuqtasi (model)',
    'SIP traffic ingress point (model)',
  ],
  'Источник аномальной сессии SSH/IMAP': [
    'Anomal SSH/IMAP sessiyasi manbai',
    'Origin of anomalous SSH/IMAP session',
  ],

  // Materials & tasks & history
  'Протокол осмотра мобильного устройства (учебный образец)': [
    'Mobil qurilmani ko‘zdan kechirish bayonnomasi (o‘quv namunasi)',
    'Mobile device inspection protocol (training sample)',
  ],
  'Учебный стенд мобильной криминалистики': [
    'Mobil kriminalistika o‘quv stendi',
    'Mobile Forensics Training Bench',
  ],
  'Контрольная сумма подтверждена при передаче.': [
    'Topshirish chog‘ida nazorat summasi tasdiqlandi.',
    'Checksum verified upon transfer.',
  ],
  'Сопоставить сертификат подписи APK с базой серийных инцидентов': [
    'APK imzo sertifikatini seriyali hodisalar bazasi bilan solishtirish',
    'Compare APK signing certificate against serial incident database',
  ],
  'Дежурный аналитик': ['Navbatchi tahlilchi', 'Duty Analyst'],
  'Подготовить перечень вопросов для КТЭ экспертизы': [
    'KTE ekspertizasi uchun savollar ro‘yxatini tayyorlash',
    'Prepare list of questions for computer-technical forensics',
  ],
  'Следователь-стажёр': ['Tergovchi-stajyor', 'Trainee Investigator'],
  'Проверить IMEI-связку и сектор базовой станции БС-114': [
    'IMEI bog‘lanishi va BS-114 baza stansiyasi sektorini tekshirish',
    'Verify IMEI cluster and base station BS-114 sector',
  ],
  'Аналитик OSINT': ['OSINT tahlilchisi', 'OSINT Analyst'],
  'Зафиксировать дамп логов nginx и почтового ретранслятора с SHA-256': [
    'nginx va pochta retranslyatori loglari dampini SHA-256 bilan qayd etish',
    'Capture nginx and mail relay log dump with SHA-256',
  ],
  'Специалист КТЭ': ['KTE mutaxassisi', 'Forensics Specialist'],
  'Система инициализации': ['Boshlang‘ich tizim', 'System Initialization'],
  'Создано учебное дело TRN-2026-014 (уровень доступа: training).': [
    'TRN-2026-014 o‘quv ishi yaratildi (kirish darajasi: training).',
    'Training case TRN-2026-014 created (access level: training).',
  ],
  'Создано учебное дело TRN-2026-021.': [
    'TRN-2026-021 o‘quv ishi yaratildi.',
    'Training case TRN-2026-021 created.',
  ],
  'Создано рабочее дело WRK-2026-108 (доступ: отдел dept_cyber).': [
    'WRK-2026-108 ishchi ishi yaratildi (kirish: dept_cyber bo‘limi).',
    'Working case WRK-2026-108 created (scope: dept_cyber).',
  ],
  'Проверить SSL-сертификаты домена через crt.sh и сверить хэш APK': [
    'crt.sh orqali domen SSL-sertifikatlarini tekshirish va APK xeshini solishtirish',
    'Verify domain SSL certificates via crt.sh and compare APK SHA-256 hash',
  ],
  'Подготовить проект постановления о компьютерно-технической экспертизе': [
    'Kompyuter-texnik ekspertiza tayinlash bo‘yicha qaror loyihasini tayyorlash',
    'Prepare draft decree for computer-technical forensic examination',
  ],
  'Сопоставить таймлайн входа в биллинг и крипто-вывод': [
    'Billing tizimiga kirish taymlayni va kripto-chiqimni solishtirish',
    'Correlate billing login timeline with cryptocurrency outflow',
  ],

  // Evidence records
  'Soliq_Qarzdorlik_2026.apk (учебный образец)': [
    'Soliq_Qarzdorlik_2026.apk (o‘quv namunasi)',
    'Soliq_Qarzdorlik_2026.apk (training sample)',
  ],
  'Учебный стенд / Дамп кэша Telegram': [
    'O‘quv stendi / Telegram kesh dampi',
    'Training Bench / Telegram Cache Dump',
  ],
  'Изолированное хранилище стенда №1': [
    '1-stend izolyatsiyalangan ombori',
    'Isolated Bench Vault #1',
  ],
  'Разрешения: RECEIVE_SMS, READ_SMS, BIND_ACCESSIBILITY_SERVICE': [
    'Ruxsatlar: RECEIVE_SMS, READ_SMS, BIND_ACCESSIBILITY_SERVICE',
    'Permissions: RECEIVE_SMS, READ_SMS, BIND_ACCESSIBILITY_SERVICE',
  ],
  'Рабочая копия #WC-01: выделен C2-адрес 185.220.101.44 в classes.dex.': [
    'Ishchi nusxa #WC-01: classes.dex ichidan 185.220.101.44 C2-manzili ajratib olindi.',
    'Working Copy #WC-01: extracted C2 address 185.220.101.44 from classes.dex.',
  ],
  'Дежурный инспектор': ['Navbatchi inspektor', 'Duty Inspector'],
  'Первичная фиксация и статический анализ': [
    'Birlamchi qayd etish va statik tahlil',
    'Initial seizure and static analysis',
  ],
  'Первичная регистрация учебного образца и расчёт SHA-256.': [
    'O‘quv namunasini birlamchi ro‘yxatga olish va SHA-256 hisoblash.',
    'Initial training sample registration and SHA-256 computation.',
  ],
  'Почтовый шлюз (экспорт syslog)': [
    'Pochta shlyuzi (syslog eksporti)',
    'Mail Gateway (syslog export)',
  ],
  'Секция вещественных носителей Б-2': [
    'Ashyoviy tashuvchilar bo‘limi B-2',
    'Physical Media Vault B-2',
  ],
  '1 420 строк журнала аутентификации IMAP/SSH': [
    '1 420 qatorli IMAP/SSH autentifikatsiya jurnali',
    '1,420 lines of IMAP/SSH authentication logs',
  ],
  'Ожидает сверки временных меток с внешним прокси.': [
    'Tashqi proksi bilan vaqt belgilarini solishtirishni kutmoqda.',
    'Awaiting timestamp correlation with external proxy.',
  ],
  'Администратор ИБ': ['Axborot xavfsizligi administratori', 'InfoSec Administrator'],
  'Проверка аномальной сессии': ['Anomal sessiyani tekshirish', 'Anomalous session review'],
  'Журнал помещён на проверку целостности.': [
    'Jurnal butunligini tekshirishga qo‘yildi.',
    'Log queued for integrity verification.',
  ],
  'Секция цифрового хранения №2 (учебный фонд)': [
    'Raqamli saqlash bo‘limi №2 (o‘quv fondi)',
    'Digital Custody Vault #2 (Training Reserve)',
  ],
  'Секция КТЭ №1 (учебный фонд)': [
    'KTE bo‘limi №1 (o‘quv fondi)',
    'Forensics Vault #1 (Training Reserve)',
  ],
  'Секция цифрового хранения': ['Raqamli saqlash bo‘limi', 'Digital Storage Vault'],
  'Зарегистрировано в Центре доказательств': [
    'Dalillar markazida ro‘yxatga olingan',
    'Registered in Evidence Center',
  ],

  // Graph nodes & edges
  'APK-фишинг (учебное дело)': ['APK-fishing (o‘quv ishi)', 'APK Phishing (Training Case)'],
  'Домен распространения APK': ['APK tarqatish domeni', 'APK Distribution Domain'],
  'C2-узел перехвата OTP': ['OTP ushlab qoluvchi C2-tugun', 'OTP Interception C2 Node'],
  'Перехват OTP SMS': ['OTP SMS ushlab qolinishi', 'OTP SMS Interception'],
  '14:04 UTC (учебн.)': ['14:04 UTC (o‘quv)', '14:04 UTC (training)'],
  'Условный аккаунт #D-402': ['Shartli akkaunt #D-402', 'Simulated Account #D-402'],
  'Участник учебного сценария': ['O‘quv ssenariysi ishtirokchisi', 'Training Scenario Participant'],
  'Проверка почтового шлюза': ['Pochta shlyuzi tekshiruvi', 'Mail Gateway Audit'],
  'Аномальная SSH/IMAP сессия': ['Anomal SSH/IMAP sessiyasi', 'Anomalous SSH/IMAP Session'],
  'Статус': ['Holati', 'Status'],
  'В работе': ['Jarayonda', 'In Progress'],
  'Открыто': ['Ochiq', 'Open'],
  'Категория': ['Toifa', 'Category'],
  'APK-мошенничество': ['APK-firibgarlik', 'APK Fraud'],
  'Пломба': ['Plomba', 'Seal'],
  'Регистратор': ['Registrator', 'Registrar'],
  'Учебный стенд RDAP': ['RDAP o‘quv stendi', 'RDAP Training Bench'],
  'Порт': ['Port', 'Port'],
  'Учебный узел': ['O‘quv tuguni', 'Training Node'],
  'Источник': ['Manba', 'Source'],
  'Роль': ['Roli', 'Role'],
  'Гипотетический транзитный получатель': [
    'Gipotetik tranzit qabul qiluvchi',
    'Hypothetical Transit Recipient',
  ],
  'Доступ': ['Kirish', 'Access'],
  'Подразделение': ['Bo‘lim', 'Department'],
  'приобщено как доказательство': ['dalil sifatida biriktirilgan', 'attached as evidence'],
  'Реестр доказательств': ['Dalillar reyestri', 'Evidence Registry'],
  'загружен с домена': ['domendan yuklab olingan', 'downloaded from domain'],
  'Статический анализ APK / URL в браузере': [
    'APK statik tahlili / brauzer URL manzili',
    'Static APK Analysis / Browser URL',
  ],
  'передача телеметрии/SMS': ['telemetriya/SMS uzatilishi', 'telemetry/SMS exfiltration'],
  'Песочница PCAP': ['PCAP sandboksi', 'Sandbox PCAP'],
  'совпадение по времени': ['vaqt bo‘yicha moslik', 'temporal correlation'],
  'Корреляция таймлайна': ['Taymlayn korrelyatsiyasi', 'Timeline Correlation'],
  'аналитическая гипотеза маршрута': [
    'marshrut bo‘yicha tahliliy faraz',
    'analytical route hypothesis',
  ],
  'Рабочая версия аналитика (требует банковского подтверждения)': [
    'Tahlilchi ishchi versiyasi (bank tasdig‘ini talab qiladi)',
    'Analyst working hypothesis (requires bank confirmation)',
  ],
  'зафиксирован в SIEM-логе': ['SIEM-logda qayd etilgan', 'recorded in SIEM log'],

  // Reports & audit & notifications
  'Предварительный отчёт по учебному инциденту TRN-2026-014': [
    'TRN-2026-014 o‘quv hodisasi bo‘yicha dastlabki hisobot',
    'Preliminary Report on Training Incident TRN-2026-014',
  ],
  'Сводка по статическому анализу учебного APK и выделению индикаторов компрометации.': [
    'O‘quv APK statik tahlili va komprometatsiya indikatorlarini ajratish bo‘yicha xulosa.',
    'Summary of training APK static analysis and IoC extraction.',
  ],
  'Инициализировано ведомственное хранилище с разграничением прав RBAC.': [
    'RBAC huquqlari bilan himoyalangan idoraviy saqlash tizimi ishga tushirildi.',
    'Departmental RBAC data store initialized.',
  ],
  'Неподтверждённые материалы': [
    'Tasdiqlanmagan materiallar',
    'Pending Evidence Verification',
  ],
};

export function localizeRecordText(text: string, lang: Lang): string {
  if (!text || lang === 'ru') return text;
  const hit = SEEDED_TEXT_MAP[text];
  if (hit) return lang === 'uz' ? hit[0] : hit[1];

  // Dynamic notification / audit prefixes
  if (text.startsWith('Ожидают проверки целостности (SHA-256): ')) {
    const rest = text.slice('Ожидают проверки целостности (SHA-256): '.length);
    return lang === 'uz'
      ? `Butunlik tekshiruvini kutmoqda (SHA-256): ${rest}`
      : `Awaiting SHA-256 integrity check: ${rest}`;
  }
  if (text.startsWith('Задача ')) {
    const rest = text.slice('Задача '.length);
    return lang === 'uz' ? `Vazifa ${rest}` : `Task ${rest}`;
  }
  const evDateMatch = text.match(/^(.+) \((\d{4}-\d{2}-\d{2})\)$/);
  if (evDateMatch) {
    const translatedInner = SEEDED_TEXT_MAP[evDateMatch[1]];
    if (translatedInner) {
      return `${lang === 'uz' ? translatedInner[0] : translatedInner[1]} (${evDateMatch[2]})`;
    }
  }
  return text;
}

export function roleLabel(role: string | undefined, lang: Lang): string {
  const map: Record<string, [string, string, string]> = {
    admin: ['Administrator', 'Администратор', 'Administrator'],
    department_head: ['Bo‘lim boshlig‘i', 'Руководитель подразделения', 'Department Head'],
    officer: ['Tergovchi / Xodim', 'Сотрудник / Следователь', 'Officer'],
    analyst: ['Kiber-tahlilchi', 'Кибер-аналитик', 'Analyst'],
    observer: ['Kuzatuvchi', 'Наблюдатель', 'Observer'],
  };
  const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
  return (role && map[role]?.[idx]) || role || '';
}

export function caseStatusLabel(status: string, lang: Lang): string {
  const map: Record<string, [string, string, string]> = {
    open: ['Ochiq', 'Открыто', 'Open'],
    in_progress: ['Jarayonda', 'В работе', 'In Progress'],
    pending_review: ['Tekshiruvda', 'На проверке', 'Pending Review'],
    closed: ['Yopilgan', 'Закрыто', 'Closed'],
    archived: ['Arxivda', 'В архиве', 'Archived'],
  };
  const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
  return map[status]?.[idx] || status;
}

export function kindLabel(kind: string, lang: Lang): string {
  const map: Record<string, [string, string, string]> = {
    training: ['O‘quv ishi (training)', 'Учебное дело (training)', 'Training Case'],
    working: ['Ishchi ish (working)', 'Рабочее дело (working)', 'Working Case'],
  };
  const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
  return map[kind]?.[idx] || kind;
}

export function confidenceLabel(conf: string, lang: Lang): string {
  const map: Record<string, [string, string, string]> = {
    confirmed: ['confirmed (tasdiqlangan)', 'confirmed (подтверждённый факт)', 'confirmed (verified fact)'],
    indirect: ['indirect (bilvosita)', 'indirect (косвенный признак)', 'indirect (circumstantial)'],
    hypothesis: ['hypothesis (faraz)', 'hypothesis (аналитическая гипотеза)', 'hypothesis (working theory)'],
  };
  const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
  return map[conf]?.[idx] || conf;
}

export function priorityLabel(priority: string, lang: Lang): string {
  const map: Record<string, [string, string, string]> = {
    low: ['Past', 'Низкий', 'Low'],
    medium: ['O‘rta', 'Средний', 'Medium'],
    high: ['Yuqori', 'Высокий', 'High'],
  };
  const idx = lang === 'uz' ? 0 : lang === 'ru' ? 1 : 2;
  return map[priority]?.[idx] || priority;
}


