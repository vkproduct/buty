import type { LucideIcon } from "lucide-react";
import {
  Bandage,
  HandHeart,
  Package,
  Pipette,
  ScanFace,
  Sparkles,
  SprayCan,
  Sun,
  Waves,
} from "lucide-react";

import { PRODUCT_CATEGORY_LABEL } from "@/lib/seo/labels";

/**
 * Категории продуктов для каталога /products: порядок в фильтре (по шагам ухода),
 * множественное число для заголовков посадочных и визуальная мета (иконка + тон).
 * Классы записаны целиком — их должен видеть сканер Tailwind (lib/** в content).
 */

/** Порядок — как шаги ухода: очищение → тонер → сыворотка → … → SPF. */
export const PRODUCT_CATEGORY_ORDER = [
  "cleanser",
  "toner",
  "serum",
  "treatment",
  "peeling",
  "mask",
  "cream",
  "spf",
] as const;

/** Для заголовков: «Сыворотки CeraVe», «Солнцезащитные средства». */
export const PRODUCT_CATEGORY_PLURAL: Record<string, string> = {
  serum: "Сыворотки",
  cream: "Кремы",
  treatment: "Средства лечебного ухода",
  spf: "Солнцезащитные средства",
  cleanser: "Средства для очищения",
  toner: "Тонеры",
  mask: "Маски",
  peeling: "Пилинги",
};

export interface ProductCategoryStyle {
  icon: LucideIcon;
  tint: string;
}

export const PRODUCT_CATEGORY_STYLE: Record<string, ProductCategoryStyle> = {
  cleanser: { icon: Waves, tint: "bg-sky-50 text-sky-600" },
  toner: { icon: SprayCan, tint: "bg-cyan-50 text-cyan-700" },
  serum: { icon: Pipette, tint: "bg-rose-50 text-rose-600" },
  treatment: { icon: Bandage, tint: "bg-emerald-50 text-emerald-700" },
  peeling: { icon: Sparkles, tint: "bg-violet-50 text-violet-600" },
  mask: { icon: ScanFace, tint: "bg-fuchsia-50 text-fuchsia-600" },
  cream: { icon: HandHeart, tint: "bg-orange-50 text-orange-600" },
  spf: { icon: Sun, tint: "bg-yellow-50 text-yellow-700" },
};

const FALLBACK_STYLE: ProductCategoryStyle = { icon: Package, tint: "bg-ink-wash text-ink-soft" };

export function productCategoryStyle(category: string): ProductCategoryStyle {
  return PRODUCT_CATEGORY_STYLE[category] ?? FALLBACK_STYLE;
}

export function productCategoryLabel(category: string): string {
  return PRODUCT_CATEGORY_LABEL[category] ?? category;
}

export function productCategoryPlural(category: string): string {
  return PRODUCT_CATEGORY_PLURAL[category] ?? productCategoryLabel(category);
}

/** Сортировка категорий по шагам ухода; неизвестные — в конец по алфавиту. */
export function sortProductCategories(categories: readonly string[]): string[] {
  const rank = (c: string) => {
    const i = (PRODUCT_CATEGORY_ORDER as readonly string[]).indexOf(c);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...categories].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
