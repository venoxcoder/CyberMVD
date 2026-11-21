import type {
  AdminUser,
  KBArticle,
  MapIncident,
  OsintTask,
  RolePermissions,
  SimCase,
  TestQuestion,
  TrilingualText,
} from '../types';

export interface ExpertQuestionItem {
  id: string;
  question: string;
  purpose: TrilingualText;
  objects: TrilingualText;
  expected: TrilingualText;
  relatedArticle: string;
}

export interface ExpertOtherItem {
  id: string;
  title: string;
  subtitle: string;
  purpose: TrilingualText;
  objects: TrilingualText;
  sampleQuestions: string[];
  relatedArticles: string[];
}

export interface ExpertExtraSection {
  id: string;
  title: TrilingualText;
  description: TrilingualText;
  sampleQuestions: string[];
  objects: TrilingualText;
  artifacts: TrilingualText;
}

export const EXPERT_CT_QUESTIONS: ExpertQuestionItem[] = [
  {
    id: 'ct_1',
    question: 'Тақдим этилган қурилмада зарарли дастур борми? У қачон, қайси манбадан ўрнатилган?',
    purpose: {
      uz: 'Qurilmaga zararli ilova (APK/EXE) kirib kelgan vaqt, manba (Telegram kanal, brauzer yuklab olishi, USB) va o‘rnatish usulini aniqlash.',
      ru: 'Установить наличие вредоносного ПО (APK/EXE), точное время его установки и источник загрузки (канал, браузер, носитель).',
      en: 'Identify presence of malware (APK/EXE), exact installation timestamp, and initial delivery source.',
    },
    objects: {
      uz: 'Jabrlanuvchi yoki gumonlanuvchi telefoni (blokdan chiqarilgan/obraz), SD-karta, yuklangan fayllar papkasi.',
      ru: 'Смартфон потерпевшего/подозреваемого (или криминалистический образ), SD-карта, кэш мессенджеров и загрузок.',
      en: 'Victim/suspect smartphone (or forensic image), SD card, download folders, and messenger cache.',
    },
    expected: {
      uz: 'Package nomi, SHA-256 xesh, o‘rnatish logi (install_time), Telegram/Chrome yuklab olish izi.',
      ru: 'Имя пакета, хеш SHA-256, временная метка установки (install_time), след загрузки в браузере или Telegram.',
      en: 'Package name, SHA-256 hash, install timestamp, and origin trace in Telegram/browser databases.',
    },
    relatedArticle: 'a169',
  },
  {
    id: 'ct_2',
    question: 'Дастур қандай функцияларга эга (SMS ушлаш, экранни бошқариш, маълумот юбориш) ва маълумотни қайси манзилга (сервер, бот) юборади?',
    purpose: {
      uz: 'Zararli dasturni dekompilyatsiya (reverse engineering) qilib, uning ruxsatlari va C2 server/Telegram bot tokenini aniqlash.',
      ru: 'Провести статический и динамический анализ кода, выявить перехват SMS/Accessibility и извлечь адрес сервера или токен бота.',
      en: 'Reverse-engineer malware capabilities (SMS interception, remote screen control) and extract C2 servers or bot tokens.',
    },
    objects: {
      uz: 'Ajratib olingan .apk/.dex fayli, dekompilyatsiya natijalari, tarmoq trafiki (PCAP).',
      ru: 'Извлечённый файл .apk/.dex, конфигурационные файлы, дампы сетевого трафика (PCAP).',
      en: 'Extracted .apk/.dex file, manifest/strings configuration, and captured network traffic (PCAP).',
    },
    expected: {
      uz: 'AndroidManifest ruxsatlari (RECEIVE_SMS, BIND_ACCESSIBILITY_SERVICE), hardcoded URL/IP, bot_token va chat_id.',
      ru: 'Список разрешений (RECEIVE_SMS, Accessibility), зашитые URL/IP, токен Telegram-бота и chat_id.',
      en: 'Permissions list, hardcoded C2 URL/IP, Telegram bot token, and exfiltration chat_id.',
    },
    relatedArticle: 'a2786',
  },
  {
    id: 'ct_3',
    question: 'Қурилмада маълум даврда қайси банк иловаларига кирилган, қайси операциялар бажарилган?',
    purpose: {
      uz: 'Ruxsatsiz o‘tkazmalar vaqtida qurilmada faol bo‘lgan bank ilovalari sessiyalari va amaliyot izlarini tiklash.',
      ru: 'Восстановить хронологию запуска банковских приложений, активных сессий и выполненных транзакций в заданный период.',
      en: 'Reconstruct banking app launches, active sessions, and transactions executed during the incident timeframe.',
    },
    objects: {
      uz: 'Mobil qurilma, ilova ma’lumotlar bazalari, tizim UsageStats loglari, bildirishnoma tarixi.',
      ru: 'Мобильное устройство, базы приложений, журналы UsageStats и история системных уведомлений.',
      en: 'Mobile device, app sandbox databases, Android UsageStats logs, and notification history.',
    },
    expected: {
      uz: 'Sekundigacha aniq kirish vaqtlari, ekranda ko‘ringan bildirishnomalar, session ID va tranzaksiya qoldiqlari.',
      ru: 'Точное время запуска банковских клиентов, история push/SMS уведомлений и следы транзакций.',
      en: 'Exact app usage timestamps, intercepted push/SMS notification logs, and transaction artifacts.',
    },
    relatedArticle: 'a169',
  },
  {
    id: 'ct_4',
    question: 'Қурилмада қайси мессенжер аккаунтлари ва ёзишмалар бор (ўчирилганлари ҳам), уларда карта рақамлари, кодлар, координаталар учрайдими?',
    purpose: {
      uz: 'Telegram/WhatsApp/Instagram ma’lumotlar bazasi va SQLite keshidan o‘chirilgan yozishmalar, karta raqamlari va lokatsiyalarni tiklash.',
      ru: 'Извлечь активные и удалённые переписки из баз SQLite/кэша мессенджеров, выявить номера карт, коды и геолокацию.',
      en: 'Recover active and deleted messenger chats from SQLite/cache to locate card numbers, OTP codes, and coordinates.',
    },
    objects: {
      uz: 'Smartfon/kompyuter, cache4.db, tdata papkasi, media va eksport arxivlari.',
      ru: 'Смартфон или ПК, базы cache4.db, папка tdata, локальные резервные копии и кэш медиа.',
      en: 'Smartphone/PC, cache4.db, tdata folder, local backups, and cached media files.',
    },
    expected: {
      uz: 'Akkaunt ID/username, o‘chirilgan xabar parchalari, karta/hamyon rekvizitlari va GPS koordinatalari.',
      ru: 'ID аккаунтов, восстановленные фрагменты удалённых сообщений, реквизиты карт и GPS-координаты.',
      en: 'Account IDs, carved deleted message fragments, card/wallet strings, and embedded GPS coordinates.',
    },
    relatedArticle: 'a168',
  },
  {
    id: 'ct_5',
    question: 'Икки қурилмадаги (жабрланувчи ва гумонланувчи) файллар ва излар бир хилми (хэш, токен, сертификат)?',
    purpose: {
      uz: 'Turli ishlardagi qurilmalarni bitta umumiy zararli fayl xeshi, imzo sertifikati yoki boshqaruv tokeni orqali seriyaga bog‘lash.',
      ru: 'Установить идентичность вредоносных файлов, сертификатов подписи и токенов на устройствах потерпевшего и подозреваемого.',
      en: 'Correlate files across victim and suspect devices via identical cryptographic hashes, signing certificates, or tokens.',
    },
    objects: {
      uz: 'Jabrlanuvchi telefonidan olingan APK va gumonlanuvchi kompyuteridagi fayllar/build papkasi.',
      ru: 'Вредоносный APK с устройства потерпевшего и файлы/проекты с ПК подозреваемого.',
      en: 'Malicious APK from victim phone and project/build files seized from suspect PC.',
    },
    expected: {
      uz: 'SHA-256 mosligi, APK imzo sertifikati (SHA-1/SHA-256 fingerprint) va bir xil C2/bot konfiguratsiyasi.',
      ru: 'Совпадение SHA-256 хешей, отпечатков сертификата подписи APK и параметров управления C2/бота.',
      en: 'Matching SHA-256 digests, APK signing certificate fingerprints, and identical C2/bot config.',
    },
    relatedArticle: 'a2786',
  },
  {
    id: 'ct_6',
    question: 'Файлларда ўзгартириш (монтаж) белгилари борми?',
    purpose: {
      uz: 'Skринshot, bank cheki (PDF/JPG), hujjat yoki video fayl tahrirlanganligini (Photoshop, PDF muharrir) aniqlash.',
      ru: 'Проверить подлинность скриншотов, банковских чеков (PDF/JPG) и видео на предмет монтажа и подделки метаданных.',
      en: 'Detect tampering, manipulation, or synthetic editing in receipts (PDF/JPG), screenshots, or video files.',
    },
    objects: {
      uz: 'Asl elektron fayl (qayta siqilmagan holda — hujjat sifatida yuborilgan), uning metama’lumotlari.',
      ru: 'Оригинальный цифровой файл без пересжатия мессенджером с сохранёнными заголовками EXIF/XMP/PDF.',
      en: 'Original uncompressed digital file retaining EXIF/XMP/PDF object metadata.',
    },
    expected: {
      uz: 'EXIF/PDF Creator maydonlari, Error Level Analysis (ELA) anomaliyalari, shrift va piksel nomuvofiqligi.',
      ru: 'Метаданные EXIF/PDF Producer, аномалии ELA, следы графических редакторов и несоответствие шрифтов.',
      en: 'EXIF/PDF Producer anomalies, ELA compression artifacts, font/layer mismatches.',
    },
    relatedArticle: 'a228',
  },
  {
    id: 'ct_7',
    question: 'Аниқланган АПК намуналари шу исход код ёки имзо калити билан яратилганми?',
    purpose: {
      uz: 'Gumonlanuvchi kompyuteridagi Android Studio / Gradle loyihasi va keystore kaliti orqali o‘nlab/yuzlab epizodlardagi APKlar yasalganini isbotlash.',
      ru: 'Доказать, что обнаруженные в серии эпизодов APK скомпилированы именно из исходного кода и ключом подписи подозреваемого.',
      en: 'Prove that APK samples across multiple episodes were compiled from the suspect source code and signing keystore.',
    },
    objects: {
      uz: 'Gumonlanuvchi kompyuteridagi manba kodi (.java/.kt), .jks/.keystore fayli, jabrlanuvchilardagi APK namunalari.',
      ru: 'Исходный код и файлы .jks/.keystore с ПК подозреваемого; образцы APK из уголовных дел.',
      en: 'Source code and .jks/.keystore files from suspect workstation; collected APK samples from cases.',
    },
    expected: {
      uz: 'Keystore public key mosligi, sinflar/funksiyalar tuzilmasining kod o‘xshashligi va build izlari.',
      ru: 'Идентичность открытого ключа подписи (.jks), совпадение структуры классов и уникальных артефактов сборки.',
      en: 'Cryptographic match of keystore public key, identical class hierarchy, and compiler build fingerprints.',
    },
    relatedArticle: 'a2786',
  },
];

