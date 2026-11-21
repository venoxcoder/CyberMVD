"use strict";
/* ==========================================================
   KIBERJINOYATLAR — yagona platforma
   Qobiq (uz/ru/en, mavzular) + data.js + pages.js
   ========================================================== */

const $ = s => document.querySelector(s);
const LANGS = ["uz", "ru", "en"];

/* ---------- localStorage (xatoga chidamli) ---------- */
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
function lsJSON(k, fallback) { try { return JSON.parse(lsGet(k) || "null") ?? fallback; } catch (e) { return fallback; } }

let lang = LANGS.includes(lsGet("kiberLanguage")) ? lsGet("kiberLanguage") : "uz";
const li = () => LANGS.indexOf(lang);

/* ==========================================================
   Kirill → lotin (o‘zbek). uz va en rejimida kontent lotinda,
   ru rejimida asl kirill yozuvida ko‘rsatiladi.
   ========================================================== */
const CYR = {
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ё": "yo", "ж": "j", "з": "z", "и": "i", "й": "y",
  "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
  "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "’", "ь": "", "ы": "i",
  "э": "e", "ю": "yu", "я": "ya", "ў": "o‘", "қ": "q", "ғ": "g‘", "ҳ": "h"
};
const CYR_VOWELS = "аеёиоуўэюя";
const CYR_RE = /[\u0400-\u04FF\u0500-\u052F]/;
const isUpperCyr = c => !!c && c !== c.toLowerCase() && CYR_RE.test(c);

function tx(str) {
  str = String(str ?? "");
  if (lang === "ru" || !CYR_RE.test(str)) return str;
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const lo = ch.toLowerCase();
    let m;
    if (lo === "е") {
      const prev = (str[i - 1] || "").toLowerCase();
      m = (!prev || !/\p{L}/u.test(prev) || CYR_VOWELS.includes(prev)) ? "ye" : "e";
    } else if (Object.prototype.hasOwnProperty.call(CYR, lo)) {
      m = CYR[lo];
    } else {
      out += ch;
      continue;
    }
    if (ch !== lo && m) { // bosh harf
      const nextUpper = isUpperCyr(str[i + 1]);
      m = (m.length > 1 && nextUpper) ? m.toUpperCase() : m[0].toUpperCase() + m.slice(1);
    }
    out += m;
  }
  return out;
}

const escRaw = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const esc = s => escRaw(tx(s));

/* ==========================================================
   Interfeys matnlari: [uz, ru, en]
   ========================================================== */
