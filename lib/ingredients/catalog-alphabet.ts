/**
 * Алфавитная раскладка каталога ингредиентов.
 *
 * Ингредиент известен под двумя названиями — латинским INCI (inciName) и
 * русским (displayName), — поэтому в алфавитной выдаче он появляется
 * под каждым из них: MELALEUCA ALTERNIFOLIA LEAF WATER ищется по латинской «M»,
 * а «Вода листьев чайного дерева» — по кириллической «В». Заголовком карточки
 * всегда служит INCI, русское название идёт вторым. Ссылка у обеих карточек
 * одна и та же.
 */

/** Ингредиент в объёме, нужном алфавитной раскладке. */
export type AlphabetIngredient = { displayName: string; inciName: string };

/** Карточка алфавитной выдачи: ингредиент под одним из своих названий. */
export type CatalogEntry<T extends AlphabetIngredient> = {
  ingredient: T;
  /** Заголовок карточки: INCI (если INCI пуст — русское название). */
  title: string;
  /** Второе название — русское, подписью под заголовком (пусто, если названия совпали). */
  subtitle: string;
  /** Ключ алфавитной группы. */
  letter: string;
  /** Название, по первой букве которого карточка попала в группу (по нему сортируем). */
  sortKey: string;
};

export const DIGITS_KEY = "0–9";

/**
 * Ключ алфавитной группы: первая буква названия.
 * Цифры — в одну группу «0–9» (в начале), латинские буквы идут отдельным блоком
 * после кириллицы и в указателе выведены второй строкой — так латинская P
 * не путается с кириллической Р.
 */
export function letterOf(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();
  if (/[0-9]/.test(ch)) return DIGITS_KEY;
  return ch === "Ё" ? "Е" : ch;
}

export const isLatinLetter = (key: string) => /^[A-Z]$/.test(key);

/** Порядок блоков указателя: цифры → кириллица → латиница. */
export function letterRank(key: string): number {
  if (key === DIGITS_KEY) return 0;
  if (isLatinLetter(key)) return 2;
  return 1;
}

/** id секции буквы: префикс алфавита, чтобы кириллическая и латинская «похожие» буквы не совпали. */
export function letterAnchor(key: string): string {
  if (key === DIGITS_KEY) return "letter-digits";
  return `letter-${isLatinLetter(key) ? "en" : "ru"}-${key}`;
}

/** Буквы, с которых может начинаться слово (без Ё, Ъ, Ы, Ь). */
export const RU_ALPHABET = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ".split("");
export const EN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Карточки алфавитной выдачи: по одной на каждое название ингредиента.
 * Если оба названия начинаются с одной и той же буквы (латинский
 * displayName вида «SLS»), карточка в этой букве остаётся одна.
 * Заголовок и подпись у всех карточек одного ингредиента одинаковые:
 * INCI — заголовок, русское название — подпись.
 */
export function catalogEntries<T extends AlphabetIngredient>(
  ingredients: readonly T[]
): CatalogEntry<T>[] {
  const entries: CatalogEntry<T>[] = [];
  for (const ingredient of ingredients) {
    const inci = ingredient.inciName?.trim() ?? "";
    const ru = ingredient.displayName?.trim() ?? "";
    const title = inci || ru;
    const subtitle = inci && ru && ru !== inci ? ru : "";
    const seen = new Set<string>();
    for (const sortKey of [inci, ru]) {
      if (!sortKey) continue;
      const letter = letterOf(sortKey);
      if (seen.has(letter)) continue;
      seen.add(letter);
      entries.push({ ingredient, title, subtitle, letter, sortKey });
    }
  }
  return entries;
}

/** Группировка карточек по буквам: внутри группы — по названию, давшему букву. */
export function groupByLetter<T extends AlphabetIngredient>(
  entries: readonly CatalogEntry<T>[]
): Map<string, CatalogEntry<T>[]> {
  const groups = new Map<string, CatalogEntry<T>[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.letter);
    if (bucket) bucket.push(entry);
    else groups.set(entry.letter, [entry]);
  }
  for (const bucket of groups.values()) {
    bucket.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "ru"));
  }
  return groups;
}

/** Порядок букв в выдаче и указателе. */
export function sortLetters(keys: Iterable<string>): string[] {
  return [...keys].sort((a, b) => letterRank(a) - letterRank(b) || a.localeCompare(b, "ru"));
}
