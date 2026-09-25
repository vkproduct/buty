import type { EvidenceLevel } from "@prisma/client";

/** Общие словари меток для SEO-страниц (каталоги и карточки). */

export const EVIDENCE_LABEL: Record<
  EvidenceLevel,
  { label: string; variant: "lavender" | "amber" | "coral" | "outline" }
> = {
  STRONG: { label: "Сильная доказательность", variant: "lavender" },
  MODERATE: { label: "Умеренная доказательность", variant: "amber" },
  LIMITED: { label: "Ограниченная доказательность", variant: "coral" },
  ANECDOTAL: { label: "Без качественных данных", variant: "outline" },
};

export const CATEGORY_LABEL: Record<string, string> = {
  active: "Актив",
  "uv-filter": "UV-фильтр",
  humectant: "Увлажнитель",
  barrier: "Барьерный компонент",
  antioxidant: "Антиоксидант",
  emollient: "Эмолент",
  botanical: "Растительный экстракт",
  soothing: "Успокаивающий",
  fragrance: "Отдушка",
  alcohol: "Спирт",
};

export const SEVERITY_LABEL: Record<
  string,
  { label: string; variant: "coral" | "amber" | "default" }
> = {
  high: { label: "Высокий риск", variant: "coral" },
  medium: { label: "Умеренный риск", variant: "amber" },
  low: { label: "Низкий риск", variant: "default" },
};

export const PRODUCT_CATEGORY_LABEL: Record<string, string> = {
  serum: "Сыворотка",
  cream: "Крем",
  treatment: "Лечебный уход",
  spf: "SPF",
  cleanser: "Очищение",
  toner: "Тонер",
  mask: "Маска",
  peeling: "Пилинг",
};

/** Заглушка партнёрской ссылки: поиск на Wildberries по бренду и названию. */
export function wbSearchUrl(brand: string, name: string): string {
  const q = encodeURIComponent(`${brand} ${name}`);
  return `https://www.wildberries.ru/catalog/0/search.aspx?search=${q}`;
}
