/**
 * Постраничная выдача каталога ингредиентов (/ingredients).
 *
 * В базе ~5 500 ингредиентов, а в алфавитной раскладке каждый попадает
 * под две буквы (INCI и русское название) — это ~11 000 карточек. Отдавать
 * их одной страницей нельзя: ответ весит мегабайты, а переход из меню
 * «зависает», пока сервер рендерит всё целиком. Поэтому длинная выдача
 * (больше LETTER_PAGING_THRESHOLD) показывается по одной букве, а внутри
 * буквы — страницами по CATALOG_PAGE_SIZE карточек.
 *
 * URL-контракт (дополняет фильтры из catalog-filters.ts):
 *   `?letter=Б&page=2` — кириллица, `?letter=C` — латиница (INCI),
 *   `?letter=0-9` — названия с цифры.
 * Буква по умолчанию (первая кириллическая в выдаче) и первая страница
 * в URL не пишутся — у каждой страницы ровно один адрес.
 */

import { DIGITS_KEY, EN_ALPHABET, isLatinLetter, RU_ALPHABET } from "./catalog-alphabet";
import {
  CATALOG_ANCHOR,
  ingredientFiltersQuery,
  INGREDIENTS_PATH,
  type IngredientFilters,
  type RawParam,
} from "./catalog-filters";

/** С какого размера выдачи включаем разбивку по буквам. */
export const LETTER_PAGING_THRESHOLD = 150;
/** Карточек на одной странице буквы. */
export const CATALOG_PAGE_SIZE = 120;
/** Верхняя граница номера страницы из URL — защита от мусорных значений. */
const MAX_PAGE = 1000;
/** Ключ группы «0–9» в URL: без длинного тире, чтобы адрес читался без кодирования. */
const DIGITS_PARAM = "0-9";

function first(value: RawParam): string {
  return ((Array.isArray(value) ? value[0] : value) ?? "").trim();
}

/** Значение параметра `letter` для ключа алфавитной группы. */
export function letterParam(key: string): string {
  return key === DIGITS_KEY ? DIGITS_PARAM : key;
}

/**
 * Ключ алфавитной группы из `?letter=`: одна буква в верхнем регистре
 * (Ё сводится к Е) или «0–9». Существует ли такая группа в выдаче,
 * проверяет страница; здесь — только нормализация.
 */
export function parseLetterParam(raw: RawParam): string | null {
  const value = first(raw);
  if (!value) return null;
  if (value === DIGITS_PARAM || value === DIGITS_KEY) return DIGITS_KEY;
  const chars = [...value.toUpperCase()];
  if (chars.length !== 1) return null;
  const key = chars[0] === "Ё" ? "Е" : chars[0];
  return /\p{L}/u.test(key) ? key : null;
}

/** Номер страницы из `?page=`: целое ≥ 1, иначе 1. */
export function parsePageParam(raw: RawParam): number {
  const value = first(raw);
  if (!/^\d+$/.test(value)) return 1;
  const page = Number.parseInt(value, 10);
  return page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

/** Буква по умолчанию: первая кириллическая в выдаче, затем латинская, затем любая. */
export function defaultLetter(letters: readonly string[]): string | undefined {
  return (
    letters.find((key) => RU_ALPHABET.includes(key)) ??
    letters.find((key) => EN_ALPHABET.includes(key)) ??
    letters[0]
  );
}

export interface CatalogPosition {
  letter?: string | null;
  page?: number;
}

/**
 * Ссылка на страницу каталога: фильтры + буква + номер страницы.
 * Буква по умолчанию и первая страница в адрес не попадают.
 */
export function catalogPageHref(
  filters: IngredientFilters,
  { letter, page = 1 }: CatalogPosition,
  { defaultLetter: fallback, anchor = true }: { defaultLetter?: string; anchor?: boolean } = {}
): string {
  const params = new URLSearchParams(ingredientFiltersQuery(filters));
  if (letter && letter !== fallback) params.set("letter", letterParam(letter));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `${INGREDIENTS_PATH}${qs ? `?${qs}` : ""}${anchor ? CATALOG_ANCHOR : ""}`;
}

/** Элемент пагинации: номер страницы или разрыв «…». */
export type PageItem = number | "gap";

/**
 * Окно номеров страниц: первая, последняя и соседи текущей; пропуски — «…».
 * Разрыв ставится только там, где пропущено больше одной страницы.
 */
export function pageWindow(current: number, total: number, radius = 1): PageItem[] {
  if (total <= 1) return [1];
  const pages = new Set<number>([1, total]);
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((page, index) => {
    const prev = sorted[index - 1];
    if (prev !== undefined && page - prev === 2) items.push(prev + 1);
    else if (prev !== undefined && page - prev > 2) items.push("gap");
    items.push(page);
  });
  return items;
}

/**
 * Хвост заголовка для буквы: «на букву Б», «на букву C (INCI)»,
 * «с цифрой в начале названия». Латинские группы собраны по INCI —
 * пометка отличает латинскую C от кириллической С.
 */
export function letterPhrase(key: string): string {
  if (key === DIGITS_KEY) return "с цифрой в начале названия";
  return isLatinLetter(key) ? `на букву ${key} (INCI)` : `на букву ${key}`;
}