export const EXPERT_OTHER_TYPES: ExpertOtherItem[] = [
  {
    id: 'oth_ling',
    title: 'Лингвистик',
    subtitle: 'ҳақорат, туҳмат, ундаш, тақиқланган материал',
    purpose: {
      uz: 'Matn, post, izoh yoki ovozli xabar transkripsiyasida haqorat, tuhmat, o‘z joniga qasdga undash yoki ekstremistik chaqiriq belgilarini ilmiy baholash.',
      ru: 'Лингвистическая оценка текстов и публикаций на наличие оскорбления, клеветы, побуждения к суициду или экстремистских призывов.',
      en: 'Linguistic evaluation of posts, chats, or transcripts for insult, defamation, incitement, or prohibited propaganda.',
    },
    objects: {
      uz: 'Ko‘zdan kechirish bayonnomasiga tikilgan skrinshotlar, matn fayllari, post URL va to‘liq kontekst.',
      ru: 'Зафиксированные протоколом скриншоты, текстовые массивы, полная ветка переписки и контекст публикации.',
      en: 'Protocol-documented screenshots, text logs, and full conversation context.',
    },
    sampleQuestions: [
      'Тақдим этилган матнда аниқ шахс шаъни ва қадр-қимматини беҳаё шаклда камситувчи иборалар мавжудми?',
      'Матнда зўравонлик, оммавий тартибсизлик ёки ўзини ўзи ўлдиришга қаратилган тўғридан-тўғри ундаш (императив) мавжудми?',
    ],
    relatedArticles: ['a140', 'a139', 'a103', 'a2441'],
  },
  {
    id: 'oth_phono',
    title: 'Фоноскопик ва видео-техник',
    subtitle: 'овоз, видео, дипфейк',
    purpose: {
      uz: 'Audio/video yozuvda shaxs ovozini identifikatsiya qilish, montaj izlari va sun’iy intellekt (deepfake/voice cloning) alomatlarini tekshirish.',
      ru: 'Идентификация голоса, выявление следов монтажа, а также признаков генерации речи или видео нейросетями (дипфейк).',
      en: 'Speaker identification, audio/video splicing detection, and deepfake / AI voice-cloning verification.',
    },
    objects: {
      uz: 'Asl audio/video fayl, gumonlanuvchidan olingan solishtirma ovoz namunalari.',
      ru: 'Оригинальная фонограмма/видеозапись и сравнительные образцы голоса подозреваемого.',
      en: 'Original audio/video recordings and suspect reference voice samples.',
    },
    sampleQuestions: [
      'Тақдим этилган аудио/видео ёзувда овоз гумонланувчининг қиёсий намуналарига тегишлими?',
      'Файлда монтаж, кесиш ёки сунъий синтез (дипфейк) белгилари мавжудми?',
    ],
    relatedArticles: ['a168', 'a1413', 'a2446'],
  },
  {
    id: 'oth_portrait',
    title: 'Портрет',
    subtitle: 'банкомат ва биометрик селфи',
    purpose: {
      uz: 'Bankomat kamerasi, filial videosi yoki onlayn kredit rasmiylashtirishdagi biometrik selfini gumonlanuvchi fotosurati bilan qiyoslash.',
      ru: 'Габитоскопическое сопоставление лица на кадрах банкомата/биометрического селфи с эталонными фото подозреваемого.',
      en: 'Facial morphology comparison between ATM/branch CCTV or biometric KYC selfie and suspect reference images.',
    },
    objects: {
      uz: 'Bankomat/kassa kamerasining asl video kadrlari, KYC biometrik selfi, shaxsiy pasport va qiyosiy fotolar.',
      ru: 'Видеозаписи камер банкомата, биометрическое селфи KYC, качественные фотоснимки подозреваемого.',
      en: 'Original ATM/CCTV frames, biometric KYC selfies, and standardized suspect portrait photographs.',
    },
    sampleQuestions: [
      'Банкомат видеокамерасидаги (ёки биометрик селфидаги) шахс билан гумонланувчи фотосуратидаги шахс битта одамми?',
    ],
    relatedArticles: ['a168', 'a169'],
  },
  {
    id: 'oth_econ',
    title: 'Суд-иқтисодий/бухгалтерия',
    subtitle: 'зарар, пул оқими, пирамида',
    purpose: {
      uz: 'Moliyaviy piramida, P2P aylanma, xizmat mavqeini suiiste’mol qilish va kiber-o‘g‘irlik bo‘yicha umumiy moddiy zarar hamda pul oqimini hisoblash.',
      ru: 'Расчёт совокупного материального ущерба, трассировка финансовых потоков, выявление признаков финансовой пирамиды и нелегального P2P.',
      en: 'Quantify total financial damage, trace multi-hop money flows, and evaluate Ponzi/illegal P2P turnover.',
    },
    objects: {
      uz: 'Bank ko‘chirmalari (CSV/XLSX), to‘lov tizimlari reyestrlari, P2P birja tarixi, buxgalteriya hujjatlari.',
      ru: 'Банковские выписки, реестры платёжных систем, история P2P-сделок и первичная бухгалтерская документация.',
      en: 'Bank statements, payment processor ledgers, P2P exchange histories, and accounting records.',
    },
    sampleQuestions: [
      'Тақдим этилган банк кўчирмаларига кўра, жабрланувчилардан тушган жами маблағ ва учинчи шахсларга ўтказилган сумма қанча?',
      'Молиявий оқимларда пирамида (олдинги иштирокчиларга кейингилар ҳисобидан тўлов) белгилари мавжудми?',
    ],
    relatedArticles: ['a1881', 'a167', 'a2788'],
  },
  {
    id: 'oth_chem',
    title: 'Кимёвий',
    subtitle: 'модда тури ва миқдори',
    purpose: {
      uz: 'Telegram orqali «zakladka» tarqatish ishlarida olingan moddalarning kimyoviy tarkibi, giyohvandlik yoki kuchli ta’sir qiluvchi toifaga kirishi va aniq vaznini aniqlash.',
      ru: 'Установление химического состава, принадлежности к наркотическим/сильнодействующим веществам и точной массы изъятых образцов по делам о сбыте через интернет.',
      en: 'Determine chemical identity, controlled substance classification, and exact net weight in online narcotics cases.',
    },
    objects: {
      uz: 'Muhrlangan qadoqdagi ashyoviy dalil — kukun, tabletka, o‘simlik yoki suyuqlik namunasi.',
      ru: 'Опечатанные изъятые образцы веществ (порошок, таблетки, растворы) и смывы с упаковочного материала.',
      en: 'Sealed physical substance samples, packaging swabs, and seized paraphernalia.',
    },
    sampleQuestions: [
      'Тақдим этилган модда таркибида гиёҳвандлик воситаси ёки кучли таъсир қилувчи модда борми, унинг тури ва соф вазни қанча?',
    ],
    relatedArticles: ['a273'],
  },
];

export const EXPERT_EXTRA_SECTIONS: ExpertExtraSection[] = [
  {
    id: 'ext_mobile',
    title: {
      uz: 'Мобил криминалистика ва АПК таҳлили (UFED / ADB / Jadx)',
      ru: 'Мобильная криминалистика и анализ АПК (UFED / ADB / Jadx)',
      en: 'Mobile Forensics & APK Analysis (UFED / ADB / Jadx)',
    },
    description: {
      uz: 'Smartfonlardan mantiqiy va fizik obraz olish, o‘chirilgan SQLite yozuvlarini tiklash hamda zararli Android ilovalarini statik va dinamik tekshirish.',
      ru: 'Логическое и физическое извлечение данных со смартфонов, карвинг удалённых записей SQLite и исследование вредоносных APK.',
      en: 'Logical/physical mobile extraction, SQLite deleted-record carving, and static/dynamic APK inspection.',
    },
    sampleQuestions: [
      'Қурилмада масофавий бошқарув (RAT / Accessibility / TeamViewer / AnyDesk) иловалари қайси вақтда фаоллаштирилган?',
      'АПК файлнинг имзо сертификати (v1/v2/v3) ва ички манифестидаги тармоқ манзиллари қайсилар?',
    ],
    objects: {
      uz: 'Blokdan chiqarilgan smartfon yoki uning fizik/to‘liq fayl tizimi obrazi (.tar/.bin), APK fayl.',
      ru: 'Разблокированный смартфон или полный дамп файловой системы, установочный пакет APK.',
      en: 'Unlocked mobile device or full file-system extraction archive and APK package.',
    },
    artifacts: {
      uz: 'telephony/mmssms.db, UsageStats, notification_log.db, AndroidManifest.xml, classes.dex.',
      ru: 'Базы mmssms.db, UsageStats, журналы уведомлений, AndroidManifest.xml и classes.dex.',
      en: 'mmssms.db, UsageStats, notification logs, AndroidManifest.xml, and classes.dex.',
    },
  },
  {
    id: 'ext_network',
    title: {
      uz: 'Тармоқ, сервер ва булутли экспертиза (Log / VPS / SIM-box)',
      ru: 'Сетевая, серверная и облачная экспертиза (Log / VPS / SIM-box)',
      en: 'Network, Server & Cloud Forensics (Logs / VPS / SIM-box)',
    },
    description: {
      uz: 'Tashkilot serverlariga ruxsatsiz kirish (278-2), DDoS hujumlari, VPS boshqaruv panellari va SIM-box shlyuzlaridagi trafikni tahlil qilish.',
      ru: 'Анализ логов несанкционированного доступа (ст. 278-2), DDoS-атак, VPS-серверов управления и трафика SIM-боксов.',
      en: 'Log analysis for unauthorized access (Art. 278-2), DDoS incidents, C2 VPS snapshots, and SIM-box gateways.',
    },
    sampleQuestions: [
      'Ташкилот серверига қайси IP-манзиллардан, қайси порт ва ҳисоб қайдномаси орқали рухсатсиз кирилган?',
      'Аниқланган SIM-бокс ускунасидаги конфигурация файли қайси хорижий SIP-серверга уланган?',
    ],
    objects: {
      uz: 'Web/auth/firewall loglari, VPS disk obrazi, router konfiguratsiyasi, PCAP trafik fayllari.',
      ru: 'Журналы веб/SSH/firewall, образ диска VPS, конфигурации маршрутизатора и дампы PCAP.',
      en: 'Web/SSH/firewall logs, VPS disk snapshots, router configs, and PCAP captures.',
    },
    artifacts: {
      uz: 'auth.log, access.log, iptables/netstat, SIP/RTP trafik paketlari, bash_history.',
      ru: 'auth.log, access.log, таблицы маршрутизации, пакеты SIP/RTP, история команд shell.',
      en: 'auth.log, access.log, netstat tables, SIP/RTP streams, and shell command history.',
    },
  },
  {
    id: 'ext_crypto',
    title: {
      uz: 'Блокчейн ва крипто-активлар таҳлили (TRM / On-chain Trace)',
      ru: 'Анализ блокчейна и криптоактивов (On-chain Trace)',
      en: 'Blockchain & Crypto-Asset Tracing',
    },
    description: {
      uz: 'USDT (TRC-20/ERC-20), BTC va boshqa aktivlar harakatini zanjir bo‘ylab kuzatish, markazlashgan birja (CEX) depozit manzillarini aniqlash.',
      ru: 'Трассировка движения USDT (TRC-20/ERC-20), BTC и выявление депозитных адресов централизованных криптобирж (CEX).',
      en: 'Multi-hop tracing of USDT (TRC-20/ERC-20) and BTC transfers to identify CEX deposit clusters.',
    },
    sampleQuestions: [
      'Жабрланувчи томонидан юборилган крипто-активлар қайси оралиқ ҳамёнлар орқали қайси биржа депозит манзилига келиб тушган?',
      'Гумонланувчи қурилмасидаги ҳамён адреслари мазкур транзакция занжири билан боғлиқми?',
    ],
    objects: {
      uz: 'Tranzaksiya TXID xeshlari, hamyon manzillari, birja ilovasi skrinshotlari va qurilma eksporti.',
      ru: 'Хеши транзакций (TXID), адреса кошельков, экспорт истории биржевых ордеров.',
      en: 'Transaction hashes (TXID), wallet addresses, and exchange order history exports.',
    },
    artifacts: {
      uz: 'Block explorer grafigi, Smart-kontrakt transfer loglari, KYC so‘rovi uchun birja cluster ID.',
      ru: 'Граф перемещения активов, логи смарт-контрактов, идентификатор депозитного кластера биржи.',
      en: 'Cluster transfer graph, smart-contract event logs, and CEX deposit address attribution.',
    },
  },
];

