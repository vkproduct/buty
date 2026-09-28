import type { EvidenceLevel } from "@prisma/client";

/** Общие словари меток для SEO-страниц (каталоги и карточки). */

export const EVIDENCE_LABEL: Record<
  EvidenceLevel,
  { label: string; variant: "success" | "brand" | "amber" | "coral" | "outline" }
> = {
  STRONG: { label: "Сильная доказательная база", variant: "success" },
  MODERATE: { label: "Умеренная доказательная база", variant: "amber" },
  LIMITED: { label: "Ограниченная доказательная база", variant: "coral" },
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
  peptide: "Пептид",
  preservative: "Консервант",
  surfactant: "ПАВ / очищение",
  silicone: "Силикон",
  fragrance: "Отдушка",
  alcohol: "Спирт",
};

export const SEVERITY_LABEL: Record<
  string,
  { label: string; variant: "coral" | "amber" | "outline" }
> = {
  high: { label: "Высокий риск", variant: "coral" },
  medium: { label: "Умеренный риск", variant: "amber" },
  low: { label: "Низкий риск", variant: "outline" },
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
