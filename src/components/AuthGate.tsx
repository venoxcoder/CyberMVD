import React, { useState } from 'react';
import { AlertCircle, KeyRound, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Lang, ThemeMode } from '../types';
import { AmbientCyberBackground } from './AmbientCyberBackground';

interface AuthGateProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  lang,
  onLangChange,
  theme,
  onThemeChange,
}) => {
  const {
    bootstrapClaimed,
    requiresBootPasscode,
    backendAvailable,
    authLoading,
    enterStaticDemo,
    login,
    setupAdmin,
    registerObserver,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'observer'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('ADM-001');
  const [bootPasscode, setBootPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    uz: {
      org: 'IDORAVIY KIBERXAVFSIZLIK VA RAQAMLI KRIMINALISTIKA MARKAZI',
      setupTitle: 'Birinchi administrator hisobini sozlash',
      setupDesc:
        'Birinchi ishga tushirishda tizim xavfsizligi uchun bosh administrator hisobini yarating. Parol serverda scrypt bilan xeshlanadi.',
      loginTitle: 'Tizimga kirish (RBAC avtorizatsiya)',
      loginDesc:
        'Kiberjinoyatlar tergovi, dalillar reyestri va tahlil modullariga kirish uchun xizmat hisobingiz bilan kiring.',
      observerTitle: 'Kuzatuvchi (Observer) ro‘yxatdan o‘tishi',
      observerDesc:
        'Yangi mustaqil hisob faqat minimal huquqli Kuzatuvchi (faol o‘quv ishlari) maqomida yaratiladi.',
      name: 'F.I.Sh. / Mas’ul xodim',
      email: 'Xizmat elektron pochtasi',
      password: 'Parol (kamida 8 belgi)',
      badge: 'Xizmat guvohnomasi / ID',
      bootCode: 'Boshlang‘ich sozlash kodi (ADMIN_BOOT_PASSCODE)',
      btnSetup: 'Administratorni faollashtirish',
      btnLogin: 'Kirish',
      btnRegister: 'Kuzatuvchi sifatida yaratish',
      tabLogin: 'Kirish',
      tabObserver: 'Kuzatuvchi yaratish',
      securityNote: 'Sessiya tokeni faqat faol xotirada saqlanadi (localStorage ishlatilmaydi). Barcha amallar audit jurnaliga yoziladi.',
    },
    ru: {
      org: 'ВЕДОМСТВЕННЫЙ ЦЕНТР КИБЕРБЕЗОПАСНОСТИ И ЦИФРОВОЙ КРИМИНАЛИСТИКИ',
      setupTitle: 'Первичная инициализация администратора',
      setupDesc:
        'При первом запуске создайте учётную запись главного администратора системы. Пароль хешируется на сервере через scrypt.',
      loginTitle: 'Ведомственная авторизация (RBAC)',
      loginDesc:
        'Выполните вход для доступа к аналитическому центру, досье инцидентов, реестру доказательств и модулям лаборатории.',
      observerTitle: 'Регистрация наблюдателя (минимальные права)',
      observerDesc:
        'Самостоятельная регистрация создаёт учётную запись с ролью «Наблюдатель» (чтение учебных дел, без доступа к рабочим материалам).',
      name: 'ФИО сотрудника',
      email: 'Служебный email',
      password: 'Пароль (не менее 8 символов)',
      badge: 'Табельный / служебный номер',
      bootCode: 'Код первичной инициализации (ADMIN_BOOT_PASSCODE)',
      btnSetup: 'Создать администратора и войти',
      btnLogin: 'Войти в систему',
      btnRegister: 'Зарегистрироваться как наблюдатель',
      tabLogin: 'Вход',
      tabObserver: 'Регистрация наблюдателя',
      securityNote: 'Токен сессии хранится строго в памяти приложения. Все операции входа и отказы доступа фиксируются в журнале аудита.',
    },
    en: {
      org: 'DEPARTMENTAL CYBERSECURITY & DIGITAL FORENSICS CENTER',
      setupTitle: 'Claim Initial Administrator Account',
      setupDesc:
        'On first launch, establish the primary administrator account. Credentials are hashed server-side via scrypt.',
      loginTitle: 'Institutional Sign-In (RBAC)',
      loginDesc:
        'Authenticate to access the analytical center, case dossiers, digital evidence registry, and intelligence modules.',
      observerTitle: 'Least-Privilege Observer Registration',
      observerDesc:
        'Self-registration strictly assigns the Observer role (read-only access to training cases, isolated from departmental dossiers).',
      name: 'Full Name',
      email: 'Institutional Email',
      password: 'Password (minimum 8 characters)',
      badge: 'Badge / Staff ID',
      bootCode: 'Bootstrap Passcode (ADMIN_BOOT_PASSCODE)',
      btnSetup: 'Initialize Administrator',
      btnLogin: 'Sign In',
      btnRegister: 'Register as Observer',
      tabLogin: 'Sign In',
      tabObserver: 'Observer Sign Up',
      securityNote: 'Session tokens reside strictly in JS memory. Every authentication event and access check is recorded in the audit log.',
    },
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!bootstrapClaimed) {
        await setupAdmin({ name, email, password, badgeNumber, bootPasscode });
      } else if (mode === 'observer') {
        await registerObserver({ name, email, password });
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || bootstrapClaimed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
        <div className="w-full max-w-md space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <div className="skeleton-block h-5 w-48" />
          <div className="skeleton-block h-10 w-full" />
          <div className="skeleton-block h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[var(--bg)] text-[var(--text)]">
      <AmbientCyberBackground />
      <div className="relative z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--sidebar-bg)]/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="./assets/aistudio/logo_e89a7120.svg"
            alt="KIBERJINOYATLAR"
            className="h-7 w-7 object-contain"
          />
          <div>
            <div className="text-xs font-extrabold tracking-wider text-[var(--text)]">
              KIBERJINOYATLAR
            </div>
            <div className="text-[10px] font-semibold tracking-wider text-[var(--accent)]">
              {copy.org}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => onLangChange(e.target.value as Lang)}
            className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold"
          >
            <option value="uz">O‘zbek</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <select
            aria-label="Theme"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
            className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold"
          >
            <option value="dark">{lang === 'ru' ? 'Тёмная' : lang === 'en' ? 'Dark' : 'Tungi'}</option>
            <option value="light">{lang === 'ru' ? 'Светлая' : lang === 'en' ? 'Light' : 'Kunduzgi'}</option>
          </select>
        </div>
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)]/95 p-6 shadow-2xl backdrop-blur-md sm:p-7">
          {!bootstrapClaimed ? (
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <KeyRound className="h-4.5 w-4.5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--text)]">{copy.setupTitle}</h1>
                <p className="mt-1 text-xs leading-relaxed text-[var(--secondary-text)]">
                  {copy.setupDesc}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex border-b border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 border-b-2 pb-2.5 text-xs font-bold transition-colors ${
                    mode === 'login'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {copy.tabLogin}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('observer');
                    setError(null);
                  }}
                  className={`flex-1 border-b-2 pb-2.5 text-xs font-bold transition-colors ${
                    mode === 'observer'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {copy.tabObserver}
                </button>
              </div>

              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  {mode === 'login' ? (
                    <Lock className="h-4.5 w-4.5" />
                  ) : (
                    <UserPlus className="h-4.5 w-4.5" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[var(--text)]">
                    {mode === 'login' ? copy.loginTitle : copy.observerTitle}
                  </h1>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--secondary-text)]">
                    {mode === 'login' ? copy.loginDesc : copy.observerDesc}
                  </p>
                </div>
              </div>
            </>
          )}

          {!backendAvailable && (
            <div className="mb-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-3.5 text-xs">
              <div className="font-bold text-[var(--accent)]">
                {lang === 'ru'
                  ? 'Автономный статический режим (GitHub Pages)'
                  : lang === 'en'
                    ? 'Standalone Static Mode (GitHub Pages)'
                    : 'Avtonom statik rejim (GitHub Pages)'}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--secondary-text)]">
                {lang === 'ru'
                  ? 'Сервер Node.js не подключён (данные сохраняются локально в браузере; серверный ИИ доступен при запуске Node-сервера).'
                  : lang === 'en'
                    ? 'No Node.js backend detected (case & evidence data runs locally in browser storage; server Gemini AI requires Node host).'
                    : 'Node.js serveri ulanmagan (ishlar brauzerda saqlanadi; Gemini AI uchun Node server kerak).'}
              </p>
              <button
                type="button"
                onClick={() => void enterStaticDemo()}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {lang === 'ru'
                    ? 'Войти в платформу (демо-доступ)'
                    : lang === 'en'
                      ? 'Enter Platform (Offline Mode)'
                      : 'Platformaga kirish (Avtonom rejim)'}
                </span>
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2.5 text-xs text-[var(--red)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {(!bootstrapClaimed || mode === 'observer') && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--secondary-text)]">
                  {copy.name}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[var(--secondary-text)]">
                {copy.email}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@center.local"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[var(--secondary-text)]">
                {copy.password}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            {!bootstrapClaimed && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--secondary-text)]">
                  {copy.badge}
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            )}

            {!bootstrapClaimed && requiresBootPasscode && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--secondary-text)]">
                  {copy.bootCode}
                </label>
                <input
                  type="password"
                  required
                  value={bootPasscode}
                  onChange={(e) => setBootPasscode(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {!bootstrapClaimed
                  ? copy.btnSetup
                  : mode === 'observer'
                    ? copy.btnRegister
                    : copy.btnLogin}
              </span>
            </button>
          </form>

          <div className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
            {copy.securityNote}
          </div>
        </div>
      </main>
    </div>
  );
};
