import type { LucideIcon } from "lucide-react";
import {
  Beaker,
  Blend,
  Citrus,
  Dna,
  Droplet,
  Droplets,
  Feather,
  FlaskConical,
  Flower2,
  Layers,
  Leaf,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  TestTube,
  Waves,
} from "lucide-react";

/**
 * Визуальная мета категорий ингредиентов: иконка и мягкий тон плашки.
 * Тона — из стандартной палитры Tailwind, чтобы не пересекаться с семантикой
 * бренда (CTA) и доказательности (success / teal / amber).
 * Классы записаны целиком — их должен видеть сканер Tailwind (lib/** в content).
 */
export interface CategoryStyle {
  icon: LucideIcon;
  /** фон + цвет иконки */
  tint: string;
}

export const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  active: { icon: FlaskConical, tint: "bg-rose-50 text-rose-600" },
  peptide: { icon: Dna, tint: "bg-fuchsia-50 text-fuchsia-600" },
  antioxidant: { icon: Citrus, tint: "bg-orange-50 text-orange-600" },
  "uv-filter": { icon: Sun, tint: "bg-yellow-50 text-yellow-700" },
  soothing: { icon: Feather, tint: "bg-emerald-50 text-emerald-700" },
  humectant: { icon: Droplets, tint: "bg-sky-50 text-sky-600" },
  emollient: { icon: Droplet, tint: "bg-stone-100 text-stone-700" },
  barrier: { icon: Shield, tint: "bg-indigo-50 text-indigo-600" },
  botanical: { icon: Leaf, tint: "bg-green-50 text-green-700" },
  silicone: { icon: Layers, tint: "bg-slate-100 text-slate-600" },
  texture: { icon: Waves, tint: "bg-violet-50 text-violet-600" },
  emulsifier: { icon: Blend, tint: "bg-cyan-50 text-cyan-700" },
  surfactant: { icon: Sparkles, tint: "bg-blue-50 text-blue-600" },
  preservative: { icon: ShieldCheck, tint: "bg-lime-50 text-lime-700" },
  "ph-buffer": { icon: TestTube, tint: "bg-purple-50 text-purple-600" },
  fragrance: { icon: Flower2, tint: "bg-pink-50 text-pink-600" },
  alcohol: { icon: Beaker, tint: "bg-zinc-100 text-zinc-600" },
};

export const FALLBACK_CATEGORY_STYLE: CategoryStyle = {
  icon: FlaskConical,
  tint: "bg-ink-wash text-ink-soft",
};

export function categoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLE[category] ?? FALLBACK_CATEGORY_STYLE;
}

/**
 * Смысловые группы категорий — как их воспринимает пользователь:
 * сначала то, что даёт результат, затем уход за барьером, затем «техническая» основа.
 * Категории, которых нет ни в одной группе, попадают в «Основу формулы».
 */
export const CATEGORY_GROUPS: { id: string; title: string; hint: string; categories: string[] }[] = [
  {
    id: "results",
    title: "Работают на результат",
    hint: "Активы, которые решают задачи кожи",
    categories: ["active", "peptide", "antioxidant", "uv-filter", "soothing"],
  },
  {
    id: "care",
    title: "Увлажнение и барьер",
    hint: "Удерживают воду и защищают кожу",
    categories: ["humectant", "emollient", "barrier", "botanical", "silicone"],
  },
  {
    id: "base",
    title: "Основа формулы",
    hint: "Текстура, стабильность и аромат",
    categories: ["texture", "emulsifier", "surfactant", "preservative", "ph-buffer", "fragrance", "alcohol"],
  },
];