const I = {
  brandSub: ["TERGOV PLATFORMASI", "ПЛАТФОРМА РАССЛЕДОВАНИЯ", "INVESTIGATION PLATFORM"],
  grpMain: ["ASOSIY", "ОСНОВНОЕ", "MAIN"],
  grpWork: ["ISH JARAYONI", "РАБОЧИЙ ПРОЦЕСС", "WORKFLOW"],
  grpRef: ["MA’LUMOTNOMA", "СПРАВОЧНИК", "REFERENCE"],
  status: ["Tizim faol", "Система активна", "System active"],
  mode: ["Mahalliy ish rejimi", "Локальный режим", "Local browser mode"],
  platform: ["Platforma", "Платформа", "Platform"],
  footer: ["O‘quv va tahliliy platforma", "Учебная и аналитическая платформа", "Educational and analytical platform"],
  contentNote: ["", "Содержание алгоритмов приведено на узбекском языке (язык оригинала).", "Algorithm content is shown in Uzbek (the source language)."],

  /* sahifa nomlari */
  p_dashboard: ["Bosh sahifa", "Главная", "Home"],
  p_catalog: ["Jinoyatlar katalogi", "Каталог преступлений", "Crime catalog"],
  p_wizard: ["Kvalifikatsiya yordamchisi", "Помощник квалификации", "Qualification assistant"],
  p_universal: ["Universal algoritm", "Универсальный алгоритм", "Universal algorithm"],
  p_evidence: ["Dalillar chek-listi", "Чек-лист доказательств", "Evidence checklist"],
  p_case: ["Ish varaqasi", "Карточка дела", "Case file"],
  p_knowledge: ["Bilimlar bazasi", "База знаний", "Knowledge base"],
  p_law: ["Huquqiy asos", "Правовая основа", "Legal basis"],
  p_expert: ["Ekspertiza savollari", "Вопросы для экспертизы", "Expert questions"],
  p_dead: ["Tupikdan chiqish yo‘llari", "Выход из тупика", "Ways out of a dead end"],
  p_reject: ["Rad etishdan oldin", "Перед отказом", "Before rejecting"],

  e_dashboard: ["KIBERXAVFSIZLIK • TAHLIL • TERGOV", "КИБЕРБЕЗОПАСНОСТЬ • АНАЛИЗ • РАССЛЕДОВАНИЕ", "CYBERSECURITY • ANALYSIS • INVESTIGATION"],
  e_catalog: ["JK MODDALARI VA USULLAR", "СТАТЬИ УК И СПОСОБЫ", "CRIMINAL CODE ARTICLES AND METHODS"],
  e_art: ["TERGOV ALGORITMI", "АЛГОРИТМ РАССЛЕДОВАНИЯ", "INVESTIGATION ALGORITHM"],
  e_wizard: ["DASTLABKI TAHLIL", "ПРЕДВАРИТЕЛЬНЫЙ АНАЛИЗ", "PRELIMINARY ANALYSIS"],
  e_universal: ["BIRINCHI SOAT", "ПЕРВЫЙ ЧАС", "THE FIRST HOUR"],
  e_evidence: ["NAZORAT VA TEKSHIRUV", "КОНТРОЛЬ И ПРОВЕРКА", "CONTROL AND VERIFICATION"],
  e_case: ["HUJJATLASHTIRISH", "ДОКУМЕНТИРОВАНИЕ", "DOCUMENTATION"],
  e_knowledge: ["AXBOROT VA TUSHUNCHALAR", "ИНФОРМАЦИЯ И ПОНЯТИЯ", "INFORMATION AND CONCEPTS"],
  e_law: ["HUQUQIY ASOS", "ПРАВОВАЯ ОСНОВА", "LEGAL BASIS"],
  e_expert: ["EKSPERTIZA", "ЭКСПЕРТИЗА", "EXPERT EXAMINATION"],
  e_dead: ["TUPIKDAN CHIQISH", "ВЫХОД ИЗ ТУПИКА", "WAY OUT OF A DEAD END"],
  e_reject: ["RAD ETISHDAN OLDIN", "ПЕРЕД ОТКАЗОМ", "BEFORE REJECTING"],

  /* qisqa tavsiflar (kartalar) */
  d_catalog: ["JK moddalari, usullar va har biri bo‘yicha to‘liq algoritm.", "Статьи УК, способы и полный алгоритм по каждому.", "Code articles, methods and a full algorithm for each."],
  d_wizard: ["Ariza mazmuniga qarab modda va usulni aniqlash.", "Определение статьи и способа по содержанию заявления.", "Find the article and method from the report’s content."],
  d_universal: ["Har bir kiber-ariza uchun majburiy minimum.", "Обязательный минимум для каждого киберзаявления.", "The mandatory minimum for every cyber report."],
  d_evidence: ["Raqamli dalilni sudda rad etilmaydigan qilib rasmiylashtirish.", "Оформление цифровых доказательств, устойчивое в суде.", "Handling digital evidence so it survives in court."],
  d_case: ["Ish raqami bo‘yicha qaydlar va algoritm progressi.", "Записи по номеру дела и прогресс по алгоритмам.", "Case notes and algorithm progress."],
  d_law: ["JPK normalari va ularni qo‘llash tartibi.", "Нормы УПК и порядок их применения.", "Criminal Procedure Code norms and how to apply them."],

  /* bosh sahifa */
  heroTitle: ["Kiberjinoyatlar bo‘yicha tergov algoritmlari bir joyda.", "Алгоритмы расследования киберпреступлений в одном месте.", "Cybercrime investigation algorithms in one place."],
  heroIntro: ["JK moddasi → sodir etish usuli → soatma-soat harakatlar. O‘quv platformasi: kvalifikatsiya, birinchi soat algoritmi, dalillar chek-listi va ish varaqasi.", "Статья УК → способ совершения → действия по часам. Учебная платформа: квалификация, алгоритм первого часа, чек-лист доказательств и карточка дела.", "Criminal Code article → method → hour-by-hour actions. A training platform: qualification, first-hour algorithm, evidence checklist and case file."],
  btnWizard: ["Kvalifikatsiyani aniqlash →", "Определить квалификацию →", "Determine qualification →"],
  btnCatalog: ["Katalogni ochish", "Открыть каталог", "Open catalog"],
  sArt: ["JK moddalari", "Статьи УК", "Code articles"],
  sMeth: ["Sodir etish usullari", "Способы совершения", "Methods"],
  sSteps: ["Algoritm harakatlari", "Шагов алгоритма", "Algorithm steps"],
  sSolve: ["Ochilish (viloyat)", "Раскрываемость (область)", "Clearance rate (region)"],
  nArt: ["Katalogdagi bo‘limlar", "Разделов в каталоге", "Sections in the catalog"],
  nMeth: ["Har biri uchun algoritm", "Алгоритм для каждого", "An algorithm for each"],
  nSteps: ["Belgilab boriladigan bandlar", "Пункты с отметками", "Trackable items"],
  nSolve: ["Operativ ochilish 24,7%", "Оперативно 24,7%", "24.7% operational"],
  quick: ["Tezkor kirish", "Быстрый доступ", "Quick access"],
  quickDesc: ["Kerakli modulni tanlang", "Выберите нужный модуль", "Choose a module"],
  statsTitle: ["Viloyat va shahar statistikasi", "Статистика области и города", "Regional and city statistics"],
  khorTitle: ["Viloyatdagi 18 ta usul → tegishli modda va algoritm", "18 способов в области → статья и алгоритм", "18 methods in the region → article and algorithm"],
  khorCols: [["Usul", "Ish", "Zarar, mln so‘m", "Algoritm"], ["Способ", "Дел", "Ущерб, млн сум", "Алгоритм"], ["Method", "Cases", "Loss, mln UZS", "Algorithm"]],
  artStatTitle: ["Modda bo‘yicha statistika", "Статистика по статьям", "Statistics by article"],
  artStatCols: [["JK moddasi", "Nomi", "Toshkent sh., 2025-y. 9 oy", "Viloyat, 10 oy"], ["Статья УК", "Название", "г. Ташкент, 9 мес. 2025", "Область, 10 мес."], ["Article", "Title", "Tashkent, 9 mo. 2025", "Region, 10 mo."]],

  /* katalog */
  catDesc: ["25 ta JK moddasi va ularning sodir etish usullari. Moddani tanlang yoki barcha algoritmlar bo‘yicha qidiring.", "25 статей УК и способы их совершения. Выберите статью или ищите по всем алгоритмам.", "25 Criminal Code articles and their methods. Pick an article or search across all algorithms."],
  catSearch: ["Modda, usul yoki kalit so‘z (masalan: APK, drop, 168)...", "Статья, способ или ключевое слово (например: APK, дроп, 168)...", "Article, method or keyword (e.g. APK, drop, 168)..."],
  allGroups: ["Barcha bo‘limlar", "Все разделы", "All sections"],
  nMethods: ["{0} ta usul", "Способов: {0}", "{0} methods"],
  open: ["Ochish →", "Открыть →", "Open →"],
  noResults: ["Hech narsa topilmadi.", "Ничего не найдено.", "Nothing found."],
  foundN: ["Topildi: {0}", "Найдено: {0}", "Found: {0}"],

  /* modda sahifasi */
  qualH: ["Malakalash", "Квалификация", "Qualification"],
  pillCity: ["Toshkent sh.: {0}", "г. Ташкент: {0}", "Tashkent city: {0}"],
  pillRegion: ["Viloyat: {0}", "Область: {0}", "Region: {0}"],
  methodH: ["Usul:", "Способ:", "Method:"],
  mechH: ["Mexanizm.", "Механизм.", "Mechanism."],
  extraH: ["Qo‘shimcha.", "Дополнительно.", "Additional."],
  versH: ["Versiyalar", "Версии", "Versions"],
  algH: ["Harakatlar algoritmi", "Алгоритм действий", "Action algorithm"],
  stepsN: ["{0} ta harakat", "Действий: {0}", "{0} actions"],
  keyH: ["Fosh etish kaliti.", "Ключ к раскрытию.", "Key to solving the case."],
  errH: ["Tipik xatolar:", "Типичные ошибки:", "Typical mistakes:"],
  expH: ["Ekspertizalar", "Экспертизы", "Expert examinations"],
  alsoH: ["Qo‘shimcha:", "См. также:", "See also:"],
  notFound: ["Sahifa topilmadi.", "Страница не найдена.", "Page not found."],

  /* ish varaqasi paneli */
  cbTitle: ["Ish varaqasi", "Карточка дела", "Case file"],
  cbNo: ["Ish raqami:", "Номер дела:", "Case no.:"],
  cbPh: ["masalan 2026-123", "например 2026-123", "e.g. 2026-123"],
  cbDone: ["{0}/{1} bajarildi", "{0}/{1} выполнено", "{0}/{1} done"],
  cbCopy: ["Matnni nusxalash", "Копировать текст", "Copy text"],
  cbClear: ["Belgilarni tozalash", "Сбросить отметки", "Clear marks"],
  copied: ["Nusxalandi", "Скопировано", "Copied"],
  copyFail: ["Nusxalab bo‘lmadi", "Не удалось скопировать", "Copy failed"],
  marksCleared: ["Belgilar tozalandi", "Отметки сброшены", "Marks cleared"],
  caseWord: ["Ish", "Дело", "Case"],

  /* yordamchi (wizard) */
  wzLead: ["Ariza mazmuniga qarab savollarga javob bering — yordamchi modda va usulni ko‘rsatadi. Yakuniy kvalifikatsiya tergovchi va prokuror qarori bilan belgilanadi.", "Отвечайте на вопросы по содержанию заявления — помощник покажет статью и способ. Окончательную квалификацию определяют следователь и прокурор.", "Answer the questions based on the report — the assistant will point to the article and method. Final qualification is decided by the investigator and prosecutor."],
  wzRestart: ["qaytadan boshlash", "начать заново", "start over"],
  wzResH: ["Tegishli modda va usullar", "Подходящие статьи и способы", "Relevant articles and methods"],
  wzResNote: ["Bir nechta usul bo‘lsa, mexanizm tavsifini ariza bilan solishtirib tanlang. Jamlik (masalan, 169 + 278-6) malakalash bo‘limida ko‘rsatilgan.", "Если способов несколько, сравните описание механизма с заявлением. Совокупность (например, 169 + 278-6) указана в разделе квалификации.", "If there are several methods, compare each mechanism with the report. Combinations (e.g. 169 + 278-6) are listed in the qualification section."],

  /* dalillar chek-listi */
  evLead: ["Raqamli dalil sudda rad etilmasligi uchun har bir bandni belgilang. Belgilar ish raqami bo‘yicha brauzerda saqlanadi.", "Отметьте каждый пункт, чтобы цифровое доказательство не было отклонено судом. Отметки сохраняются в браузере по номеру дела.", "Tick every item so the digital evidence is not rejected in court. Marks are saved in this browser per case number."],

  /* ish varaqasi sahifasi */
  caseDesc: ["Hodisa bo‘yicha ishchi qaydlarni kiriting. Ma’lumotlar ushbu brauzer xotirasida saqlanadi.", "Внесите рабочие записи по происшествию. Данные сохраняются в памяти этого браузера.", "Enter working notes about the incident. Data is stored in this browser."],
  caseNumber: ["Ish raqami", "Номер дела", "Case number"],
  caseDate: ["Hodisa aniqlangan sana", "Дата выявления происшествия", "Date incident was identified"],
  caseName: ["Hodisa nomi", "Название происшествия", "Incident title"],
  caseNamePh: ["Hodisa nomini kiriting", "Введите название происшествия", "Enter the incident title"],
  caseDetails: ["Hodisa tafsilotlari", "Подробности происшествия", "Incident details"],
  caseDetailsPh: ["Hodisa bo‘yicha ishchi qaydlar...", "Рабочие записи по происшествию...", "Working notes about the incident..."],
  caseEvidence: ["Mavjud dalillar", "Имеющиеся доказательства", "Available evidence"],
  caseEvidencePh: ["Mavjud dalillar, manbalar va qaydlar...", "Имеющиеся доказательства, источники и заметки...", "Available evidence, sources, and notes..."],
  caseTasks: ["Keyingi vazifalar", "Следующие задачи", "Next tasks"],
  caseTasksPh: ["Keyingi bajariladigan ishlar...", "Предстоящие действия...", "Actions to be completed..."],
  save: ["Saqlash", "Сохранить", "Save"],
  print: ["Chop etish", "Печать", "Print"],
  clear: ["Tozalash", "Очистить", "Clear"],
  saved: ["Ish varaqasi saqlandi", "Карточка дела сохранена", "Case file saved"],
  cleared: ["Ma’lumotlar tozalandi", "Данные очищены", "Data cleared"],
  confirmClear: ["Barcha ish varaqasi ma’lumotlari o‘chirilsinmi?", "Удалить все данные карточки дела?", "Delete all case file data?"],
  privacy: ["Maxfiy yoki shaxsga doir ma’lumotlarni ushbu demo platformaga kiritmang. Saqlash faqat shu brauzer doirasida amalga oshadi.", "Не вводите конфиденциальные или персональные данные в эту демонстрационную платформу. Сохранение выполняется только в этом браузере.", "Do not enter confidential or personal information into this demo platform. Data is stored only in this browser."],
  progH: ["Algoritmlar bo‘yicha progress", "Прогресс по алгоритмам", "Algorithm progress"],
  progNone: ["Bu ish raqami bo‘yicha hali belgilangan harakat yo‘q. Katalogdan usulni tanlab, harakatlarni belgilang.", "По этому номеру дела пока нет отметок. Выберите способ в каталоге и отмечайте действия.", "No actions are marked for this case number yet. Pick a method in the catalog and tick the actions."],

  /* bilimlar bazasi */
  knowDesc: ["Raqamli tergov va kiberxavfsizlik sohasidagi asosiy tushunchalar.", "Основные понятия в области цифровых расследований и кибербезопасности.", "Key concepts in digital investigations and cybersecurity."]
};

