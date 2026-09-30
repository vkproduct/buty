/**
 * Согласие на аналитические cookie (Яндекс Метрика).
 * Необходимые cookie (сессия входа) работают всегда; Метрика — только после «Принять».
 */

export type Consent = "all" | "necessary";

const KEY = "buty_cookie_consent";
export const CONSENT_EVENT = "buty:consent";
/** Событие «открыть настройки cookie» — баннер показывается снова. */
export const CONSENT_OPEN_EVENT = "buty:consent-open";

export function readConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "all" || v === "necessary") return v;
  } catch {
    // хранилище недоступно (приватный режим) — считаем, что выбора нет
  }
  const m = document.cookie.match(/(?:^|; )buty_cookie_consent=(all|necessary)/);
  return m ? (m[1] as Consent) : null;
}

export function saveConsent(value: Consent): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // запасной вариант — cookie ниже
  }
  document.cookie = `${KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
