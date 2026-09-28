import type { EvidenceLevel } from "@prisma/client";

/** Общие словари меток для SEO-страниц (каталоги и карточки). */

export const EVIDENCE_LABEL: Record<
  EvidenceLevel,
  { label: string; variant: "success" | "brand" | "teal" | "amber" | "coral" | "outline" }
> = {
  STRONG: { label: "Сильная доказательная база", variant: "success" },
  MODERATE: { label: "Умеренная доказательная база", variant: "teal" },
  LIMITED: { label: "Ограниченная доказательная база", variant: "amber" },
  ANECDOTAL: { label: "Без качественных данных", variant: "outline" },
};

/**
 * Шкала доказательности для визуальных индикаторов (каталог, легенда).
 * Цвета совпадают с «лестницей доказательности» на главной:
 * сильная — success, умеренная — teal, ограниченная — amber, без данных — серый.
 */
export const EVIDENCE_META: Record<
  EvidenceLevel,
  { short: string; note: string; bars: 1 | 2 | 3 | 4; fill: string; text: string }
> = {
  STRONG: {
    short: "Сильная",
    note: "Рандомизированные клинические исследования и метаанализы на людях",
    bars: 4,
    fill: "bg-success",
    text: "text-success-700",
  },
  MODERATE: {
    short: "Умеренная",
    note: "Небольшие клинические исследования, согласующиеся с лабораторными данными",
    bars: 3,
    fill: "bg-teal-500",
    text: "text-teal-700",
  },
  LIMITED: {
    short: "Ограниченная",
    note: "Данные in vitro, на моделях кожи или единичные исследования",
    bars: 2,
    fill: "bg-amber-500",
    text: "text-amber-800",
  },
  ANECDOTAL: {
    short: "Без данных",
    note: "Качественных исследований нет — только традиция и маркетинг",
    bars: 1,
    fill: "bg-ink-faint",
    text: "text-ink-muted",
  },
};

/** Порядок уровней от сильного к слабому. */
export const EVIDENCE_ORDER: EvidenceLevel[] = ["STRONG", "MODERATE", "LIMITED", "ANECDOTAL"];

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
  texture: "Текстура / загуститель",
  emulsifier: "Эмульгатор",
  "ph-buffer": "Регулятор pH",
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
