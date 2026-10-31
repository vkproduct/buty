/**
 * Mixpanel (клиентская аналитика).
 *
 * Инициализируется ТОЛЬКО после согласия на аналитические cookie
 * (consent "all", тот же механизм, что у Яндекс Метрики — lib/analytics/consent.ts).
 * Пустой NEXT_PUBLIC_MIXPANEL_TOKEN полностью выключает трекинг.
 *
 * События: snake_case, имена — объект_действие (например, composition_analyzed).
 * Свойства числами отправлять без кавычек, строки — в нижнем регистре.
 */

import mixpanel from "mixpanel-browser";

export const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? "";
/** Для проекта Mixpanel с хранением в ЕС: "https://api-eu.mixpanel.com". Пусто — США (по умолчанию). */
const MIXPANEL_API_HOST = process.env.NEXT_PUBLIC_MIXPANEL_API_HOST ?? "";
/** Доля сессий с Session Replay, % (0 — выключено). Запись стартует только после init, т.е. после согласия. */
const REPLAY_PERCENT = Number(process.env.NEXT_PUBLIC_MIXPANEL_REPLAY_PERCENT ?? "20") || 0;

let initialized = false;

/** Инициализация SDK — вызывать один раз после согласия пользователя. */
export function initMixpanel(): void {
  if (!MIXPANEL_TOKEN || typeof window === "undefined") return;
  if (initialized) {
    // Согласие дали повторно после отзыва — снова включаем отправку
    if (mixpanel.has_opted_out_tracking()) mixpanel.opt_in_tracking();
    return;
  }
  mixpanel.init(MIXPANEL_TOKEN, {
    ...(MIXPANEL_API_HOST ? { api_host: MIXPANEL_API_HOST } : {}),
    autocapture: false,
    // Session Replay: работает независимо от autocapture, но требует явной опции.
    record_sessions_percent: REPLAY_PERCENT,
    // В реплеях по умолчанию весь текст и инпуты замаскированы (privacy-first).
    track_pageview: false,
    persistence: "localStorage",
    // ip: false — гео по IP отключено, минимизация PII
    ip: false,
  });
  mixpanel.register({ platform: "web" });
  initialized = true;
  // Если раньше пользователь отзывал согласие, opt-out сохранён в браузере — снимаем его
  if (mixpanel.has_opted_out_tracking()) mixpanel.opt_in_tracking();
}

/** Согласие отозвано («Только необходимые»): прекращаем отправку и стираем данные Mixpanel в браузере. */
export function disableMixpanel(): void {
  if (!initialized || typeof window === "undefined") return;
  mixpanel.opt_out_tracking();
}

/** Трекинг события; до инициализации или без токена — тихо ничего не делает. */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  if (!initialized || typeof window === "undefined") return;
  mixpanel.track(name, properties);
}

/** Привязка событий к залогиненному пользователю (Simplified ID Merge). */
export function identifyUser(userId: string): void {
  if (!initialized || typeof window === "undefined") return;
  mixpanel.identify(userId);
}

/** Обновление свойств профиля (только для идентифицированных пользователей). */
export function setUserProfile(properties: Record<string, string | number | boolean>): void {
  if (!initialized || typeof window === "undefined") return;
  mixpanel.people.set(properties);
}

/** Выход из аккаунта: новый анонимный профиль. */
export function resetUser(): void {
  if (!initialized || typeof window === "undefined") return;
  mixpanel.reset();
}

/** Пути, где Session Replay не пишется: данные о здоровье и кабинеты (152-ФЗ). */
const REPLAY_SENSITIVE_PREFIXES = ["/shelf", "/profile", "/onboarding", "/brand", "/admin"];

/** Нужно ли глушить запись на этом пути (полка, анкета кожи, профиль, бренд, админка). */
export function isReplaySensitivePath(pathname: string): boolean {
  return REPLAY_SENSITIVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Пауза Session Replay (чувствительная страница). Без init — ничего не делает. */
export function stopSessionRecording(): void {
  if (!initialized || typeof window === "undefined") return;
  mixpanel.stop_session_recording();
}

/** Возобновление записи на обычных страницах (старт реально идёт, если сессия в выборке). */
export function startSessionRecording(): void {
  if (!initialized || typeof window === "undefined") return;
  mixpanel.start_session_recording();
}

/**
 * Сброс, если в браузере остался id прошлого пользователя, а сессии уже нет.
 * Нужен потому, что выход (signOut) перезагружает страницу и трекер не видит
 * перехода «был пользователь → нет пользователя».
 */
export function resetIfIdentified(): void {
  if (!initialized || typeof window === "undefined") return;
  if (mixpanel.get_property("$user_id")) mixpanel.reset();
}
