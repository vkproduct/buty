/**
 * Базовые SEO-константы и хелперы микроразметки (schema.org).
 * Домен берётся из NEXT_PUBLIC_SITE_URL — при переезде (например, на buty.ru)
 * достаточно сменить переменную окружения.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://buty.app").replace(/\/+$/, "");
export const SITE_NAME = "Buty.app";

/** Абсолютный URL для микроразметки и sitemap. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface Crumb {
  name: string;
  path: string;
}

/** BreadcrumbList: «Главная» добавляется автоматически. */
export function breadcrumbJsonLd(items: Crumb[]) {
  const all = [{ name: "Главная", path: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

/** FAQPage: вопросы-ответы в том же виде, что видит пользователь. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Обрезка description до лимита сниппета без обрыва слова. */
export function clampDescription(text: string, max = 170): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:—–-]+$/, "")}…`;
}

/** Первая буква строчная — для вставки функции ингредиента внутрь предложения. */
export function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

const KEEP_UPPER = /^(PEG|PPG|SLES|SLS|SCI|PCA|EDTA|DMDM|UV|SPF|CI|HCL|BHA|AHA|PHA|LHA|MAP|HPR|NMF|DNA|NAD|II|III|IV|NP|AP|EOP|NG|NS|EOS)$/;

/**
 * INCI в привычном виде для заголовков: «SODIUM HYALURONATE» → «Sodium Hyaluronate»,
 * аббревиатуры (PEG-8, SLES) остаются заглавными.
 */
export function inciTitle(inci: string): string {
  return inci
    .toLowerCase()
    .replace(/[a-z]+/g, (w) => (KEEP_UPPER.test(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
}

/** С 24.10.2026 все функции для пользователей бесплатны — сообщаем это в сниппетах. */
export const FREE_NOTE = " Бесплатно, без регистрации.";
const FREE_NOTE_SHORT = " Бесплатно.";

/**
 * Дописывает к description пометку «Бесплатно», только если она помещается в лимит
 * сниппета. Иначе возвращает текст без изменений (дальше его обрежет clampDescription).
 */
export function withFreeNote(text: string, max = 170): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (/бесплатн/i.test(clean)) return clean;
  if (clean.length + FREE_NOTE.length <= max) return `${clean}${FREE_NOTE}`;
  if (clean.length + FREE_NOTE_SHORT.length <= max) return `${clean}${FREE_NOTE_SHORT}`;
  return clean;
}

/** schema.org WebApplication: сервис бесплатный (offers.price = 0). Рейтинги не выдумываем. */
export function webApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "ru",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    description:
      "Бесплатная проверка и разбор состава косметики онлайн: расшифровка ингредиентов на русском, комедогенность, отдушки и конфликты активов.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Разбор состава косметики текстом и по фото",
      "Расшифровка ингредиентов на русском",
      "Проверка на комедогенность",
      "Конфликты активов",
      "Полка без лимита и проверка совместимости",
      "Режим утро / вечер",
    ],
  };
}