const CONCEPTS = [
  [["Raqamli dalil", "Цифровое доказательство", "Digital evidence"],
   ["Elektron shaklda mavjud bo‘lgan va tegishli tartibda aniqlanishi, saqlanishi hamda tekshirilishi mumkin bo‘lgan ma’lumot.", "Информация в электронной форме, которая может быть выявлена, сохранена и проверена в установленном порядке.", "Information in electronic form that can be identified, preserved, and examined in accordance with established procedures."]],
  [["Metama’lumot", "Метаданные", "Metadata"],
   ["Fayl yoki raqamli obyekt haqidagi qo‘shimcha ma’lumotlar: yaratilgan vaqt, o‘zgartirilgan vaqt, format va boshqa xususiyatlar.", "Дополнительная информация о файле или цифровом объекте: время создания, изменения, формат и другие характеристики.", "Additional information about a file or digital object, such as creation time, modification time, format, and other properties."]],
  [["Xesh qiymati", "Хеш-значение", "Hash value"],
   ["Ma’lumot yaxlitligini tekshirishda qo‘llanadigan kriptografik qiymat. Masalan, SHA-256 algoritmi.", "Криптографическое значение, используемое для проверки целостности данных. Например, алгоритм SHA-256.", "A cryptographic value used to verify data integrity, such as one generated by the SHA-256 algorithm."]],
  [["Log fayllar", "Файлы журналов", "Log files"],
   ["Tizim yoki dastur faoliyati davomida qayd etilgan hodisalar, vaqt belgilari va texnik yozuvlar.", "Записи о событиях, временные метки и техническая информация, сохраняемые во время работы системы или программы.", "Records of events, timestamps, and technical information collected during system or software operation."]],
  [["Raqamli ekspertiza", "Цифровая экспертиза", "Digital forensics"],
   ["Elektron qurilmalar va raqamli ma’lumotlarni belgilangan metodika hamda vakolat doirasida tadqiq etish.", "Исследование электронных устройств и цифровых данных в рамках установленной методики и полномочий.", "The examination of electronic devices and digital data using established methods and within authorized powers."]],
  [["APK-troyan", "APK-троян", "APK trojan"],
   ["Qurbon telefoniga o‘rnatilib, SMS-kodlarni ushlaydigan va ekranni boshqaradigan zararli ilova. Bot tokeni orqali ishlar seriyaga birlashtiriladi.", "Вредоносное приложение на телефоне жертвы, перехватывающее SMS-коды и управляющее экраном. По токену бота дела объединяются в серию.", "A malicious app on the victim’s phone that intercepts SMS codes and controls the screen. Bot tokens link cases into a series."]],
  [["Drop-karta", "Дроп-карта", "Drop card"],
   ["Jinoyatdan olingan pulni qabul qilish va naqdlashtirish uchun uchinchi shaxs nomiga ochilgan karta yoki hisob.", "Карта или счёт, оформленные на третье лицо для приёма и обналичивания похищенных денег.", "A card or account opened in a third party’s name to receive and cash out stolen money."]]
];

