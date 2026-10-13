/**
 * Google tag (gtag.js / GA4).
 *
 * Инициализируется ТОЛЬКО после согласия на аналитические cookie
 * (consent "all", тот же механизм, что у Яндекс Метрики и Mixpanel — lib/analytics/consent.ts).
 * Боевой счётчик включён в production-сборке (кроме превью Vercel);
 * NEXT_PUBLIC_GA_ID переопределяет ID, пустое значение выключает трекинг.
 */

const DEFAULT_GA_ID = "G-BDBSNMGYRS";

const isProdBuild =
  process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? (isProdBuild ? DEFAULT_GA_ID : "");

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let initialized = false;

/** Очередь dataLayer + асинхронная загрузка gtag.js + config. Вызывать один раз после согласия. */
export function initGtag(): void {
  if (!GA_ID || typeof window === "undefined") return;
  if (initialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // send_page_view: false — хиты отправляем вручную из компонента
  // (App Router: клиентская навигация не перезагружает страницу).
  window.gtag("config", GA_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  initialized = true;
}

/** Хит просмотра страницы (первая загрузка + клиентская навигация App Router). */
export function trackPageView(): void {
  if (!initialized || typeof window === "undefined") return;
  window.gtag?.("event", "page_view", {
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Согласие отозвано («Только необходимые»): по Consent Mode прекращаем запись аналитики и cookie. */
export function disableGtag(): void {
  if (!initialized || typeof window === "undefined") return;
  window.gtag?.("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
}

/**
 * Трекинг события GA4; до инициализации или без ID — тихо ничего не делает.
 * Имена — snake_case; рекомендуемые события GA4 (sign_up, begin_checkout, generate_lead)
 * при необходимости отметить как ключевые (conversions) в интерфейсе GA4.
 */
export function gaEvent(name: string, params?: Record<string, unknown>): void {
  if (!initialized || typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}