export const KB_ARTICLES: KBArticle[] = [
  {
    id: 'kb_cybercrime_typology',
    category: 'cybercrime',
    readMinutes: 6,
    tags: ['APK', 'Drop', '168', '169', 'Typology'],
    title: {
      uz: 'Kiberjinoyatlar tasnifi: ijtimoiy injiniring vs texnik buzib kirish',
      ru: 'Классификация киберпреступлений: социальная инженерия vs технический взлом',
      en: 'Cybercrime Taxonomy: Social Engineering vs Technical Intrusion',
    },
    summary: {
      uz: 'JK 168-modda (aldash) va 169/278-2-moddalar (ruxsatsiz yechib olish) o‘rtasidagi chegaralar hamda tergov taktikasi.',
      ru: 'Разграничение ст. 168 УК (обман) и ст. 169/278-2 УК (несанкционированное списание/доступ) в практике расследования.',
      en: 'Distinguishing Fraud (Art. 168) from Unauthorized Access/Theft (Art. 169 / 278-2) and tactical boundaries.',
    },
    content: {
      uz: 'Zamonaviy kiberjinoyatlar ikki asosiy mexanizmga tayanadi: 1) Jabrlanuvchini aldash orqali ixtiyoriy harakatga keltirish (soxta treyder, OLX, chet elda ish, Telegram akkauntdan pul so‘rash — JK 168-modda); 2) Jabrlanuvchi erkisiz yoki zararli dastur (APK-troyan), SMS-kodni yashirin ushlash, akkauntni egallash orqali pulni yechib olish (JK 169-modda + zarur bo‘lganda 278-2/278-6).\n\nTergov uchun muhim qoida: pulni kim o‘tkazganini aniq ajratish. Agar jabrlanuvchi aldanib o‘zi o‘tkazgan bo‘lsa — 168-modda, jinoyatchi APK yoki sessiya orqali o‘zi yechgan bo‘lsa — 169-modda.',
      ru: 'Современные киберпреступления опираются на два базовых механизма: 1) обман или злоупотребление доверием, при котором потерпевший сам переводит средства (лжетрейдеры, OLX, фиктивная работа — ст. 168 УК); 2) несанкционированное изъятие средств без воли владельца с помощью вредоносного ПО (APK-троян), перехвата SMS-кодов или фишинга (ст. 169 УК в совокупности со ст. 278-2/278-6).\n\nКлючевое правило квалификации: кто именно инициировал платёжную транзакцию.',
      en: 'Modern cybercrime relies on two core vectors: (1) deception inducing the victim to initiate a transfer (fake trading, marketplace scams — Art. 168); (2) unauthorized access or malware-driven theft without victim consent (APK trojans, OTP interception — Art. 169 plus Art. 278-2/278-6).\n\nDetermining who executed the transaction is the primary qualification threshold.',
    },
  },
  {
    id: 'kb_digital_evidence',
    category: 'evidence',
    readMinutes: 7,
    tags: ['Chain of Custody', 'SHA-256', 'JPK 70', 'ISO 27037'],
    title: {
      uz: 'Raqamli dalillar va dalillar zanjiri (Chain of Custody)',
      ru: 'Цифровые доказательства и цепочка сохранности (Chain of Custody)',
      en: 'Digital Evidence & Chain of Custody Standards',
    },
    summary: {
      uz: 'Elektron dalillarni sudda rad etilmaydigan qilib rasmiylashtirish: izolyatsiya, xeshlash, muhrlash va topshirish.',
      ru: 'Процессуальная устойчивость цифровых улик: изоляция, вычисление хеш-суммы, опечатывание и учёт передачи.',
      en: 'Making digital evidence court-admissible through RF isolation, cryptographic hashing, sealing, and transfer logs.',
    },
    content: {
      uz: 'Raqamli ma’lumotlar o‘zgaruvchan (volatile) bo‘lgani uchun uchta oltin qoidaga rioya qilinadi:\n1. Tarmoqdan ajratish: telefonni samolyot rejimiga o‘tkazish yoki Faraday qopiga solish — aks holda masofadan tozalash (Remote Wipe) amalga oshiriladi.\n2. Xeshlash: ko‘zdan kechirish paytida faylning SHA-256 qiymatini mutaxassis (JPK 70-m.) ishtirokida bayonnomaga yozish.\n3. Zanjirni uzmaslik: har bir topshirish va ekspertiza qabuli sana, vaqt, kimdan-kimga va qayta tekshirilgan xesh bilan qayd etiladi.',
      ru: 'Цифровые данные легко изменяемы, поэтому применяются три правила:\n1. Изоляция от сети: перевод устройства в авиарежим или экранирующий пакет во избежание удалённого сброса (Remote Wipe).\n2. Хеширование: вычисление SHA-256 с участием специалиста (ст. 70 УПК) и фиксация в протоколе.\n3. Цепочка сохранности: документирование каждой передачи объекта с указанием времени, лиц и сверкой контрольной суммы.',
      en: 'Because digital artifacts are volatile, three mandatory safeguards apply:\n1. Network Isolation: Enable airplane mode or Faraday bag to block remote wipe commands.\n2. Cryptographic Hashing: Compute and record SHA-256 digests in the inspection protocol with a specialist.\n3. Unbroken Chain of Custody: Log every transfer with timestamps, signatures, and re-verified hashes.',
    },
  },
  {
    id: 'kb_osint_methodology',
    category: 'osint',
    readMinutes: 5,
    tags: ['DNS', 'RDAP', 'CT Logs', 'Attribution'],
    title: {
      uz: 'OSINT metodologiyasi: domenlar, sertifikatlar va raqamli izlar',
      ru: 'Методология OSINT: домены, сертификаты и цифровые следы',
      en: 'OSINT Methodology: Domains, Certificate Transparency & Footprints',
    },
    summary: {
      uz: 'Ochiq va qonuniy manbalar (DNS, RDAP, crt.sh, IP/ASN) orqali fishing infratuzilmasini aniqlash.',
      ru: 'Выявление фишинговой инфраструктуры через легальные публичные источники: DNS, RDAP, crt.sh и ASN.',
      en: 'Mapping phishing infrastructure via legal public intelligence: DNS records, RDAP, crt.sh, and ASN data.',
    },
    content: {
      uz: 'Ochiq manbalar razvedkasi (OSINT) buzib kirish emas, balki umumiy texnik reyestrlarni tahlil qilishdir:\n• DNS (A, MX, TXT, NS): sayt qaysi server va pochta provayderiga ulanganini ko‘rsatadi.\n• RDAP / WHOIS: domen ro‘yxatga olingan sana (yangi domenlar ko‘pincha fishingga xos) va registrator.\n• Certificate Transparency (crt.sh): SSL sertifikati chiqarilgan barcha subdomenlarni ochib beradi.\n• ASN / IP: xosting provayderiga rasmiy so‘rov (preservation request) yuborish uchun manzilni aniqlaydi.',
      ru: 'OSINT не является взломом — это систематический анализ публичных технических реестров:\n• DNS (A, MX, TXT, NS): привязка домена к хостингу и почтовым серверам.\n• RDAP / WHOIS: дата регистрации (свежие домены типичны для фишинга) и регистратор.\n• Certificate Transparency (crt.sh): история выпуска SSL-сертификатов и поддомены.\n• ASN / IP: идентификация провайдера для направления официального запроса о сохранении логов.',
      en: 'OSINT relies exclusively on lawful public registries:\n• DNS (A, MX, TXT, NS): Resolves hosting IPs and mail relays.\n• RDAP / WHOIS: Reveals domain creation date (newly registered domains correlate with phishing) and registrar.\n• Certificate Transparency (crt.sh): Exposes issued SSL certificates and subdomains.\n• ASN / IP: Identifies the hosting provider for legal preservation requests.',
    },
  },
  {
    id: 'kb_cybersecurity_basics',
    category: 'security',
    readMinutes: 5,
    tags: ['2FA', 'SIM-swap', 'APK', 'Zero-Trust'],
    title: {
      uz: 'Kiberxavfsizlik asoslari: SMS-kod, 2FA va APK xavflaridan himoya',
      ru: 'Основы кибербезопасности: защита от перехвата SMS, 2FA и вредоносных APK',
      en: 'Cybersecurity Essentials: Defending Against SMS Hijacking & Malicious APKs',
    },
    summary: {
      uz: 'Nima uchun oddiy SMS-tasdiqlash yetarli emas va jabrlanuvchilarning 80% qanday xatolarga yo‘l qo‘yadi.',
      ru: 'Почему SMS-подтверждение уязвимо и какие ошибки чаще всего допускают пользователи.',
      en: 'Why SMS OTPs fail against trojans and how multi-factor hardening prevents account takeovers.',
    },
    content: {
      uz: 'Zararli APK ilovalar SMS xabarlarni o‘qish (READ_SMS) va Accessibility xizmati orqali ekrandagi tugmalarni bosish huquqini oladi. Shu sababli bir martalik SMS-kod ham himoya qila olmaydi.\n\nOldini olish choralari: noma’lum manbalardan APK o‘rnatishni cheklash, bank ilovalarida apparat biometriyasi va qo‘shimcha PIN/parol (Telegram ikki bosqichli tekshiruv) yoqish, bank antifrod tizimi orqali shubhali qurilma sessiyalarini cheklash.',
      ru: 'Вредоносные APK запрашивают разрешения READ_SMS и Accessibility Service, позволяющие перехватывать одноразовые коды и управлять экраном. В результате классическое SMS-подтверждение не спасает.\n\nМеры защиты: запрет установки APK из сторонних источников, использование аппаратной биометрии и облачного пароля (2FA), немедленный отзыв активных сессий.',
      en: 'Malicious APKs abuse READ_SMS and Android Accessibility Services to silently intercept OTPs and tap banking UI buttons.\n\nHardening controls: restrict sideloading unknown APKs, enforce app-based TOTP/cloud 2FA passwords, monitor active sessions, and deploy bank anti-fraud device binding.',
    },
  },
  {
    id: 'kb_iso_standards',
    category: 'standards',
    readMinutes: 6,
    tags: ['ISO/IEC 27037', 'Budapest Convention', 'RFC 3227'],
    title: {
      uz: 'Xalqaro standartlar: ISO/IEC 27037, RFC 3227 va Budapesht konvensiyasi',
      ru: 'Международные стандарты: ISO/IEC 27037, RFC 3227 и Будапештская конвенция',
      en: 'International Standards: ISO/IEC 27037, RFC 3227 & Budapest Convention',
    },
    summary: {
      uz: 'Raqamli dalillarni yig‘ish, saqlash va xalqaro hamkorlik bo‘yicha jahon standartlari sharhi.',
      ru: 'Обзор международных стандартов идентификации, сбора и трансграничного обмена электронными доказательствами.',
      en: 'Global standards for digital evidence acquisition, volatility preservation, and cross-border cooperation.',
    },
    content: {
      uz: '1. ISO/IEC 27037: raqamli dalillarni aniqlash, yig‘ish, saqlash va tashish bo‘yicha xalqaro qo‘llanma (DEFR — Digital Evidence First Responder).\n2. RFC 3227: o‘zgaruvchanlik tartibi (Order of Volatility) — avval RAM/operativ xotira va faol tarmoq ulanishlari, keyin disk va arxivlar olinadi.\n3. Budapesht konvensiyasi: kompyuter jinoyatlari bo‘yicha ma’lumotlarni tezkor saqlash (Expedited Preservation) va xalqaro so‘rovlar mexanizmi.',
      ru: '1. ISO/IEC 27037: международный стандарт идентификации, сбора и сохранения цифровых доказательств (принципы неразрушения и воспроизводимости).\n2. RFC 3227: порядок летучести (Order of Volatility) — сначала RAM, кэш и активные сетевые сессии, затем энергонезависимые диски.\n3. Будапештская конвенция: механизмы ускоренного сохранения трафика (90 дней) и трансграничного взаимодействия.',
      en: '1. ISO/IEC 27037: Guidelines for identification, collection, acquisition, and preservation of digital evidence.\n2. RFC 3227: Order of Volatility — acquire registers, RAM, and active network state before persistent disks.\n3. Budapest Convention: Establishes expedited data preservation (Art. 16) and mutual legal assistance channels.',
    },
  },
  {
    id: 'kb_glossary_extended',
    category: 'glossary',
    readMinutes: 4,
    tags: ['C2', 'SIM-box', 'P2P', 'IOC', 'Hashing'],
    title: {
      uz: 'Kibertergov atamalari kengaytirilgan lug‘ati',
      ru: 'Расширенный глоссарий терминов киберрасследования',
      en: 'Extended Cyber Investigation Glossary',
    },
    summary: {
      uz: 'IOC, C2 server, SIM-box, Drop-ferma, P2P uchburchak sxemasi va Accessibility abuse tushunchalari.',
      ru: 'Понятия IOC, C2-сервер, SIM-бокс, дроп-ферма, треугольная схема P2P и злоупотребление Accessibility.',
      en: 'Definitions of IOC, C2 Server, SIM-box, Drop Farm, P2P Triangular Scam, and Accessibility Abuse.',
    },
    content: {
      uz: '• IOC (Indicator of Compromise): zararli faoliyat belgisi — IP, domen, SHA-256 xesh, bot tokeni.\n• C2 (Command & Control): zararli dastur buyruq oladigan va o‘g‘irlangan ma’lumotlarni yuboradigan server/bot.\n• Drop-ferma: bitta qurilma yoki SIM-to‘plam orqali o‘nlab begona kartalarni boshqarish.\n• P2P uch tomonlama sxema: firibgar halol P2P sotuvchining rekvizitini jabrlanuvchiga berib, kriptovalyutani o‘zi oladi.',
      ru: '• IOC (Индикатор компрометации): технический признак атаки — IP, домен, хеш SHA-256, токен бота.\n• C2 (Command & Control): управляющий сервер или Telegram-бот вредоносной сети.\n• Дроп-ферма: управление десятками чужих банковских карт с одного устройства/IMEI.\n• Треугольная схема P2P: мошенник подставляет карту честного продавца криптовалюты для получения денег от жертвы.',
      en: '• IOC (Indicator of Compromise): Observable artifact of intrusion — IP, domain, SHA-256, bot token.\n• C2 (Command & Control): Infrastructure used by attackers to issue commands and exfiltrate data.\n• Drop Farm: Operating dozens of third-party bank cards from a single mobile device/IMEI.\n• P2P Triangular Scam: Fraudster routes victim fiat directly to an honest P2P seller while receiving crypto.',
    },
  },
];

