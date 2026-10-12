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

/**
 * Сброс, если в браузере остался id прошлого пользователя, а сессии уже нет.
 * Нужен потому, что выход (signOut) перезагружает страницу и трекер не видит
 * перехода «был пользователь → нет пользователя».
 */
export function resetIfIdentified(): void {
  if (!initialized || typeof window === "undefined") return;
  if (mixpanel.get_property("$user_id")) mixpanel.reset();
}