/* ---------- yordamchilar ---------- */
function t(key, ...args) {
  const v = I[key] ? I[key][li()] : key;
  return typeof v === "string" ? v.replace(/\{(\d+)\}/g, (_, n) => args[n] ?? "") : v;
}
const tArr = key => I[key][li()];
const artLabel = code => lang === "ru" ? `ст. ${code} УК` : lang === "en" ? `Art. ${code} CC` : `JK ${code}`;
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const findM = id => { for (const a of ART) for (const m of a.m) if (m.id === id) return [a, m]; return null; };
function expand(steps) {
  const out = [];
  for (const s of steps) {
    if (s.startsWith("@")) {
      const k = s.slice(1).split(" ")[0];
      const rest = s.slice(1 + k.length);
      (B[k] || [s]).forEach((x, i) => out.push(i === 0 && rest ? x + rest : x));
    } else out.push(s);
  }
  return out;
}
const stepsOf = m => m.stages.map(s => expand(s.s));
const keysOf = m => { const k = []; stepsOf(m).forEach((st, si) => st.forEach((_, i) => k.push(`${m.id}|${si}|${i}`))); return k; };
const EV_KEYS = () => EV.map((_, i) => "ev|" + i);

/* ---------- ish raqami va belgilar ---------- */
let caseNo = lsGet("kj_case") || "";
let ticks = {};
function loadTicks() { ticks = lsJSON("kj_ticks_" + caseNo, {}); if (typeof ticks !== "object" || Array.isArray(ticks)) ticks = {}; }
function saveTicks() { lsSet("kj_case", caseNo); lsSet("kj_ticks_" + caseNo, JSON.stringify(ticks)); }
loadTicks();

/* ---------- toast ---------- */
let toastTimer;
function showToast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ==========================================================
   Marshrutlash:  #/sahifa  yoki  #/art/<modda>/<usul>
   ========================================================== */
const NAV = [
  ["grpMain", [["dashboard", "◈"], ["catalog", "▤"], ["wizard", "⌕"], ["universal", "◎"], ["evidence", "☑"]]],
  ["grpWork", [["case", "▣"], ["knowledge", "⌘"]]],
  ["grpRef", [["law", "§"], ["expert", "◇"], ["dead", "⇢"], ["reject", "⊘"]]]
];
const PAGE_IDS = NAV.flatMap(g => g[1].map(p => p[0])).concat("art");