export const OSINT_TASKS: OsintTask[] = [
  {
    id: 'osint_t1',
    title: {
      uz: '1-topshiriq: Fishing domenining yashirin belgisi',
      ru: 'Задание 1: Выявление признака фишингового домена',
      en: 'Task 1: Identifying Phishing Domain Indicators',
    },
    scenario: {
      uz: 'Jabrlanuvchi «Bir martalik yordam» va’da qilingan havola orqali karta ma’lumotlarini kiritgan. Olingan RDAP va sertifikat qaydlari quyida berilgan:',
      ru: 'Потерпевший ввёл данные карты на сайте «единовременной выплаты». Ниже приведены публичные записи RDAP и сертификата:',
      en: 'A victim entered card details on a fake relief-payment site. Examine the simulated public RDAP & cert excerpt below:',
    },
    artifact: `Domain: uz-kompensatsiya-2026[.]xyz
Created: 2026-07-14T08:12:00Z (2 days before incident)
Registrar: CheapName Registrar Ltd.
DNS A: 185.220.101.44 (ASN 204957 - Bulletproof VPS)
SSL Subject CN: *.uz-kompensatsiya-2026.xyz
HTML Form Action: https://api.telegram.org/bot7192884:AAH.../sendMessage`,
    question: {
      uz: 'Ma’lumotlar qayerga yuborilayotganini aniqlang (xizmat nomini yozing, masalan: Telegram Bot API yoki Domen nomi).',
      ru: 'Определите, через какой сервис утекают данные формы (укажите название сервиса или ключевой идентификатор).',
      en: 'Identify which external service receives the exfiltrated form data (enter service name, e.g. Telegram).',
    },
    hint: {
      uz: 'HTML Form Action qatoriga e’tibor bering: api.telegram.org/...',
      ru: 'Обратите внимание на строку HTML Form Action в самом низу.',
      en: 'Look closely at the HTML Form Action endpoint at the bottom.',
    },
    acceptedAnswers: ['telegram', 'api.telegram.org', 'telegram bot', 'telegram bot api', 'bot7192884'],
    explanation: {
      uz: 'To‘g‘ri! HTML forma karta ma’lumotlarini to‘g‘ridan-to‘g‘ri Telegram Bot API (`api.telegram.org/bot...`) orqali jo‘natmoqda. Bot tokeni orqali boshqa saytlardagi epizodlarni bitta seriyaga birlashtirish mumkin.',
      ru: 'Верно! Форма отправляет данные напрямую в Telegram Bot API. Токен бота служит ключевым IOC для объединения серии эпизодов.',
      en: 'Correct! The form exfiltrates stolen card fields directly via the Telegram Bot API, whose bot token links related campaigns.',
    },
  },
  {
    id: 'osint_t2',
    title: {
      uz: '2-topshiriq: EXIF/Metama’lumotdagi joylashuv va dastur izi',
      ru: 'Задание 2: Анализ метаданных и признаков подделки чека',
      en: 'Task 2: Metadata Tampering in a Payment Receipt',
    },
    scenario: {
      uz: 'Gumonlanuvchi «pulni qaytarib berdim» deb Telegram orqali PDF chek yuborgan. Faylning metama’lumotlari tekshirildi:',
      ru: 'Подозреваемый прислал PDF-квитанцию об обратном переводе. Метаданные файла содержат следующие поля:',
      en: 'A suspect sent a PDF transfer receipt claiming a refund. Inspect the extracted PDF metadata:',
    },
    artifact: `File: check_88412.pdf
PDF Version: 1.7
Creator: Adobe Photoshop 25.4 (Windows)
Producer: Adobe PDF Library 17.0
CreateDate: 2026:07-16 14:22:09+05:00
ModifyDate: 2026:07-16 14:26:41+05:00
Expected Bank System Producer: JasperReports / OpenPDF`,
    question: {
      uz: 'Hujjat qaysi grafik muharrir yordamida tahrirlanganini yozing:',
      ru: 'Укажите программу, в которой была создана/отредактирована данная квитанция:',
      en: 'Name the graphics software recorded in the Creator metadata field:',
    },
    hint: {
      uz: 'Creator maydoniga qarang.',
      ru: 'Проверьте поле Creator.',
      en: 'Check the Creator metadata field.',
    },
    acceptedAnswers: ['photoshop', 'adobe photoshop', 'adobe photoshop 25.4'],
    explanation: {
      uz: 'Ajoyib! Rasmiy bank tizimlari PDF chekni serverda avtomatik generatsiya qiladi (JasperReports/iText/OpenPDF). Adobe Photoshop izi soxtalashtirishning (JK 228-modda) aniq belgisidir.',
      ru: 'Отлично! Банковские чеки генерируются серверными библиотеками, а след Adobe Photoshop указывает на подделку документа.',
      en: 'Spot on! Automated banking generators use server libraries, whereas Adobe Photoshop indicates receipt forgery.',
    },
  },
  {
    id: 'osint_t3',
    title: {
      uz: '3-topshiriq: Kripto-tranzaksiya birja manzilini aniqlash',
      ru: 'Задание 3: Трассировка криптотранзакции на биржу',
      en: 'Task 3: Identifying a CEX Deposit Hop',
    },
    scenario: {
      uz: 'P2P uchburchak sxemasi bo‘yicha 4 500 USDT quyidagi zanjir bo‘ylab o‘tkazilgan:',
      ru: 'По треугольной P2P-схеме 4 500 USDT прошли по следующей цепочке транзакций:',
      en: 'In a P2P triangular scam, 4,500 USDT traversed this simulated on-chain path:',
    },
    artifact: `Hop 1: TXa91... -> TV7xK9pQ...m29L (Suspect Interim Wallet)
Hop 2: TXb42... -> TRxBinanceHotWallet9912 (Label: Binance Hot Wallet)
Memo/Tag Note: Internal Deposit Cluster #BIN-44910
Protocol: TRC-20 (TRON Network)`,
    question: {
      uz: 'Mablag‘ oxir-oqibat qaysi markazlashgan birjaga tushganini yozing:',
      ru: 'На какую централизованную криптобиржу в итоге поступили активы?',
      en: 'Which centralized exchange received the funds at Hop 2?',
    },
    hint: {
      uz: 'Hop 2 qatoridagi Label izohiga qarang.',
      ru: 'Посмотрите на метку Label во втором шаге (Hop 2).',
      en: 'Check the Label attribute on Hop 2.',
    },
    acceptedAnswers: ['binance', 'binance hot wallet'],
    explanation: {
      uz: 'To‘g‘ri! Mablag‘ Binance birjasining depozit klasteriga tushgan. Demak, birjaning compliance bo‘limiga rasmiy so‘rov va muzdatish xati yuborish kerak.',
      ru: 'Верно! Средства поступили в депозитный кластер Binance — необходимо направить официальный запрос в службу комплаенс биржи.',
      en: 'Correct! Funds landed in a Binance deposit cluster, enabling a formal freeze and KYC request to Binance compliance.',
    },
  },
  {
    id: 'osint_t4',
    title: {
      uz: '4-topshiriq: Telegram username vs o‘zgarmas ID',
      ru: 'Задание 4: Постоянный ID против сменяемого username',
      en: 'Task 4: Immutable User ID vs Mutable Username',
    },
    scenario: {
      uz: 'Gumonlanuvchi firibgarlikdan so‘ng `@treyder_vip_uz` nomini `@clean_user99` ga o‘zgartirgan. Ko‘zdan kechirish bayonnomasida quyidagi JSON saqlanib qolgan:',
      ru: 'Подозреваемый сменил username с `@treyder_vip_uz` на `@clean_user99`. В сохранённом JSON-профиле зафиксировано:',
      en: 'A suspect changed their handle from `@treyder_vip_uz` to `@clean_user99`. An earlier export recorded:',
    },
    artifact: `{
  "id": 6849201145,
  "username": "treyder_vip_uz",
  "first_name": "FX Signals",
  "phone_hidden": true
}`,
    question: {
      uz: 'Akkauntni keyinchalik ham aniq tanib olish uchun qaysi raqamli identifikator o‘zgarmas hisoblanadi? (Raqamni kiriting)',
      ru: 'Какой неизменяемый числовой идентификатор позволяет отслеживать аккаунт даже после смены ника?',
      en: 'Enter the immutable numeric identifier that stays constant even after username changes:',
    },
    hint: {
      uz: 'JSON ichidagi `"id"` qiymatini ko‘chirib yozing.',
      ru: 'Скопируйте числовое значение поля "id" из JSON.',
      en: 'Copy the numeric value of the "id" field.',
    },
    acceptedAnswers: ['6849201145'],
    explanation: {
      uz: 'Aniq! Telegram’da username bir necha soniyada o‘zgaradi yoki o‘chiriladi, lekin raqamli `id` (`6849201145`) o‘zgarmaydi.',
      ru: 'Точно! Username можно сменить мгновенно, а числовой User ID остаётся постоянным.',
      en: 'Exact! Usernames are mutable, whereas the numeric Telegram User ID (`6849201145`) remains permanent.',
    },
  },
];

export interface SampleLogDataset {
  id: string;
  title: TrilingualText;
  description: TrilingualText;
  rawLog: string;
}

export const SAMPLE_FORENSIC_LOGS: SampleLogDataset[] = [
  {
    id: 'log_apk',
    title: {
      uz: '[O‘quv log] Android APK-troyan va SMS ushlash hodisalari',
      ru: '[Учебный лог] Android APK-троян и перехват SMS-кодов',
      en: '[Training Log] Android APK Trojan & SMS Interception',
    },
    description: {
      uz: 'Jabrlanuvchi qurilmasidan olingan o‘quv logi: noma’lum APK o‘rnatilishi, Accessibility yoqilishi va C2 ga ma’lumot ketishi.',
      ru: 'Учебный журнал событий: установка стороннего APK, активация Accessibility и отправка SMS на C2-сервер.',
      en: 'Training event log capturing third-party APK sideloading, Accessibility abuse, and C2 exfiltration.',
    },
    rawLog: `2026-07-15T14:02:11Z | INFO | Telegram | Downloaded file: Soliq_Qarzdorlik_2026.apk (SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855)
2026-07-15T14:02:49Z | WARNING | PackageInstaller | Installed unknown package: com.uz.soliq.helper (permissions: RECEIVE_SMS, READ_SMS, BIND_ACCESSIBILITY_SERVICE)
2026-07-15T14:03:18Z | CRITICAL | AccessibilityManager | Service enabled by user prompt: com.uz.soliq.helper/.CoreService
2026-07-15T14:04:05Z | WARNING | BankingApp | Session started programmatically while screen overlay active
2026-07-15T14:04:19Z | CRITICAL | TelephonyProvider | Incoming OTP SMS (Bank: 4910): Code 849201 intercepted by com.uz.soliq.helper
2026-07-15T14:04:20Z | CRITICAL | NetGuard | Outbound POST https://api.telegram.org/bot781220:AAX_DEMO_TOKEN/sendMessage -> 185.220.101.44`,
  },
  {
    id: 'log_ssh',
    title: {
      uz: '[O‘quv log] Tashkilot serveriga SSH brute-force va ma’lumot yuklash',
      ru: '[Учебный лог] Взлом SSH корпоративного сервера и выгрузка БД',
      en: '[Training Log] Server SSH Intrusion & Database Exfiltration',
    },
    description: {
      uz: 'JK 278-2 va 141-2 moddalar bo‘yicha serverga kirish va mijozlar bazasi chiqib ketishi o‘quv logi.',
      ru: 'Учебный лог по ст. 278-2 и 141-2 УК: подбор пароля SSH и экспорт дампа базы данных.',
      en: 'Training intrusion log illustrating SSH credential stuffing and unauthorized DB export.',
    },
    rawLog: `2026-07-18T02:10:04Z | INFO | sshd | Failed password for root from 91.214.124.88 port 51204
2026-07-18T02:11:19Z | WARNING | sshd | 42 failed login attempts detected from 91.214.124.88 (AS49505)
2026-07-18T02:14:02Z | CRITICAL | sshd | Accepted password for deploy_admin from 91.214.124.88 port 53112
2026-07-18T02:16:33Z | WARNING | bash_history | Executed: mysqldump -u root customers_pii > /tmp/db_dump_2026.sql
2026-07-18T02:19:45Z | CRITICAL | nginx/sftp | Outbound file transfer /tmp/db_dump_2026.sql (142 MB) to 91.214.124.88
2026-07-18T02:21:10Z | INFO | auditd | Attempted log truncation: truncate -s 0 /var/log/auth.log`,
  },
  {
    id: 'log_drop',
    title: {
      uz: '[O‘quv log] Drop-ferma: bitta IMEI orqali 14 ta kartaga kirish',
      ru: '[Учебный лог] Дроп-ферма: вход в 14 карт с одного IMEI',
      en: '[Training Log] Drop Farm: 14 Cards Accessed from One IMEI',
    },
    description: {
      uz: 'To‘lov tashkiloti antifrod logi: bitta qurilma va IP dan ko‘plab begona kartalarni boshqarish.',
      ru: 'Антифрод-лог платёжной системы: управление множеством чужих карт с одного устройства и IP.',
      en: 'Payment anti-fraud log showing one mobile device controlling 14 unrelated third-party cards.',
    },
    rawLog: `2026-07-20T18:10:00Z | INFO | AuthGateway | Card *4412 linked to DeviceID: dev_99812a (IMEI: 358910094412001) IP: 195.158.14.90
2026-07-20T18:12:15Z | WARNING | AuthGateway | Cards *7731, *1109, *8820 bound to same DeviceID: dev_99812a within 3 minutes
2026-07-20T18:15:40Z | CRITICAL | Antifraud | Velocity Alert: 14 distinct PINFL cardholders controlled from single IMEI 358910094412001
2026-07-20T18:19:02Z | CRITICAL | P2PTransfer | Outbound transfer 18,500,000 UZS -> Crypto P2P Merchant #8841
2026-07-20T18:24:50Z | WARNING | ATM_Switch | Cash-out attempt 4,000,000 UZS at ATM #TSH-204 (Chilonzor)`,
  },
];

