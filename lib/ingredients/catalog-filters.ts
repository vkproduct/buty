/**
 * Фильтры каталога ингредиентов (/ingredients): разбор searchParams, сборка
 * ссылок, фасетные счётчики и правило индексации. Чистые функции — работают
 * и на сервере (страница), и в браузере (живой счётчик в панели фильтров).
 *
 * URL-контракт:
 *   `?q=…&category=humectant&category=barrier&evidence=STRONG&flag=comedogenic`
 * Повторяющиеся параметры — именно их отдаёт нативная GET-форма без JS.
 * Старые ссылки тоже работают: `?category=x`, `?evidence=STRONG`,
 * `?flags=comedogenic,fragranceAllergen` (флаги через запятую).
 *
 * Логика отбора: внутри измерения — ИЛИ (увлажнитель ИЛИ эмолент),
 * между измерениями — И (категория И доказательность И флаг).
 */

import type { EvidenceLevel } from "@prisma/client";

export type RawParam = string | string[] | undefined;

export interface RawIngredientSearchParams {
  q?: RawParam;
  category?: RawParam;
  evidence?: RawParam;
  flag?: RawParam;
  /** устаревший формат: ключи через запятую */
  flags?: RawParam;
}

/** Безопасностные флаги — в порядке показа в фильтре. */
export const FLAG_KEYS = ["comedogenic", "feedsMalassezia", "fragranceAllergen"] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

/** Уровни доказательности от сильного к слабому (дублирует EVIDENCE_ORDER без импорта UI-словарей). */
export const EVIDENCE_KEYS: readonly EvidenceLevel[] = ["STRONG", "MODERATE", "LIMITED", "ANECDOTAL"];

export interface IngredientFilters {
  q: string;
  categories: string[];
  evidence: EvidenceLevel[];
  flags: FlagKey[];
}

/** Строка матрицы фасетов: сколько ингредиентов с таким сочетанием признаков. */
export interface IngredientFacetRow {
  category: string;
  evidence: EvidenceLevel;
  comedogenic: boolean;
  feedsMalassezia: boolean;
  fragranceAllergen: boolean;
  count: number;
}

export type FilterDimension = "categories" | "evidence" | "flags";

export const INGREDIENTS_PATH = "/ingredients";
/** Якорь выдачи: после смены фильтра пользователь сразу видит панель и карточки. */
export const CATALOG_ANCHOR = "#catalog";

export const EMPTY_FILTERS: IngredientFilters = { q: "", categories: [], evidence: [], flags: [] };