let route = { page: "dashboard" };
function parseHash() {
  const [page, a, m] = location.hash.replace(/^#\/?/, "").split("/");
  route = PAGE_IDS.includes(page) ? { page, a, m } : { page: "dashboard" };
}
function goTo(page, a, m) {
  const h = "#/" + [page, a, m].filter(Boolean).join("/");
  if (location.hash === h) renderRoute(true);
  else location.hash = h;
}
const go = goTo; // pages.js ichidagi onclick="go('wizard')" uchun

function buildNav() {
  $("#navRoot").innerHTML = NAV.map(([grp, items]) => `
    <div class="side-label">${t(grp)}</div>
    <nav class="nav-menu">${items.map(([p, ic]) => `
      <button class="nav-link" data-page="${p}" onclick="goTo('${p}')"><span class="nav-icon">${ic}</span><span class="nav-text">${t("p_" + p)}</span></button>`).join("")}
    </nav>`).join("");
}

function updateChrome() {
  document.documentElement.lang = lang;
  $("#brandSubtitle").textContent = t("brandSub");
  $("#systemStatus").textContent = t("status");
  $("#systemMode").textContent = t("mode");
  $("#platformLabel").textContent = t("platform");
  $("#footerSubtitle").textContent = t("footer");
  const labels = { uz: { system: "💻 Tizim", light: "☀️ Yorug‘", dark: "🌙 Qorong‘i" }, ru: { system: "💻 Системная", light: "☀️ Светлая", dark: "🌙 Тёмная" }, en: { system: "💻 System", light: "☀️ Light", dark: "🌙 Dark" } }[lang];
  document.querySelectorAll("[data-i18n-theme]").forEach(o => { o.textContent = labels[o.dataset.i18nTheme]; });
  buildNav();
  const active = route.page === "art" ? "catalog" : route.page;
  document.querySelectorAll(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.page === active));
  let crumb = t(route.page === "art" ? "p_catalog" : "p_" + route.page);
  if (route.page === "art") { const A = ART.find(x => x.id === route.a); if (A) crumb = `${t("p_catalog")} / ${artLabel(A.code)}`; }
  $("#pageCrumb").textContent = crumb;
  document.title = `KIBERJINOYATLAR | ${crumb}`;
}

function renderRoute(scrollTop) {
  const fn = { dashboard: dashboardPage, catalog: catalogPage, art: articlePage, wizard: wizardPage, universal: docPage, evidence: evidencePage, case: casePage, knowledge: knowledgePage, law: docPage, expert: docPage, dead: docPage, reject: docPage }[route.page] || dashboardPage;
  $("#pageContent").innerHTML = fn();
  updateChrome();
  if (route.page === "catalog") filterCatalog();
  if (route.page === "case") loadCaseForm();
  $("#sidebar").classList.remove("open");
  if (scrollTop) window.scrollTo({ top: 0, behavior: "auto" });
}
window.addEventListener("hashchange", () => { parseHash(); renderRoute(true); });

const eyebrow = key => `<div class="eyebrow">${t("e_" + key)}</div>`;
const contentNote = () => (lang !== "uz" && t("contentNote")) ? `<p class="content-note">${esc(t("contentNote"))}</p>` : "";
const pageHead = (key, desc) => `${eyebrow(key)}<h1 class="page-title">${t("p_" + key)}</h1>${desc ? `<p class="page-subtitle">${desc}</p>` : ""}`;
const wrapTables = html => html.replace(/<table>/g, '<div class="table-wrap"><table class="data-table">').replace(/<\/table>/g, "</table></div>");

/* ==========================================================
   Bosh sahifa
   ========================================================== */
function dashboardPage() {
  const nMethods = ART.reduce((n, a) => n + a.m.length, 0);
  const nSteps = ART.reduce((n, a) => n + a.m.reduce((k, m) => k + stepsOf(m).reduce((q, s) => q + s.length, 0), 0), 0);
  const cards = [[ART.length, t("sArt"), t("nArt"), "▤"], [nMethods, t("sMeth"), t("nMeth"), "◎"], [nSteps, t("sSteps"), t("nSteps"), "☑"], [tx(HOME_STATS[1][0]), t("sSolve"), t("nSolve"), "◉"]];
  const quick = [["catalog", "▤"], ["wizard", "⌕"], ["universal", "◎"], ["evidence", "☑"], ["case", "▣"], ["law", "§"]];
  const kc = tArr("khorCols"), ac = tArr("artStatCols");

  let khor = "";
  for (const [n, c, z, id] of KHOR) {
    let link;
    if (id.startsWith("p:")) link = `<a onclick="goTo('reject')">${t("p_reject")}</a>`;
    else { const [a, m] = findM(id); link = `<a onclick="goTo('art','${a.id}','${m.id}')">${artLabel(a.code)} · ${esc(m.n)}</a>`; }
    khor += `<tr><td>${esc(n)}</td><td>${c}</td><td>${esc(z)}</td><td>${link}</td></tr>`;
  }
  const arts = ART.map(a => `<tr><td><a onclick="goTo('art','${a.id}')">${esc(a.code)}</a></td><td>${esc(a.title)}</td><td>${esc(a.st.t)}</td><td>${esc(a.st.x)}</td></tr>`).join("");

  return `
    ${eyebrow("dashboard")}
    <section class="hero">
      <h1>${t("heroTitle")}</h1>
      <p>${t("heroIntro")}</p>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="goTo('wizard')">${t("btnWizard")}</button>
        <button class="btn btn-quiet" onclick="goTo('catalog')">${t("btnCatalog")}</button>
      </div>
    </section>

    <div class="stats-grid">${cards.map(([v, l, n, ic]) => `
      <div class="stat-card"><div class="stat-top"><span>${l}</span><div class="stat-icon">${ic}</div></div>
      <div class="stat-number">${v}</div><div class="stat-note">${n}</div></div>`).join("")}</div>

    <div class="section-heading"><div><h2>${t("quick")}</h2><p>${t("quickDesc")}</p></div></div>
    <div class="feature-grid">${quick.map(([p, ic]) => `
      <div class="feature-card" onclick="goTo('${p}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();goTo('${p}')}" role="button" tabindex="0">
        <div class="feature-icon">${ic}</div><h3>${t("p_" + p)}</h3><p>${t("d_" + p)}</p></div>`).join("")}</div>

    <div class="section-heading"><div><h2>${t("statsTitle")}</h2></div></div>
    <div class="stats-grid flex">${HOME_STATS.map(([v, l]) => `
      <div class="stat-card"><div class="stat-number">${esc(v)}</div><div class="stat-note big">${esc(l)}</div></div>`).join("")}</div>

    <div class="callout crit">${esc(HOME_LEGAL).replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>")}</div>

    <div class="section-heading"><div><h2>${t("khorTitle")}</h2></div></div>
    <div class="panel flush"><div class="table-wrap"><table class="data-table">
      <tr>${kc.map(c => `<th>${c}</th>`).join("")}</tr>${khor}</table></div></div>

    <div class="section-heading"><div><h2>${t("artStatTitle")}</h2></div></div>
    <div class="panel flush"><div class="table-wrap"><table class="data-table">
      <tr>${ac.map(c => `<th>${c}</th>`).join("")}</tr>${arts}</table></div></div>
    <p class="small-note">${esc(HOME_SOURCE)}</p>
    ${contentNote()}`;
}

