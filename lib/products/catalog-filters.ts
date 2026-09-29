/**
 * Фильтры каталога продуктов (/products): разбор searchParams, сборка ссылок,
 * фасетные счётчики и правило индексации. Чистые функции — используются и
 * сервером (страница), и клиентом (живой счётчик в панели фильтров).
 *
 * URL-контракт: `?q=…&brand=A&brand=B&category=serum&category=cream`.
 * Повторяющиеся параметры, а не «через запятую»: в названиях брендов бывают
 * запятые и апострофы, а нативная GET-форма без JS отдаёт именно такой формат.
 * Старые ссылки вида `?brand=CeraVe` продолжают работать.
 */

export type RawParam = string | string[] | undefined;

export interface RawProductSearchParams {
  q?: RawParam;
  brand?: RawParam;
  category?: RawParam;
}

export interface ProductFilters {
  q: string;
  brands: string[];
  categories: string[];
}

/** Строка матрицы фасетов: сколько продуктов у бренда в категории. */
export interface FacetRow {
  brand: string;
  category: string;
  count: number;
}

export const PRODUCTS_PATH = "/products";
/** Якорь выдачи: после смены фильтра пользователь сразу видит панель и карточки. */
export const CATALOG_ANCHOR = "#catalog";

function toArray(value: RawParam): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function firstString(value: RawParam): string {
  return toArray(value)[0] ?? "";
}

const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

/** Алфавитная сортировка брендов/названий (кириллица и латиница вперемешку по правилам ru). */
export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}

/**
 * Нормализует параметры: убирает пустые и неизвестные значения, дубли,
 * сортирует — одинаковый набор фильтров всегда даёт одинаковый URL.
 * Бренды сверяются без учёта регистра и возвращаются в каноничном написании.
 */
export function parseProductFilters(
  raw: RawProductSearchParams,
  known: { brands: readonly string[]; categories: readonly string[] }
): ProductFilters {
  const brandByLower = new Map(known.brands.map((b) => [b.toLowerCase(), b]));
  const categorySet = new Set(known.categories);

  const brands = new Set<string>();
  for (const value of toArray(raw.brand)) {
    const canonical = brandByLower.get(value.trim().toLowerCase());
    if (canonical) brands.add(canonical);
  }
  const categories = new Set<string>();
  for (const value of toArray(raw.category)) {
    const v = value.trim();
    if (categorySet.has(v)) categories.add(v);
  }

  return {
    q: firstString(raw.q).trim().slice(0, 100),
    brands: [...brands].sort(compareNames),
    categories: [...categories].sort(),
  };
}

/** Query-строка без «?» (пустая, если фильтров нет). */
export function productFiltersQuery(filters: Partial<ProductFilters>): string {
  const params = new URLSearchParams();
  const q = filters.q?.trim();
  if (q) params.set("q", q);
  for (const b of [...new Set(filters.brands ?? [])].sort(compareNames)) params.append("brand", b);
  for (const c of [...new Set(filters.categories ?? [])].sort()) params.append("category", c);
  return params.toString();
}

/** Ссылка на каталог с фильтрами; `patch` заменяет соответствующие поля. */
export function productFiltersHref(
  base: ProductFilters,
  patch: Partial<ProductFilters> = {},
  { anchor = true }: { anchor?: boolean } = {}
): string {
  const qs = productFiltersQuery({ ...base, ...patch });
  return `${PRODUCTS_PATH}${qs ? `?${qs}` : ""}${anchor ? CATALOG_ANCHOR : ""}`;
}

/** Добавить значение в список или убрать, если оно уже выбрано. */
export function toggleValue(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Сколько продуктов попадёт в выдачу при выбранных брендах и категориях.
 * Пустой список = «любой». Между брендами — ИЛИ, между категориями — ИЛИ,
 * между измерениями — И (стандартная логика фасетного фильтра).
 */
export function countMatching(
  facets: readonly FacetRow[],
  brands: readonly string[],
  categories: readonly string[]
): number {
  const b = new Set(brands);
  const c = new Set(categories);
  let total = 0;
  for (const row of facets) {
    if ((b.size === 0 || b.has(row.brand)) && (c.size === 0 || c.has(row.category))) {
      total += row.count;
    }
  }
  return total;
}

/**
 * Фасетные счётчики: для каждого бренда — сколько найдётся, если выбрать
 * только его при текущих категориях; для каждой категории — при текущих брендах.
 * Собственный выбор измерения не сужает его же счётчики — иначе при выбранном
 * бренде все остальные обнулились бы.
 */
export function facetCounts(
  facets: readonly FacetRow[],
  brands: readonly string[],
  categories: readonly string[]
): { byBrand: Map<string, number>; byCategory: Map<string, number> } {
  const b = new Set(brands);
  const c = new Set(categories);
  const byBrand = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const row of facets) {
    if (c.size === 0 || c.has(row.category)) {
      byBrand.set(row.brand, (byBrand.get(row.brand) ?? 0) + row.count);
    }
    if (b.size === 0 || b.has(row.brand)) {
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.count);
    }
  }
  return { byBrand, byCategory };
}

/**
 * Индексировать ли страницу с фильтрами. Индексируем посадочные «бренд»,
 * «категория» и «бренд + категория» — под них есть поисковый спрос.
 * Мультивыбор и поиск — noindex (дубли и бесконечные комбинации).
 */
export function isIndexableFilterPage(filters: ProductFilters): boolean {
  return !filters.q && filters.brands.length <= 1 && filters.categories.length <= 1;
}

/** Сколько фильтров активно — для бейджа на кнопке «Фильтры». */
export function activeFilterCount(filters: ProductFilters): number {
  return filters.brands.length + filters.categories.length;
}