function toArray(value: RawParam): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Все значения параметра; каждое дополнительно режется по запятой (старые ссылки). */
function values(...params: RawParam[]): string[] {
  return params
    .flatMap(toArray)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

const FLAG_SET = new Set<string>(FLAG_KEYS);
const EVIDENCE_SET = new Set<string>(EVIDENCE_KEYS);

const byOrder =
  <T extends string>(order: readonly T[]) =>
  (a: T, b: T) =>
    order.indexOf(a) - order.indexOf(b);

/**
 * Нормализует параметры: убирает пустые и неизвестные значения и дубли,
 * сортирует — одинаковый набор фильтров всегда даёт одинаковый URL.
 * Категории сверяются со справочником из БД.
 */
export function parseIngredientFilters(
  raw: RawIngredientSearchParams,
  known: { categories: readonly string[] }
): IngredientFilters {
  const categorySet = new Set(known.categories);
  const categories = [...new Set(values(raw.category).filter((c) => categorySet.has(c)))].sort();
  const evidence = [
    ...new Set(
      values(raw.evidence)
        .map((v) => v.toUpperCase())
        .filter((v): v is EvidenceLevel => EVIDENCE_SET.has(v))
    ),
  ].sort(byOrder(EVIDENCE_KEYS));
  const flags = [
    ...new Set(values(raw.flag, raw.flags).filter((v): v is FlagKey => FLAG_SET.has(v))),
  ].sort(byOrder(FLAG_KEYS));

  return {
    q: (toArray(raw.q)[0] ?? "").trim().slice(0, 100),
    categories,
    evidence,
    flags,
  };
}

/** Query-строка без «?» (пустая, если фильтров нет). */
export function ingredientFiltersQuery(filters: Partial<IngredientFilters>): string {
  const params = new URLSearchParams();
  const q = filters.q?.trim();
  if (q) params.set("q", q);
  for (const c of [...new Set(filters.categories ?? [])].sort()) params.append("category", c);
  for (const e of [...new Set(filters.evidence ?? [])].sort(byOrder(EVIDENCE_KEYS)))
    params.append("evidence", e);
  for (const f of [...new Set(filters.flags ?? [])].sort(byOrder(FLAG_KEYS)))
    params.append("flag", f);
  return params.toString();
}

/** Ссылка на каталог с фильтрами; `patch` заменяет соответствующие поля. */
export function ingredientFiltersHref(
  base: IngredientFilters,
  patch: Partial<IngredientFilters> = {},
  { anchor = true }: { anchor?: boolean } = {}
): string {
  const qs = ingredientFiltersQuery({ ...base, ...patch });
  return `${INGREDIENTS_PATH}${qs ? `?${qs}` : ""}${anchor ? CATALOG_ANCHOR : ""}`;
}

/** Добавить значение в список или убрать, если оно уже выбрано. */
export function toggleValue<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type Selection = Pick<IngredientFilters, "categories" | "evidence" | "flags">;

/** Подходит ли строка матрицы под выбор; `skip` — измерение, которое не проверяем. */
function rowMatches(row: IngredientFacetRow, sel: Selection, skip?: FilterDimension): boolean {
  if (skip !== "categories" && sel.categories.length > 0 && !sel.categories.includes(row.category))
    return false;
  if (skip !== "evidence" && sel.evidence.length > 0 && !sel.evidence.includes(row.evidence))
    return false;
  if (skip !== "flags" && sel.flags.length > 0 && !sel.flags.some((f) => row[f])) return false;
  return true;
}

/** Сколько ингредиентов попадёт в выдачу при выбранных фильтрах. */
export function countMatching(rows: readonly IngredientFacetRow[], sel: Selection): number {
  let total = 0;
  for (const row of rows) if (rowMatches(row, sel)) total += row.count;
  return total;
}

/**
 * Фасетные счётчики: для каждого пункта — сколько найдётся, если выбрать его
 * при остальных текущих фильтрах. Выбор внутри измерения не сужает счётчики
 * этого же измерения — иначе при выбранной категории все остальные обнулились бы.
 */
export function facetCounts(
  rows: readonly IngredientFacetRow[],
  sel: Selection
): {
  byCategory: Map<string, number>;
  byEvidence: Map<EvidenceLevel, number>;
  byFlag: Map<FlagKey, number>;
} {
  const byCategory = new Map<string, number>();
  const byEvidence = new Map<EvidenceLevel, number>();
  const byFlag = new Map<FlagKey, number>();
  for (const row of rows) {
    if (rowMatches(row, sel, "categories")) {
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.count);
    }
    if (rowMatches(row, sel, "evidence")) {
      byEvidence.set(row.evidence, (byEvidence.get(row.evidence) ?? 0) + row.count);
    }
    if (rowMatches(row, sel, "flags")) {
      for (const f of FLAG_KEYS) {
        if (row[f]) byFlag.set(f, (byFlag.get(f) ?? 0) + row.count);
      }
    }
  }
  return { byCategory, byEvidence, byFlag };
}

/**
 * Индексировать ли страницу с фильтрами. Индексируем посадочные «одна категория»
 * («Увлажнители в косметике») — под них есть поисковый спрос. Поиск, мультивыбор,
 * доказательность и флаги — noindex (дубли и бесконечные комбинации).
 */
export function isIndexableFilterPage(filters: IngredientFilters): boolean {
  return (
    !filters.q &&
    filters.evidence.length === 0 &&
    filters.flags.length === 0 &&
    filters.categories.length <= 1
  );
}

/** Сколько фильтров активно (без поиска) — для бейджа на кнопке «Фильтры». */
export function activeFilterCount(filters: Selection): number {
  return filters.categories.length + filters.evidence.length + filters.flags.length;
}