/* ==========================================================
   Katalog + chuqur qidiruv
   ========================================================== */
const GROUPS = [...new Set(ART.map(a => a.g))];
let blobCache = {};
function blobOf(a, m) {
  const key = lang === "ru" ? "ru" : "lat";
  const id = key + a.id + (m ? m.id : "");
  if (!blobCache[id]) {
    const base = [a.code, a.title, a.about, a.qual.join(" ")];
    const parts = m ? base.concat([m.n, m.mech, m.extra || "", stepsOf(m).flat().join(" "), m.key, m.err.join(" "), m.exp.join(" "), m.vers.flat().join(" ")]) : base.concat(a.m.map(x => x.n));
    blobCache[id] = tx(parts.join(" ")).toLowerCase();
  }
  return blobCache[id];
}

function catalogPage() {
  return `${pageHead("catalog", t("catDesc"))}
    <div class="toolbar">
      <input class="search-box" id="crimeSearch" placeholder="${escRaw(t("catSearch"))}" oninput="filterCatalog()" autocomplete="off">
      <select class="select-field" id="crimeGroup" onchange="filterCatalog()">
        <option value="all">${t("allGroups")}</option>
        ${GROUPS.map((g, i) => `<option value="${i}">${esc(g)}</option>`).join("")}
      </select>
    </div>
    <div id="catResults"></div>${contentNote()}`;
}

let lastQuery = "", lastGroup = "all";
function filterCatalog() {
  const box = $("#catResults");
  if (!box) return;
  const si = $("#crimeSearch"), sg = $("#crimeGroup");
  if (si) lastQuery = si.value; if (sg) lastGroup = sg.value;
  const q = tx(lastQuery.trim()).toLowerCase();
  const inGroup = a => lastGroup === "all" || GROUPS[Number(lastGroup)] === a.g;

  if (!q) {
    let h = "", g = "";
    const list = ART.filter(inGroup);
    h = '<div class="crime-grid">' + list.map(a => `
      <article class="crime-card" onclick="goTo('art','${a.id}')" onkeydown="if(event.key==='Enter'){goTo('art','${a.id}')}" role="button" tabindex="0">
        <span class="tag">${esc(artLabel(a.code))}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.about)}</p>
        <div class="card-bottom"><small>${t("nMethods", a.m.length)} · ${esc(a.g)}</small><span class="btn">${t("open")}</span></div>
      </article>`).join("") + "</div>";
    box.innerHTML = list.length ? h : `<div class="empty-state">${t("noResults")}</div>`;
    return;
  }

  let n = 0, h = "";
  for (const a of ART) {
    if (!inGroup(a)) continue;
    for (const m of a.m) {
      if (!blobOf(a, m).includes(q)) continue;
      n++;
      const steps = stepsOf(m).flat();
      const hit = steps.find(s => tx(s).toLowerCase().includes(q)) || m.mech;
      h += `<div class="result-row" onclick="goTo('art','${a.id}','${m.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'){goTo('art','${a.id}','${m.id}')}">
        <b>${esc(artLabel(a.code))} · ${esc(m.n)}</b><div class="small-note">${hl(hit, q)}</div></div>`;
    }
  }
  box.innerHTML = n ? `<p class="small-note">${t("foundN", n)}</p>${h}` : `<div class="empty-state">${t("noResults")}</div>`;
}
function hl(s, q) {
  const d = tx(s), i = d.toLowerCase().indexOf(q);
  if (i < 0) return escRaw(d);
  return escRaw(d.slice(0, i)) + '<mark class="hl">' + escRaw(d.slice(i, i + q.length)) + "</mark>" + escRaw(d.slice(i + q.length));
}

/* ==========================================================
   Modda / usul sahifasi
   ========================================================== */
let cbKeys = [];
function caseBar(keys, copyId) {
  cbKeys = keys;
  const done = keys.filter(k => ticks[k]).length, pct = keys.length ? Math.round(done * 100 / keys.length) : 0;
  return `<div class="casebar noprint">
    <b>${t("cbTitle")}</b>
    <label>${t("cbNo")} <input id="cno" class="field inline" value="${escRaw(caseNo)}" placeholder="${escRaw(t("cbPh"))}" onchange="setCase(this.value)"></label>
    <span id="cbCount">${t("cbDone", done, keys.length)}</span>
    <div class="progress-track grow"><div class="progress-fill" id="cbFill" style="width:${pct}%"></div></div>
    ${copyId ? `<button class="btn" onclick="copyCase('${copyId}')">${t("cbCopy")}</button>` : ""}
    <button class="btn" onclick="clearMarks('${copyId || "ev"}')">${t("cbClear")}</button>
  </div>`;
}
function refreshCaseBar() {
  const done = cbKeys.filter(k => ticks[k]).length, pct = cbKeys.length ? Math.round(done * 100 / cbKeys.length) : 0;
  const c = $("#cbCount"), f = $("#cbFill");
  if (c) c.textContent = t("cbDone", done, cbKeys.length);
  if (f) f.style.width = pct + "%";
}
function tick(k, v, el) {
  if (v) ticks[k] = 1; else delete ticks[k];
  saveTicks();
  const row = el && el.closest(".step"); if (row) row.classList.toggle("done", v);
  refreshCaseBar();
}
function switchCase(n) { caseNo = n; lsSet("kj_case", caseNo); loadTicks(); }
function setCase(v) { switchCase(v.trim()); renderRoute(false); }
function clearMarks(scope) {
  const prefix = scope === "ev" ? "ev|" : scope + "|";
  Object.keys(ticks).forEach(k => { if (k.startsWith(prefix)) delete ticks[k]; });
  saveTicks(); renderRoute(false); showToast(t("marksCleared"));
}
function copyText(text) {
  const done = () => showToast(t("copied")), fail = () => showToast(t("copyFail"));
  const legacy = () => {
    try { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); ok ? done() : fail(); } catch (e) { fail(); }
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, legacy); else legacy();
}
function copyCase(mid) {
  const [a, m] = findM(mid);
  let out = `${t("caseWord")}: ${caseNo || "—"}\n${artLabel(a.code)} · ${tx(m.n)}\n`;
  m.stages.forEach((s, si) => {
    out += `\n${tx(s.t)}\n`;
    expand(s.s).forEach((x, i) => { out += `[${ticks[`${mid}|${si}|${i}`] ? "x" : " "}] ${tx(x)}\n`; });
  });
  copyText(out);
}