export const SIM_CASES: SimCase[] = [
  {
    id: 'sim_apk_169',
    code: 'SIM-2026-01',
    difficulty: 'junior',
    relatedArticleId: 'a169',
    title: {
      uz: '«Soliq xabarnomasi» nomli APK orqali 48 mln so‘m yechib olingan',
      ru: 'Списание 48 млн сум через поддельный APK «Налоговое уведомление»',
      en: '48M UZS Theft via Fake "Tax Notice" APK Trojan',
    },
    briefing: {
      uz: 'O‘QUV ISHI (SIMULYATSIYA): Fuqaro A. Telegramda «soliq qarzi» haqidagi faylni yuklab olib o‘rnatgan. 12 daqiqadan so‘ng uning ikkita bank kartasidan jami 48 000 000 so‘m noma’lum drop-kartaga o‘tib ketgan.',
      ru: 'УЧЕБНОЕ ДЕЛО (СИМУЛЯЦИЯ): Гражданин А. установил файл из Telegram под видом «налогового уведомления». Через 12 минут с двух карт списано 48 000 000 сум на неизвестную дроп-карту.',
      en: 'TRAINING CASE (SIMULATED): Citizen A installed a Telegram file disguised as a tax notice. Within 12 minutes, 48,000,000 UZS were transferred to an unknown drop card.',
    },
    artifacts: [
      {
        label: { uz: 'Ariza va chek', ru: 'Заявление и чек', en: 'Report & Receipt' },
        kind: 'TXT',
        content: 'Vaqt: 14:15 | Summa: 48 000 000 so‘m | Qabul qiluvchi karta: 8600 12** **** 9941 | Jabrlanuvchi SMS-kodni hech kimga og‘zaki aytmagan.',
      },
      {
        label: { uz: 'Telefondagi fayl', ru: 'Файл в телефоне', en: 'Device File' },
        kind: 'APK',
        content: 'Nomi: Soliq_tekshiruv.apk | O‘lchami: 4.2 MB | Manba: Telegram bot @soliq_yordam_demo',
      },
    ],
    steps: [
      {
        id: 's1',
        prompt: {
          uz: '1-bosqich (0–30 daqiqa): Birinchi navbatda qaysi tezkor harakat va kvalifikatsiya to‘g‘ri?',
          ru: 'Этап 1 (0–30 минут): Какое первоочередное действие и первичная квалификация верны?',
          en: 'Stage 1 (0–30 min): Which immediate action and preliminary qualification are correct?',
        },
        choices: [
          {
            id: 'c1a',
            isOptimal: true,
            points: 35,
            label: {
              uz: 'Antifrodga karta 8600...9941 ni muzdatish so‘rovi + telefonni samolyot rejimiga olish; JK 169-modda (+ 278-2/278-6 belgilari) bo‘yicha baholash.',
              ru: 'Срочный запрос в антифрод на блокировку карты 8600...9941 + авиарежим на телефоне; квалификация по ст. 169 УК (+ 278-2/278-6).',
              en: 'Send urgent freeze request for card 8600...9941 + airplane mode on phone; qualify under Art. 169 (+ 278-2/278-6).',
            },
            feedback: {
              uz: 'To‘g‘ri qaror! Jabrlanuvchi o‘zi o‘tkazmagan, pul zararli APK orqali yechilgan — bu JK 169-m. Birinchi 30 daqiqada muzdatish va qurilmani izolyatsiya qilish hal qiluvchi.',
              ru: 'Отлично! Деньги списаны без воли владельца через троян — это ст. 169 УК. Блокировка и изоляция устройства в первые 30 минут критичны.',
              en: 'Optimal! Because malware drained the account without user consent, Art. 169 applies, and immediate freeze + isolation preserves funds and evidence.',
            },
            nextStepId: 's2',
          },
          {
            id: 'c1b',
            isOptimal: false,
            points: 5,
            label: {
              uz: 'Jabrlanuvchi faylni o‘zi yuklab olgani uchun JK 168-modda deb rasmiylashtirish va telefondan APKni darhol o‘chirib tashlash.',
              ru: 'Квалифицировать по ст. 168 УК и сразу удалить вредоносный APK с телефона потерпевшего.',
              en: 'Classify as Art. 168 fraud and immediately uninstall the malicious APK from the phone.',
            },
            feedback: {
              uz: 'Xato! APKni o‘chirish raqamli dalilni yo‘qotadi (bot tokeni va xesh qo‘ldan chiqadi). Shuningdek, pulni jinoyatchi yechgani sababli bu 169-modda.',
              ru: 'Ошибка! Удаление APK уничтожает улику (токен бота и хеш). Списание без воли владельца квалифицируется по ст. 169 УК.',
              en: 'Suboptimal! Uninstalling destroys the forensic APK (bot token/hash), and unauthorized drainage is Art. 169 rather than Art. 168.',
            },
            nextStepId: 's2',
          },
        ],
      },
      {
        id: 's2',
        prompt: {
          uz: '2-bosqich (Dalillar va Seriya): Mutaxassis APK ichidan Telegram bot tokeni `bot719...` va C2 IPni chiqardi. Keyingi eng muhim qadam nima?',
          ru: 'Этап 2 (Улики и серия): Специалист извлёк из APK токен Telegram-бота `bot719...`. Какой следующий шаг даст наибольший эффект?',
          en: 'Stage 2 (Forensics & Series): The specialist extracted Telegram bot token `bot719...` from the APK. What is the highest-impact next step?',
        },
        choices: [
          {
            id: 'c2a',
            isOptimal: true,
            points: 35,
            label: {
              uz: 'Bot tokenini respublika/viloyat rekvizitlar bazasida tekshirib, boshqa ishlarni seriyaga birlashtirish + drop-karta kirgan Device ID/IMEI ni bankdan olish.',
              ru: 'Пробить токен бота по базе реквизитов для объединения серии дел + запросить в банке Device ID/IMEI входа в приложение дроп-карты.',
              en: 'Cross-reference the bot token in the regional IOC registry to link series cases + request drop-card Device ID/IMEI from the bank.',
            },
            feedback: {
              uz: 'Mukammal! Bitta bot tokeni va drop Device ID odatda o‘nlab to‘xtatilgan ishlarni birlashtirib, tashkilotchini topishga olib keladi.',
              ru: 'Верно! Один токен бота и Device ID дропа часто связывают десятки приостановленных эпизодов в одно крупное дело.',
              en: 'Excellent! Bot tokens and drop-card Device IDs frequently connect dozens of stalled cases into one organized series.',
            },
            nextStepId: 's3',
          },
          {
            id: 'c2b',
            isOptimal: false,
            points: 10,
            label: {
              uz: 'Faqat Telegram botni bloklash haqida xat yuborib, drop-karta egasi kelishini kutish.',
              ru: 'Отправить запрос только на блокировку Telegram-бота и ждать явки владельца карты.',
              en: 'Only request blocking the Telegram bot and wait for the cardholder to appear.',
            },
            feedback: {
              uz: 'Yetarli emas: botni vaqtli bloklash boshqa jabrlanuvchilarni asraydi, lekin Device ID va seriyali solishtirishsiz tashkilotchiga chiqib bo‘lmaydi.',
              ru: 'Недостаточно: без проверки токена по серии и запроса Device ID в банке расследование зайдёт в тупик.',
              en: 'Insufficient: without cross-referencing the token and obtaining drop Device IDs, the investigation will stall.',
            },
            nextStepId: 's3',
          },
        ],
      },
      {
        id: 's3',
        prompt: {
          uz: '3-bosqich (Ekspertiza): Gumonlanuvchi qo‘lga olinganda noutbukidan Android Studio loyihasi va `.keystore` fayli topildi. Sud-kompyuter ekspertizasiga qanday savol qo‘yasiz?',
          ru: 'Этап 3 (Экспертиза): При обыске у подозреваемого изъят ноутбук с проектом Android Studio и файлом `.keystore`. Какой вопрос поставить эксперту?',
          en: 'Stage 3 (Forensics): During search, an Android Studio project and `.keystore` file are found on the suspect laptop. What question do you submit?',
        },
        choices: [
          {
            id: 'c3a',
            isOptimal: true,
            points: 30,
            label: {
              uz: 'Jabrlanuvchilardan olingan APK namunalari gumonlanuvchi kompyuteridagi aynan shu manba kodi va imzo kaliti (.keystore) bilan yaratilganmi?',
              ru: 'Созданы ли обнаруженные у потерпевших образцы APK с использованием данного исходного кода и ключа подписи (.keystore)?',
              en: 'Were the APK samples collected from victims compiled using this exact source code and `.keystore` signing key?',
            },
            feedback: {
              uz: 'A’lo! Bu savol barcha seriyali epizodlarni to‘g‘ridan-to‘g‘ri gumonlanuvchiga bog‘lovchi hal qiluvchi dalilni beradi.',
              ru: 'Превосходно! Этот вопрос позволяет доказать причастность подозреваемого ко всему кластеру эпизодов.',
              en: 'Spot on! Matching the keystore and source code links the suspect directly to the entire malware cluster.',
            },
          },
          {
            id: 'c3b',
            isOptimal: false,
            points: 10,
            label: {
              uz: 'Noutbukda Internet brauzer ochilganmi va batareyasi necha foiz?',
              ru: 'Открывался ли на ноутбуке браузер и каков износ батареи?',
              en: 'Was a web browser opened on the laptop and what is the battery level?',
            },
            feedback: {
              uz: 'Bu savol jinoyat qurolini (APK yaratilishini) isbotlashga xizmat qilmaydi.',
              ru: 'Этот вопрос не доказывает факт создания и распространения вредоносного ПО.',
              en: 'This question fails to establish authorship of the malicious APK samples.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'sim_p2p_crypto',
    code: 'SIM-2026-02',
    difficulty: 'middle',
    relatedArticleId: 'a2788',
    title: {
      uz: 'P2P uchburchak sxemasi va 120 mln so‘mlik soxta investitsiya',
      ru: 'Треугольная P2P-схема и лже-инвестиции на 120 млн сум',
      en: 'Triangular P2P Scam & 120M UZS Fake Trading Platform',
    },
    briefing: {
      uz: 'O‘QUV ISHI (SIMULYATSIYA): Fuqaro B. «treyder» kanalida daromad va’dasiga ishonib, ko‘rsatilgan 9860... karta raqamiga 120 mln so‘m o‘tkazgan. Karta egasi esa o‘sha daqiqada P2P birjada USDT sotganini aytmoqda.',
      ru: 'УЧЕБНОЕ ДЕЛО (СИМУЛЯЦИЯ): Гражданин Б. перевёл 120 млн сум на карту 9860..., указанную «трейдером». Владелец карты утверждает, что просто продавал USDT на P2P-бирже.',
      en: 'TRAINING CASE (SIMULATED): Citizen B sent 120M UZS to card 9860... given by a fake trader. The cardholder claims they were legitimately selling USDT on a P2P exchange.',
    },
    artifacts: [
      {
        label: { uz: 'P2P order skrinshoti', ru: 'Скриншот P2P-ордера', en: 'P2P Order Screenshot' },
        kind: 'IMG/JSON',
        content: 'Order #P2P-9941 | Summa: 120 000 000 UZS -> 9 450 USDT | Yuborilgan hamyon: TX9k...88pQ (TRC-20)',
      },
    ],
    steps: [
      {
        id: 'p1',
        prompt: {
          uz: '1-bosqich: Karta egasi (P2P sotuvchi) bilan qanday protsessual maqomda ishlash to‘g‘ri?',
          ru: 'Этап 1: В каком процессуальном статусе следует первоначально допросить P2P-продавца?',
          en: 'Stage 1: How should you initially handle the P2P seller whose card received the victim funds?',
        },
        choices: [
          {
            id: 'p1a',
            isOptimal: true,
            points: 50,
            label: {
              uz: 'Avval guvoh sifatida so‘roq qilish, order skrinshotini olish va USDT yuborilgan TRC-20 manzilini blokcheyn tahliliga kiritish.',
              ru: 'Сначала допросить как свидетеля, изъять данные P2P-ордера и отследить адрес TRC-20, куда ушли USDT.',
              en: 'Interview initially as a witness, secure P2P order records, and trace the recipient TRC-20 wallet on-chain.',
            },
            feedback: {
              uz: 'To‘g‘ri! Uch tomonlama sxemada P2P sotuvchi firibgar emas, balki zanjirdagi halol vositachi bo‘lishi mumkin. Uning yuborgan USDT manzili haqiqiy firibgarga olib chiqadi.',
              ru: 'Верно! В треугольной схеме продавец может быть добросовестным участником, а адрес получателя USDT выведет на организатора.',
              en: 'Correct! In triangular P2P scams, the seller is often unwitting, and their outbound USDT address leads to the fraudster.',
            },
            nextStepId: 'p2',
          },
          {
            id: 'p1b',
            isOptimal: false,
            points: 10,
            label: {
              uz: 'Tekshirmasdan darhol asosiy firibgar deb ayblov qo‘yish va kripto izini tekshirmaslik.',
              ru: 'Без проверки сразу предъявить обвинение в мошенничестве и не проверять блокчейн.',
              en: 'Charge the seller immediately as the main fraudster without tracing the blockchain.',
            },
            feedback: {
              uz: 'Xato! Agar u haqiqatan ham order bo‘yicha USDT bergan bo‘lsa, asosiy tashkilotchi (Telegram «treyder») va kripto-hamyon egasi ochilmay qoladi.',
              ru: 'Ошибка! Не проверив блокчейн-транзакцию, вы упустите реального организатора схемы.',
              en: 'Suboptimal! Ignoring the blockchain trail misses the true organizer behind the Telegram channel.',
            },
            nextStepId: 'p2',
          },
        ],
      },
      {
        id: 'p2',
        prompt: {
          uz: '2-bosqich: TRC-20 hamyoni tahlilida 9 450 USDT xorijiy birja depozit klasteriga borgani va u yerda bir necha qatlamdan o‘tgani aniqlandi. Parallel ravishda P2P sotuvchining noqonuniy faoliyati ham ko‘rindi. Nima qilasiz?',
          ru: 'Этап 2: Выявлено поступление 9 450 USDT на депозитный кластер биржи, а также признаки нелегального P2P-обмена. Ваши действия?',
          en: 'Stage 2: Tracing confirms 9,450 USDT hit a CEX deposit cluster, while the P2P seller also operated unlicensed. What do you do?',
        },
        choices: [
          {
            id: 'p2a',
            isOptimal: true,
            points: 50,
            label: {
              uz: 'Birjaga TXID bilan muzdatish va KYC so‘rovi yuborish (168-m. bo‘yicha) hamda P2P sotuvchining ruxsatsiz aylanmasini JK 278-8 m. doirasida vakolatli organ orqali alohida baholash.',
              ru: 'Направить запрос на биржу о заморозке и KYC по TXID (по ст. 168), а безлицензионный оборот продавца оценить отдельно по ст. 278-8 УК.',
              en: 'Send a freeze & KYC request to the CEX using the TXID (Art. 168) while separately evaluating unlicensed P2P turnover under Art. 278-8.',
            },
            feedback: {
              uz: 'Mukammal tergov qarori! Ham jabrlanuvchi mablag‘i izi birjada muzdatiladi, ham P2P qonunbuzarligi to‘g‘ri huquqiy baho oladi.',
              ru: 'Отличное решение! Обеспечивается как заморозка криптоактивов на бирже, так и корректная правовая оценка P2P-деятельности.',
              en: 'Optimal! Secures CEX asset preservation/KYC while cleanly separating unlicensed exchange liability.',
            },
          },
          {
            id: 'p2b',
            isOptimal: false,
            points: 15,
            label: {
              uz: 'Kripto izi chet elda ekan deb ishni darhol to‘xtatib qo‘yish.',
              ru: 'Приостановить дело сразу, так как криптобиржа находится за рубежом.',
              en: 'Suspend the case immediately because the crypto exchange is overseas.',
            },
            feedback: {
              uz: 'Muddatidan oldin to‘xtatish xato: ko‘plab yirik birjalar huquqni muhofaza qiluvchi organlarning rasmiy portaliga javob beradi va aktivlarni muzdatadi.',
              ru: 'Преждевременная приостановка недопустима: крупные биржи реагируют на официальные запросы правоохранительных органов.',
              en: 'Premature suspension is an error: major exchanges honor law enforcement freeze and KYC portal requests.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'sim_leak_278',
    code: 'SIM-2026-03',
    difficulty: 'senior',
    relatedArticleId: 'a1412',
    title: {
      uz: 'Korporativ mijozlar bazasi sizib chiqishi va 200 mln so‘m tovlamachilik',
      ru: 'Утечка корпоративной базы клиентов и вымогательство 200 млн сум',
      en: 'Corporate PII Data Breach & 200M UZS Extortion',
    },
    briefing: {
      uz: 'O‘QUV ISHI (SIMULYATSIYA): Xususiy klinika rahbariga noma’lum Telegram akkauntdan mijozlarning 12 000 ta tibbiy va pasport yozuvlari namunasi yuborilib, 200 mln so‘m talab qilinmoqda.',
      ru: 'УЧЕБНОЕ ДЕЛО (СИМУЛЯЦИЯ): Руководителю клиники в Telegram прислали фрагмент базы из 12 000 записей пациентов и требуют 200 млн сум за неразглашение.',
      en: 'TRAINING CASE (SIMULATED): A clinic director received samples of 12,000 patient PII/medical records on Telegram with a 200M UZS ransom demand.',
    },
    artifacts: [
      {
        label: { uz: 'Server Auth Log', ru: 'Лог сервера auth.log', en: 'Server auth.log' },
        kind: 'LOG',
        content: '02:14:02Z Accepted password for deploy_admin from 91.214.124.88 | 02:16:33Z mysqldump -> /tmp/db_dump_2026.sql',
      },
    ],
    steps: [
      {
        id: 'l1',
        prompt: {
          uz: '1-bosqich: Mazkur holatda qaysi JK moddalari jamligi mavjud?',
          ru: 'Этап 1: Какая совокупность статей УК усматривается в данном инциденте?',
          en: 'Stage 1: Which combination of Criminal Code articles applies to this breach and extortion?',
        },
        choices: [
          {
            id: 'l1a',
            isOptimal: true,
            points: 50,
            label: {
              uz: 'JK 278-2 (ruxsatsiz kirish) + 141-2 (shaxsga doir ma’lumotlar) + 165 (tovlamachilik).',
              ru: 'Совокупность: ст. 278-2 (несанкционированный доступ) + 141-2 (персональные данные) + 165 (вымогательство).',
              en: 'Combination: Art. 278-2 (unauthorized access) + Art. 141-2 (personal data breach) + Art. 165 (extortion).',
            },
            feedback: {
              uz: 'Aniq! Serverga kirish 278-2, shaxsiy ma’lumotlarni noqonuniy egallash 141-2, pul talab qilish esa 165-modda bilan baholanadi.',
              ru: 'Точно! Взлом сервера — 278-2, хищение ПДн — 141-2, требование денег — 165 УК.',
              en: 'Exact! Intrusion (278-2), PII theft (141-2), and ransom demand (165) form the complete qualification.',
            },
            nextStepId: 'l2',
          },
          {
            id: 'l1b',
            isOptimal: false,
            points: 10,
            label: {
              uz: 'Faqat JK 168-modda (firibgarlik), chunki pul so‘ralgan.',
              ru: 'Только ст. 168 УК (мошенничество), так как требуют деньги.',
              en: 'Only Art. 168 fraud since money is demanded.',
            },
            feedback: {
              uz: 'Xato! Aldash emas, shaxsiy ma’lumotlarni oshkor qilish tahdidi ostida talab qilish — tovlamachilik (165-m.), shuningdek kiber-hujum (278-2) ham mavjud.',
              ru: 'Ошибка! Требование под угрозой разглашения — это вымогательство (ст. 165), а также присутствуют ст. 278-2 и 141-2.',
              en: 'Incorrect! Demanding money under threat of leaking private data is extortion (Art. 165), alongside 278-2 and 141-2.',
            },
            nextStepId: 'l2',
          },
        ],
      },
      {
        id: 'l2',
        prompt: {
          uz: '2-bosqich: Serverda `deploy_admin` akkauntiga tashqaridan kirilgan va loglar tozalanishga urinilgan. Birinchi texnik harakat nima?',
          ru: 'Этап 2: Зафиксирован вход под `deploy_admin` и попытка зачистки логов. Первоочередное техническое действие?',
          en: 'Stage 2: Unauthorized login via `deploy_admin` and log truncation attempt detected. Primary technical action?',
        },
        choices: [
          {
            id: 'l2a',
            isOptimal: true,
            points: 50,
            label: {
              uz: 'Server diski va xotira (RAM) suratini (snapshot) saqlab olish, loglarni xesh bilan nusxalash, so‘ng barcha parol/SSH kalitlarni almashtirib ichki xodim/sobiq admin versiyasini ham tekshirish.',
              ru: 'Снять снапшот диска/памяти и копии логов с хешами до перезагрузки, затем сменить ключи SSH и проверить версию инсайдера.',
              en: 'Capture disk/RAM snapshot and hash-verified logs prior to reset, then rotate SSH keys and investigate insider involvement.',
            },
            feedback: {
              uz: 'Ajoyib! Avval o‘zgaruvchan dalilni (RFC 3227) saqlab qolish, keyin tizimni yopish va insayder versiyasini tekshirish eng to‘g‘ri yo‘l.',
              ru: 'Отлично! Сначала фиксация летучих доказательств (RFC 3227), затем закрытие уязвимости и проверка инсайдера.',
              en: 'Optimal! Follows RFC 3227 volatility preservation before remediation and insider attribution.',
            },
          },
          {
            id: 'l2b',
            isOptimal: false,
            points: 10,
            label: {
              uz: 'Serverni zudlik bilan formatlab qayta o‘rnatish, so‘ng ariza yozish.',
              ru: 'Немедленно отформатировать сервер и переустановить ОС.',
              en: 'Immediately wipe and reinstall the server OS before imaging.',
            },
            feedback: {
              uz: 'Formatlash barcha kriminalistik izlar (auth.log, bash_history, kirish IP) ni butunlay yo‘q qiladi.',
              ru: 'Форматирование полностью уничтожит критические следы вторжения.',
              en: 'Wiping the server destroys forensic logs, bash history, and attacker IP traces.',
            },
          },
        ],
      },
    ],
  },
];

export const MAP_INCIDENTS: MapIncident[] = [
  {
    id: 'map_1',
    title: {
      uz: 'APK-troyan tarqatish tuguni (O‘quv klasteri #A1)',
      ru: 'Узел распространения APK-трояна (Учебный кластер #A1)',
      en: 'APK Trojan Distribution Node (Training Cluster #A1)',
    },
    region: 'Toshkent / Markaziy Osiyo',
    country: 'Training Node — Tashkent',
    coords: [68.2, 34.5],
    threatType: 'apk',
    severity: 'critical',
    dataLabel: 'TRAINING_FICTIONAL',
    date: '2026-07-15',
    summary: {
      uz: 'O‘quv simulyatsiyasi: «Soliq xabarnomasi» niqobi ostida zararli APK tarqatish va Telegram bot orqali SMS-kodlarni ushlash.',
      ru: 'Учебная симуляция: распространение APK под видом налогового уведомления и перехват SMS через бот.',
      en: 'Training simulation: Fake tax-notice APK campaign intercepting OTP codes via Telegram bot API.',
    },
    iocs: ['com.uz.soliq.helper', '185.220.101.44 (sim)', 'bot781220:AAX_DEMO'],
    relatedArticleId: 'a169',
  },
  {
    id: 'map_2',
    title: {
      uz: 'SIM-box shlyuz klasteri (O‘quv epizodi #S2)',
      ru: 'Кластер SIM-бокс шлюза (Учебный эпизод #S2)',
      en: 'Illegal SIM-Box Gateway Cluster (Training #S2)',
    },
    region: 'Xorazm / G‘arbiy hudud',
    country: 'Training Node — Urgench',
    coords: [64.0, 34.2],
    threatType: 'simbox',
    severity: 'high',
    dataLabel: 'TRAINING_FICTIONAL',
    date: '2026-07-12',
    summary: {
      uz: 'O‘quv simulyatsiyasi: Xorijiy SIP qo‘ng‘iroqlarni «bank xodimi» niqobida mahalliy raqamga aylantiruvchi ko‘p SIMli uskunalar.',
      ru: 'Учебная симуляция: подмена международных SIP-звонков под местные номера для обзвона от имени банка.',
      en: 'Training simulation: Multi-SIM gateway terminating fraudulent foreign VoIP calls as local numbers.',
    },
    iocs: ['IMEI: 358910094412001 (sim)', 'SIP Gateway: 45.141.80.12'],
    relatedArticleId: 'a2787',
  },
  {
    id: 'map_3',
    title: {
      uz: '«Bir martalik yordam» fishing infratuzilmasi',
      ru: 'Фишинговая инфраструктура «Единовременная выплата»',
      en: 'Social-Aid Phishing Infrastructure',
    },
    region: 'Sharqiy Yevropa (VPS xosting)',
    country: 'Training Node — VPS Cluster',
    coords: [55.5, 25.0],
    threatType: 'phishing',
    severity: 'high',
    dataLabel: 'TRAINING_FICTIONAL',
    date: '2026-07-14',
    summary: {
      uz: 'O‘quv simulyatsiyasi: Karta rekvizitlari va CVV/SMS kodlarni yig‘uvchi klonlangan davlat portali sahifasi.',
      ru: 'Учебная симуляция: клон портала госуслуг, собирающий реквизиты банковских карт и SMS-коды.',
      en: 'Training simulation: Cloned government relief portal harvesting card credentials and OTP codes.',
    },
    iocs: ['uz-kompensatsiya-2026[.]xyz', 'ASN 204957'],
    relatedArticleId: 'a169',
  },
  {
    id: 'map_4',
    title: {
      uz: 'Noqonuniy P2P kripto-ayirboshlash va CEX tuguni',
      ru: 'Нелегальный P2P крипто-обмен и CEX-кластер',
      en: 'Unlicensed P2P Crypto Laundering Cluster',
    },
    region: 'BAA / Yaqin Sharq tranzit',
    country: 'Training Node — MENA Hub',
    coords: [59.8, 41.5],
    threatType: 'crypto',
    severity: 'high',
    dataLabel: 'TRAINING_FICTIONAL',
    date: '2026-07-10',
    summary: {
      uz: 'O‘quv simulyatsiyasi: O‘g‘irlangan mablag‘larni P2P uchburchak sxemasi orqali USDT (TRC-20) ga aylantirish.',
      ru: 'Учебная симуляция: конвертация похищенных средств через треугольную P2P-схему в USDT (TRC-20).',
      en: 'Training simulation: Triangular P2P fiat-to-USDT conversion chain routed toward overseas liquidity pools.',
    },
    iocs: ['TV7xK9pQ...m29L (sim)', 'BIN-44910'],
    relatedArticleId: 'a2788',
  },
  {
    id: 'map_5',
    title: {
      uz: 'Korporativ ma’lumotlar bazasi sizib chiqishi',
      ru: 'Утечка корпоративной базы персональных данных',
      en: 'Corporate PII Database Exfiltration',
    },
    region: 'G‘arbiy Yevropa (Proksi tugun)',
    country: 'Training Node — EU Relay',
    coords: [49.0, 27.0],
    threatType: 'leak',
    severity: 'critical',
    dataLabel: 'TRAINING_FICTIONAL',
    date: '2026-07-18',
    summary: {
      uz: 'O‘quv simulyatsiyasi: Zaif SSH paroli orqali mijozlar ma’lumotlarini ko‘chirib olish va tovlamachilik.',
      ru: 'Учебная симуляция: компрометация SSH-доступа, выгрузка клиентской базы и последующее вымогательство.',
      en: 'Training simulation: Weak SSH credential breach leading to PII database dump and extortion.',
    },
    iocs: ['91.214.124.88 (sim)', 'db_dump_2026.sql'],
    relatedArticleId: 'a1412',
  },
  {
    id: 'map_6',
    title: {
      uz: 'Tovlamachi-shifrlovchi (Ransomware) o‘quv namunasi',
      ru: 'Учебный инцидент программы-вымогателя (Ransomware)',
      en: 'Enterprise Ransomware Incident (Training)',
    },
    region: 'Shimoliy Amerika (C2 ko‘zgusi)',
    country: 'Training Node — US East',
    coords: [25.0, 32.0],
    threatType: 'ransomware',
    severity: 'critical',
    dataLabel: 'TRAINING_FICTIONAL',
    date: '2026-07-08',
    summary: {
      uz: 'O‘quv simulyatsiyasi: Korporativ tarmoqdagi fayl serverlarini shifrlab, kripto-to‘lov talab qilish.',
      ru: 'Учебная симуляция: шифрование корпоративных серверов с требованием выкупа в криптовалюте.',
      en: 'Training simulation: Lateral movement encrypting file shares with cryptocurrency ransom note.',
    },
    iocs: ['ransom_note_demo.txt', 'JK 278-2 / 278-4 / 165'],
    relatedArticleId: 'a2784',
  },
  {
    id: 'map_7',
    title: {
      uz: 'Soxta «chet elda ish» va avans firibgarligi tuguni',
      ru: 'Узел мошенничества «Трудоустройство за рубежом»',
      en: 'Fake Overseas Employment Scam Node',
    },
    region: 'Sharqiy Osiyo',
    country: 'Training Node — East Asia',
    coords: [81.0, 35.0],
    threatType: 'phishing',
    severity: 'medium',
    dataLabel: 'TRAINING_FICTIONAL',
    date: '2026-07-05',
    summary: {
      uz: 'O‘quv simulyatsiyasi: Soxta viza va shartnoma hujjatlari (PDF) bilan oldindan to‘lov undirish.',
      ru: 'Учебная симуляция: сбор предоплаты с использованием поддельных виз и трудовых договоров.',
      en: 'Training simulation: Advance-fee fraud distributing forged employment visas and PDF contracts.',
    },
    iocs: ['visa_offer_fake.pdf', 'JK 168 + 228'],
    relatedArticleId: 'a168',
  },
];

export const TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 'q1',
    difficulty: 'junior',
    category: 'qualification',
    question: {
      uz: 'Jabrlanuvchi Telegramdagi zararli APK faylni o‘rnatgach, uning roziligisiz kartadan pul yechib olingan. Qaysi JK moddasi asosiy hisoblanadi?',
      ru: 'После установки вредоносного APK деньги списаны со счёта без ведома и воли потерпевшего. Какая статья УК является основной?',
      en: 'After installing a malicious APK, funds were drained without the victim’s action or consent. Which article primarily applies?',
    },
    options: {
      uz: ['JK 168-modda (Firibgarlik)', 'JK 169-modda (O‘g‘rilik)', 'JK 140-modda (Haqorat)', 'JK 244-6-modda'],
      ru: ['Ст. 168 УК (Мошенничество)', 'Ст. 169 УК (Кража)', 'Ст. 140 УК (Оскорбление)', 'Ст. 244-6 УК'],
      en: ['Art. 168 (Fraud)', 'Art. 169 (Theft)', 'Art. 140 (Insult)', 'Art. 244-6'],
    },
    correctIndex: 1,
    explanation: {
      uz: 'Pul jabrlanuvchi ixtiyorisiz yashirin ravishda (APK/SMS-kod ushlash orqali) yechib olingani uchun JK 169-modda (O‘g‘rilik) qo‘llanadi.',
      ru: 'Поскольку средства похищены тайно и без воли потерпевшего (через APK), применяется ст. 169 УК (Кража).',
      en: 'Because funds were taken covertly without the victim initiating the transfer, Theft (Art. 169) applies.',
    },
  },
  {
    id: 'q2',
    difficulty: 'junior',
    category: 'qualification',
    question: {
      uz: 'Jabrlanuvchi «soxta treyder» va’dasiga ishonib, o‘z qo‘li bilan boshqa kartaga pul o‘tkazib bergan bo‘lsa, qanday kvalifikatsiya qilinadi?',
      ru: 'Потерпевший поверил «лжетрейдеру» и сам перевёл деньги на указанную карту. Как квалифицируется деяние?',
      en: 'A victim believed a fake trader and manually transferred money to the provided card. How is this qualified?',
    },
    options: {
      uz: ['JK 168-modda (Firibgarlik)', 'JK 169-modda (O‘g‘rilik)', 'JK 278-7-modda', 'JK 273-modda'],
      ru: ['Ст. 168 УК (Мошенничество)', 'Ст. 169 УК (Кража)', 'Ст. 278-7 УК', 'Ст. 273 УК'],
      en: ['Art. 168 (Fraud)', 'Art. 169 (Theft)', 'Art. 278-7', 'Art. 273'],
    },
    correctIndex: 0,
    explanation: {
      uz: 'Jabrlanuvchi aldash ta’sirida pulni o‘z ixtiyori bilan o‘tkazgan — bu JK 168-modda (Firibgarlik).',
      ru: 'Потерпевший под воздействием обмана сам передал средства — это ст. 168 УК (Мошенничество).',
      en: 'Deception causing the victim to voluntarily transfer funds constitutes Fraud (Art. 168).',
    },
  },
  {
    id: 'q3',
    difficulty: 'junior',
    category: 'forensics',
    question: {
      uz: 'Zararli APK o‘rnatilgan telefonni ko‘zdan kechirishdan oldin eng birinchi nima qilish shart?',
      ru: 'Что необходимо сделать в первую очередь с телефоном, на который установлен вредоносный APK?',
      en: 'What is the mandatory first action on a phone infected with a malicious APK?',
    },
    options: {
      uz: [
        'APKni darhol o‘chirib tashlash',
        'Telefonni tarmoqdan ajratish (samolyot rejimi / Faraday qopi), o‘chirmaslik',
        'Zavod sozlamalariga qaytarish',
        'Telegram akkauntni o‘chirish',
      ],
      ru: [
        'Сразу удалить APK',
        'Изолировать от сети (авиарежим / экран), не выключать и не очищать',
        'Сбросить до заводских настроек',
        'Удалить аккаунт Telegram',
      ],
      en: [
        'Uninstall the APK immediately',
        'Isolate from network (airplane mode / Faraday bag), do not power off or wipe',
        'Factory reset the device',
        'Delete the Telegram account',
      ],
    },
    correctIndex: 1,
    explanation: {
      uz: 'Tarmoqdan ajratilmasa jinoyatchi APKni yoki chatlarni masofadan tozalab yuborishi mumkin.',
      ru: 'Без изоляции от сети злоумышленник может удалённо очистить переписку и следы.',
      en: 'Without network isolation, attackers can trigger remote wipe commands to destroy evidence.',
    },
  },
  {
    id: 'q4',
    difficulty: 'junior',
    category: 'forensics',
    question: {
      uz: 'Faylning yaxlitligi va o‘zgarmaganligini isbotlash uchun bayonnomaga nima qayd etiladi?',
      ru: 'Что фиксируется в протоколе для подтверждения неизменности и целостности цифрового файла?',
      en: 'What cryptographic value is recorded in an inspection protocol to prove file integrity?',
    },
    options: {
      uz: ['Fayl nomi', 'SHA-256 xesh qiymati', 'Ekran yorqinligi', 'Batareya foizi'],
      ru: ['Только имя файла', 'Хеш-значение (например, SHA-256)', 'Яркость экрана', 'Заряд батареи'],
      en: ['Filename only', 'SHA-256 hash value', 'Screen brightness', 'Battery percentage'],
    },
    correctIndex: 1,
    explanation: {
      uz: 'SHA-256 xesh qiymati fayldagi hatto 1 bayt o‘zgarishni ham aniqlaydi va dalil yaxlitligini tasdiqlaydi.',
      ru: 'Хеш SHA-256 меняется при изменении хотя бы одного бита, гарантируя целостность улики.',
      en: 'A SHA-256 hash verifies bit-level integrity throughout custody and court review.',
    },
  },
  {
    id: 'q5',
    difficulty: 'junior',
    category: 'osint',
    question: {
      uz: 'Telegramdagi akkauntni u nikneymini (username) o‘zgartirganidan keyin ham aniq tanib olish uchun nimani qayd etish kerak?',
      ru: 'Что нужно зафиксировать в профиле Telegram, чтобы не потерять аккаунт после смены username?',
      en: 'Which Telegram identifier must be recorded because usernames can be changed at any time?',
    },
    options: {
      uz: ['Profil rasm rangi', 'Raqamli User ID', 'Bio matni', 'Oxirgi kirgan soati'],
      ru: ['Цвет аватара', 'Числовой User ID', 'Текст в разделе «О себе»', 'Статус «был недавно»'],
      en: ['Avatar color', 'Numeric User ID', 'Bio text', 'Last-seen timestamp'],
    },
    correctIndex: 1,
    explanation: {
      uz: 'Username bir zumda o‘zgaradi, lekin raqamli User ID doimo o‘zgarishsiz qoladi.',
      ru: 'Username можно изменить за секунду, а числовой User ID постоянен.',
      en: 'Usernames are mutable, whereas the numeric Telegram User ID is permanent.',
    },
  },
  {
    id: 'q6',
    difficulty: 'middle',
    category: 'law',
    question: {
      uz: 'Raqamli dalilni ko‘zdan kechirishda JPKning qaysi moddasiga asosan mutaxassis ishtiroki ta’minlanadi?',
      ru: 'Участие специалиста при осмотре цифровых доказательств обеспечивается в соответствии с какой статьёй УПК?',
      en: 'Under which article of the CPC is a technical specialist involved during digital evidence inspection?',
    },
    options: {
      uz: ['JPK 70-modda', 'JPK 10-modda', 'JK 28-modda', 'Fuqarolik kodeksi 15-m.'],
      ru: ['Ст. 70 УПК', 'Ст. 10 УПК', 'Ст. 28 УК', 'Ст. 15 ГК'],
      en: ['Art. 70 CPC', 'Art. 10 CPC', 'Art. 28 CC', 'Art. 15 Civil Code'],
    },
    correctIndex: 0,
    explanation: {
      uz: 'JPK 70-modda (mutaxassis) va JPK 140-modda (ko‘zdan kechirish) asosida texnik mutaxassis ishtirok etadi.',
      ru: 'Участие специалиста регулируется ст. 70 УПК (в сочетании со ст. 140 УПК при осмотре).',
      en: 'CPC Art. 70 governs specialist participation during inspections under Art. 140.',
    },
  },
  {
    id: 'q7',
    difficulty: 'middle',
    category: 'qualification',
    question: {
      uz: 'Bitta SIM-box uskunasi orqali xorijiy qo‘ng‘iroqlar mahalliy raqamga aylantirilib «bank xodimi» sifatida qo‘ng‘iroq qilingan. Infrastrukturaviy modda qaysi?',
      ru: 'Через SIM-бокс международные звонки мошенников пропускаются как местные. Какая статья УК охватывает это оборудование?',
      en: 'A SIM-box routes foreign scam calls as local numbers. Which Criminal Code article covers illegal telecom gateways?',
    },
    options: {
      uz: ['JK 278-7-modda', 'JK 278-9-modda', 'JK 139-modda', 'JK 188-1-modda'],
      ru: ['Ст. 278-7 УК', 'Ст. 278-9 УК', 'Ст. 139 УК', 'Ст. 188-1 УК'],
      en: ['Art. 278-7 CC', 'Art. 278-9 CC', 'Art. 139 CC', 'Art. 188-1 CC'],
    },
    correctIndex: 0,
    explanation: {
      uz: 'JK 278-7-modda telekommunikatsiya tarmog‘idan qonunga xilof ravishda foydalanish (SIM-box, SIP) uchun javobgarlikni belgilaydi.',
      ru: 'Ст. 278-7 УК предусматривает ответственность за незаконное использование сетей телекоммуникаций (SIM-бокс).',
      en: 'Art. 278-7 criminalizes illegal telecommunication gateways such as SIM-boxes and unauthorized SIP trunks.',
    },
  },
  {
    id: 'q8',
    difficulty: 'middle',
    category: 'forensics',
    question: {
      uz: 'RFC 3227 standartiga ko‘ra «Order of Volatility» (o‘zgaruvchanlik tartibi) bo‘yicha qaysi ma’lumot eng birinchi olinishi kerak?',
      ru: 'Согласно RFC 3227 (Order of Volatility), какие данные должны собираться в самую первую очередь?',
      en: 'Per RFC 3227 (Order of Volatility), which data source must be acquired first?',
    },
    options: {
      uz: ['Arxiv DVD disklari', 'Operativ xotira (RAM) va faol tarmoq ulanishlari', 'Qog‘oz shartnomalar', 'Printer tarixi'],
      ru: ['Резервные архивы', 'Оперативная память (RAM) и активные сетевые соединения', 'Бумажные договоры', 'Очередь принтера'],
      en: ['Offline backup media', 'RAM (volatile memory) and active network state', 'Printed contracts', 'Archived HDDs'],
    },
    correctIndex: 1,
    explanation: {
      uz: 'Operativ xotira (RAM) va faol tarmoq ulanishlari qurilma o‘chirilsa bir zumda yo‘qoladi, shuning uchun birinchi olinadi.',
      ru: 'RAM и активные сетевые сессии теряются при выключении питания, поэтому фиксируются в первую очередь.',
      en: 'RAM and active network connections vanish upon power-off and have highest volatility.',
    },
  },
  {
    id: 'q9',
    difficulty: 'middle',
    category: 'osint',
    question: {
      uz: 'P2P kripto-ayirboshlashning «uch tomonlama» (triangular) sxemasida kim aslida halol ishtirokchi bo‘lishi mumkin?',
      ru: 'В «треугольной» P2P-схеме кто часто оказывается добросовестным участником, чью карту подставил мошенник?',
      en: 'In a triangular P2P scam, who is often an unwitting legitimate party whose card is abused?',
    },
    options: {
      uz: ['Telegram kanal administratori', 'USDT sotgan P2P-sotuvchi', 'Zararli APK muallifi', 'Drop-ferma tashkilotchisi'],
      ru: ['Администратор мошеннического канала', 'P2P-продавец криптовалюты, получивший перевод по ордеру', 'Автор вредоносного APK', 'Организатор дроп-фермы'],
      en: ['Scam channel admin', 'The P2P crypto seller who released USDT against the incoming fiat order', 'Malware developer', 'Drop-farm operator'],
    },
    correctIndex: 1,
    explanation: {
      uz: 'P2P sotuvchi birjadagi haqiqiy order bo‘yicha pul qabul qilib kriptovalyutani firibgar hamyoniga yuborgan bo‘lishi mumkin — shuning uchun uni avval guvoh sifatida so‘roq qilish zarur.',
      ru: 'Продавец исполняет реальный ордер и отправляет USDT на кошелёк злоумышленника — поэтому сначала он допрашивается как свидетель.',
      en: 'The seller fulfills a genuine exchange order and sends USDT to the scammer wallet, so they should be questioned as a witness first.',
    },
  },
  {
    id: 'q10',
    difficulty: 'senior',
    category: 'forensics',
    question: {
      uz: 'Bir nechta viloyatdagi yuzlab APK-o‘g‘rilik ishlarini bitta tashkilotchiga bog‘lash uchun ekspertizaga qaysi ikki obyekt qiyoslashga yuboriladi?',
      ru: 'Какие два объекта сопоставляются на компьютерно-технической экспертизе для объединения сотен эпизодов APK-краж с подозреваемым?',
      en: 'Which two artifacts are compared in forensic examination to tie hundreds of APK theft cases to a suspect?',
    },
    options: {
      uz: [
        'Telefon g‘ilofi va SIM-karta rangi',
        'Jabrlanuvchilardagi APK namunalari va gumonlanuvchi kompyuteridagi manba kodi / imzo kaliti (.keystore)',
        'Wi-Fi router nomi va telefon modeli',
        'Bank logotipi va ekran fon rasmi',
      ],
      ru: [
        'Цвет чехла и модель телефона',
        'Образцы APK от потерпевших и исходный код / ключ подписи (.keystore) с ПК подозреваемого',
        'Имя Wi-Fi сети',
        'Обои рабочего стола',
      ],
      en: [
        'Phone case and SIM color',
        'Victim APK samples vs source code and `.keystore` signing certificate on the suspect PC',
        'Wi-Fi SSID',
        'Desktop wallpaper',
      ],
    },
    correctIndex: 1,
    explanation: {
      uz: 'APK imzo sertifikati va kompilyatsiya manba kodi kriptografik aniqlik bilan barcha klaster ishlarini bitta muallifga bog‘laydi.',
      ru: 'Ключ подписи (.keystore) и исходный код позволяют однозначно связать весь кластер вредоносных приложений.',
      en: 'Keystore public keys and source structure cryptographically tie an entire malware cluster to its builder.',
    },
  },
  {
    id: 'q11',
    difficulty: 'senior',
    category: 'law',
    question: {
      uz: 'Dastlabki tergov amaliyotida shaxsga doir elektron ma’lumotlarni tintuv va olib qo‘yish uchun kimning sanksiyasi/ruxsati talab etiladi?',
      ru: 'Чьё разрешение (санкция) необходимо для проведения обыска и выемки цифровых носителей с персональной информацией?',
      en: 'Whose judicial authorization is required for search and seizure of devices containing personal data?',
    },
    options: {
      uz: ['Bank operatori', 'Tergov sudyasi (JPK 158-1–158-3)', 'Mobil ilova dasturchisi', 'Mahalla raisi'],
      ru: ['Оператор банка', 'Следственный судья (ст. 158-1–158-3 УПК)', 'Разработчик приложения', 'Администратор чата'],
      en: ['Bank teller', 'Investigative judge (CPC Art. 158-1–158-3)', 'App developer', 'Group admin'],
    },
    correctIndex: 1,
    explanation: {
      uz: 'Tergov sudyasi ruxsatisiz olingan tintuv/olib qo‘yish materiallari sudda nomaqbul dalil deb topilishi mumkin.',
      ru: 'Без санкции следственного судьи результаты обыска и выемки могут быть признаны недопустимыми.',
      en: 'Evidence seized without an investigative judge warrant risks exclusion as inadmissible.',
    },
  },
  {
    id: 'q12',
    difficulty: 'senior',
    category: 'osint',
    question: {
      uz: 'Fishing veb-sayti ostidagi barcha yashirin subdomenlarni va avvalgi SSL sertifikatlarini qonuniy ochiq manbadan qanday ko‘rish mumkin?',
      ru: 'Какой легальный публичный реестр позволяет увидеть все поддомены фишингового домена по выпущенным SSL-сертификатам?',
      en: 'Which public registry exposes subdomains of a phishing domain via issued SSL certificates?',
    },
    options: {
      uz: ['Certificate Transparency Logs (masalan, crt.sh)', 'Antivirus o‘chirish', 'Parolni buzish', 'DDoS yuborish'],
      ru: ['Журналы Certificate Transparency (например, crt.sh)', 'Отключение антивируса', 'Перебор паролей', 'DDoS-сканирование'],
      en: ['Certificate Transparency Logs (e.g., crt.sh)', 'Disabling antivirus', 'Brute forcing', 'DDoS probing'],
    },
    correctIndex: 0,
    explanation: {
      uz: 'Certificate Transparency (crt.sh) — to‘liq ochiq va qonuniy manba bo‘lib, domen uchun berilgan barcha sertifikatlarni ko‘rsatadi.',
      ru: 'Certificate Transparency (crt.sh) — открытый стандартный реестр всех публично выпущенных TLS-сертификатов.',
      en: 'Certificate Transparency logs (`crt.sh`) are public registries listing all issued TLS certificates for a domain.',
    },
  },
];

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: 'u_1',
    name: 'A. Karimov',
    email: 'a.karimov@cyberlab.uz',
    role: 'admin',
    status: 'active',
    lastActive: '2026-07-20 09:42',
  },
  {
    id: 'u_2',
    name: 'M. Tursunova',
    email: 'm.tursunova@cyberlab.uz',
    role: 'instructor',
    status: 'active',
    lastActive: '2026-07-20 08:15',
  },
  {
    id: 'u_3',
    name: 'D. Rakhimov',
    email: 'd.rakhimov@cyberlab.uz',
    role: 'investigator',
    status: 'active',
    lastActive: '2026-07-19 17:30',
  },
  {
    id: 'u_4',
    name: 'S. Alimov',
    email: 's.alimov@academy.uz',
    role: 'student',
    status: 'active',
    lastActive: '2026-07-19 14:20',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminUser['role'], RolePermissions> = {
  admin: {
    manage_content: true,
    create_tests: true,
    manage_users: true,
    export_reports: true,
    use_ai: true,
  },
  instructor: {
    manage_content: true,
    create_tests: true,
    manage_users: false,
    export_reports: true,
    use_ai: true,
  },
  investigator: {
    manage_content: false,
    create_tests: false,
    manage_users: false,
    export_reports: true,
    use_ai: true,
  },
  student: {
    manage_content: false,
    create_tests: false,
    manage_users: false,
    export_reports: true,
    use_ai: true,
  },
};