function articlePage() {
  const A = ART.find(x => x.id === route.a);
  if (!A) return `<div class="empty-state">${t("notFound")}</div>`;
  const m = A.m.find(x => x.id === route.m) || A.m[0];
  const st = stepsOf(m);
  let r = `${eyebrow("art")}
    <div class="crumb"><a onclick="goTo('catalog')">${t("p_catalog")}</a> › ${esc(A.g)} › ${esc(artLabel(A.code))}</div>
    <h1 class="page-title">${esc(artLabel(A.code))}. ${esc(A.title)}</h1>
    <p class="page-subtitle">${esc(A.about)}</p>
    <div class="panel tight"><h3>${t("qualH")}</h3><ul class="plain">${A.qual.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
      <span class="pill">${t("pillCity", esc(A.st.t))}</span><span class="pill">${t("pillRegion", esc(A.st.x))}</span></div>`;
  if (A.m.length > 1) r += `<div class="tabs">${A.m.map(x => `<button class="${x.id === m.id ? "on" : ""}" onclick="goTo('art','${A.id}','${x.id}')">${esc(x.n)}</button>`).join("")}</div>`;
  r += `<h2 class="sub-title">${t("methodH")} ${esc(m.n)}</h2>${m.x ? `<span class="pill">${t("pillRegion", esc(m.x))}</span>` : ""}
    <div class="panel tight"><b>${t("mechH")}</b> ${esc(m.mech)}${m.extra ? `<br><b>${t("extraH")}</b> ${esc(m.extra)}` : ""}</div>
    <h3 class="sub-h">${t("versH")}</h3>
    <div class="vers">${m.vers.map(([a, b]) => `<div><b>${esc(a)}</b><br>${esc(b)}</div>`).join("")}</div>
    ${caseBar(keysOf(m), m.id)}
    <h3 class="sub-h">${t("algH")}</h3>`;
  m.stages.forEach((s, si) => {
    r += `<div class="stage ${si === 0 ? "first" : ""}"><h4>${esc(s.t)} <span class="cnt">${t("stepsN", st[si].length)}</span></h4>`;
    st[si].forEach((x, i) => {
      const k = `${m.id}|${si}|${i}`;
      r += `<label class="step ${ticks[k] ? "done" : ""}"><input type="checkbox" ${ticks[k] ? "checked" : ""} onchange="tick('${k}',this.checked,this)"><span>${esc(x)}</span></label>`;
    });
    r += "</div>";
  });
  r += `<div class="callout ok"><b>${t("keyH")}</b> ${esc(m.key)}</div>
    <div class="callout warn"><b>${t("errH")}</b><ul>${m.err.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>
    <h3 class="sub-h">${t("expH")}</h3><ul class="plain">${m.exp.map(e => `<li>${esc(e)}</li>`).join("")}</ul>
    <p class="small-note noprint">${t("alsoH")} <a onclick="goTo('expert')">${t("p_expert")}</a> · <a onclick="goTo('dead')">${t("p_dead")}</a></p>
    <div class="hero-actions noprint"><button class="btn" onclick="window.print()">${t("print")}</button></div>
    ${contentNote()}`;
  return r;
}

/* ==========================================================
   Kvalifikatsiya yordamchisi (daraxt)
   ========================================================== */
let wz = { step: "start", path: [], result: null };
function wizardPage() {
  let r = pageHead("wizard", t("wzLead"));
  if (wz.path.length) r += `<p class="small-note">${wz.path.map(esc).join(" → ")} · <a onclick="wzReset()">${t("wzRestart")}</a></p>`;
  if (wz.result) {
    r += `<div class="panel res"><h3>${t("wzResH")}</h3>` + wz.result.map(id => {
      const A = ART.find(x => x.id === id);
      return `<p><b>${esc(artLabel(A.code))}.</b> ${esc(A.title)}<br>${A.m.map(m => `<a onclick="goTo('art','${A.id}','${m.id}')">${esc(m.n)}</a>`).join("")}</p>`;
    }).join("") + `<p class="small-note">${t("wzResNote")}</p></div>`;
  } else {
    const s = WZ[wz.step];
    r += `<div class="panel wiz"><h3>${esc(s.q)}</h3>${s.o.map(([txt], i) => `<button onclick="wzGo(${i})">${esc(txt)}</button>`).join("")}</div>`;
  }
  return r + contentNote();
}
function wzGo(i) {
  const [txt, n] = WZ[wz.step].o[i];
  if (n.startsWith("p:")) { wzReset(true); goTo(n.slice(2)); return; }
  wz.path.push(txt);
  if (n.startsWith("r:")) wz.result = n.slice(2).split(";"); else wz.step = n;
  renderRoute(false);
}
function wzReset(silent) { wz = { step: "start", path: [], result: null }; if (!silent) renderRoute(false); }

/* ==========================================================
   Ma’lumotnoma sahifalari (pages.js)
   ========================================================== */
function docPage() {
  const fn = { universal, law, dead, expert, reject }[route.page];
  return `${eyebrow(route.page)}<div class="doc">${wrapTables(tx(fn()))}</div>${contentNote()}`;
}

/* ==========================================================
   Dalillar chek-listi
   ========================================================== */
function evidencePage() {
  const keys = EV_KEYS();
  return `${pageHead("evidence", t("evLead"))}
    ${caseBar(keys, null)}
    <div class="check-list">${EV.map((x, i) => {
      const k = "ev|" + i;
      return `<label class="check-item step ${ticks[k] ? "done" : ""}"><input type="checkbox" ${ticks[k] ? "checked" : ""} onchange="tick('${k}',this.checked,this)"><span>${esc(x)}</span></label>`;
    }).join("")}</div>${contentNote()}`;
}

/* ==========================================================
   Ish varaqasi
   ========================================================== */
function casePage() {
  const rows = {};
  Object.keys(ticks).forEach(k => { const id = k.split("|")[0]; if (id !== "ev") rows[id] = (rows[id] || 0) + 1; });
  const list = Object.entries(rows).map(([id, d]) => {
    const f = findM(id); if (!f) return "";
    const [a, m] = f, total = keysOf(m).length, pct = Math.round(d * 100 / total);
    return `<div class="prog-row" onclick="goTo('art','${a.id}','${m.id}')" role="button" tabindex="0"><div><b>${esc(artLabel(a.code))} · ${esc(m.n)}</b><small>${t("cbDone", d, total)}</small></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
  }).join("");
  const evDone = EV_KEYS().filter(k => ticks[k]).length;
  const evRow = evDone ? `<div class="prog-row" onclick="goTo('evidence')" role="button" tabindex="0"><div><b>${t("p_evidence")}</b><small>${t("cbDone", evDone, EV.length)}</small></div><div class="progress-track"><div class="progress-fill" style="width:${Math.round(evDone * 100 / EV.length)}%"></div></div></div>` : "";

  return `${pageHead("case", t("caseDesc"))}
    <div class="panel" style="margin-top:22px"><div class="form-grid">
      <div class="form-group"><label>${t("caseNumber")}</label><input class="field" id="caseNumber" placeholder="${escRaw(t("cbPh"))}"></div>
      <div class="form-group"><label>${t("caseDate")}</label><input class="field" type="date" id="caseDate"></div>
      <div class="form-group full"><label>${t("caseName")}</label><input class="field" id="caseTitle" placeholder="${escRaw(t("caseNamePh"))}"></div>
      <div class="form-group full"><label>${t("caseDetails")}</label><textarea class="text-field" id="caseDetails" placeholder="${escRaw(t("caseDetailsPh"))}"></textarea></div>
      <div class="form-group full"><label>${t("caseEvidence")}</label><textarea class="text-field" id="caseEvidence" placeholder="${escRaw(t("caseEvidencePh"))}"></textarea></div>
      <div class="form-group full"><label>${t("caseTasks")}</label><textarea class="text-field" id="caseTasks" placeholder="${escRaw(t("caseTasksPh"))}"></textarea></div>
    </div>
    <div class="hero-actions" style="margin-top:18px">
      <button class="btn btn-primary" onclick="saveCase()">${t("save")}</button>
      <button class="btn" onclick="window.print()">${t("print")}</button>
      <button class="btn btn-danger" onclick="clearCase()">${t("clear")}</button>
    </div>
    <p class="panel-desc" style="margin-top:15px">${t("privacy")}</p></div>
    <div class="section-heading"><div><h2>${t("progH")}</h2></div></div>
    <div class="panel">${list || evRow ? list + evRow : `<p class="panel-desc">${t("progNone")}</p>`}</div>`;
}
const CASE_KEYS = ["caseNumber", "caseDate", "caseTitle", "caseDetails", "caseEvidence", "caseTasks"];
function loadCaseForm() {
  const data = lsJSON("kiberCase", {});
  CASE_KEYS.forEach(k => { const el = document.getElementById(k); if (el && data[k] !== undefined) el.value = data[k]; });
  const num = document.getElementById("caseNumber");
  if (num && !num.value && caseNo) num.value = caseNo;
}
function saveCase() {
  const data = {};
  CASE_KEYS.forEach(k => { data[k] = document.getElementById(k).value; });
  lsSet("kiberCase", JSON.stringify(data));
  const n = data.caseNumber.trim();
  if (n && n !== caseNo) switchCase(n);
  renderRoute(false);
  showToast(t("saved"));
}
function clearCase() {
  if (!confirm(t("confirmClear"))) return;
  lsDel("kiberCase");
  renderRoute(false);
  showToast(t("cleared"));
}

/* ==========================================================
   Bilimlar bazasi
   ========================================================== */
function knowledgePage() {
  return `${pageHead("knowledge", t("knowDesc"))}
    <div class="steps">${CONCEPTS.map(([name, desc], i) => `
      <div class="step-item"><div class="step-number">${String(i + 1).padStart(2, "0")}</div>
      <div><h3>${name[li()]}</h3><p>${desc[li()]}</p></div></div>`).join("")}</div>`;
}

/* ==========================================================
   Til, mavzu, mobil menyu
   ========================================================== */
const languageSelect = $("#languageSelect");
languageSelect.value = lang;
languageSelect.addEventListener("change", () => {
  lang = languageSelect.value;
  lsSet("kiberLanguage", lang);
  blobCache = {};
  const q = $("#crimeSearch") ? $("#crimeSearch").value : "";
  renderRoute(false);
  if (route.page === "catalog" && q) { $("#crimeSearch").value = q; filterCatalog(); }
});
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

const themeSelect = $("#themeSelect");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "system" ? (systemTheme.matches ? "dark" : "light") : theme);
}
const savedTheme = ["system", "light", "dark"].includes(lsGet("kiberTheme")) ? lsGet("kiberTheme") : "system";
themeSelect.value = savedTheme;
applyTheme(savedTheme);
themeSelect.addEventListener("change", () => { lsSet("kiberTheme", themeSelect.value); applyTheme(themeSelect.value); });
systemTheme.addEventListener("change", () => { if (themeSelect.value === "system") applyTheme("system"); });

/* ---------- start ---------- */
parseHash();
renderRoute(true);
