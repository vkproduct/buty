/**
 * Каноническое название бренда. Ключ сравнения brandKey() стирает различия
 * написаний одного бренда (регистр, диакритика, дефисы, апострофы, & / and),
 * BRAND_ALIASES склеивает написания, которые ключ не ловит (La Roche Posay,
 * Eau Thermale Avène), и задаёт принудительные канонические имена.
 *
 * Чистый TS без Node API и Prisma — модуль работает и в edge (middleware).
 */

import { NO_BRAND } from "./brand";

/**
 * Ключ сравнения брендов: NFKD + снятие диакритики, нижний регистр, ё → е,
 * & → and, удаление всего, кроме a-z, 0-9, а-я и + (плюс значим:
 * «BIO» и «Bio+» — разные бренды).
 */
export function brandKey(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9а-я+]/g, "");
}

const TYPOGRAPHIC_APOSTROPHES = /[’‘´`]/g;
const TRAILING_ELLIPSIS = /(?:\.\.\.|…)+$/u;

/**
 * Чистка строки до выбора имени: trim, схлопывание пробелов, типографские
 * апострофы → ', срез хвостовых «…» и «...».
 */
export function cleanBrand(raw: string): string {
  return raw
    .trim()
    .replace(TYPOGRAPHIC_APOSTROPHES, "'")
    .replace(/\s+/g, " ")
    .replace(TRAILING_ELLIPSIS, "")
    .trim();
}

/**
 * Ручные правила: каноническое имя → варианты написания (сравнение вариантов
 * по brandKey). Сюда попадают склейки, которые ключ не ловит, и принудительные
 * написания. Намеренно НЕ склеиваем: L'Oréal Professionnel с L'Oréal Paris,
 * Johnson & Johnson с Johnson's, Dove men care с Dove, BIO с Bio+,
 * Les Cosmétiques с Les Cosmétiques Design Paris.
 */
export const BRAND_ALIASES: Record<string, readonly string[]> = {
  "L'Oréal Paris": [
    "L'Oréal",
    "Loreal",
    "l-oreal",
    "L'Oreal Paris",
    "Loreal Paris",
    "L'Oréal Men Expert",
    "L'Oreal Men Expert",
  ],
  "L'Oréal Professionnel": ["LOreal professionnel", "L'Oréal Professionnel"],
  Avène: ["Avene", "Avéne", "Eau Thermale Avène", "EAU THERMALE AVENE", "Eau Thermale Avene"],
  "La Roche-Posay": [],
  Vichy: ["VICHY"],
  Nivea: ["NIVEA", "Nivéa"],
  CeraVe: ["Cera Ve"],
  "Head & Shoulders": ["Head and Shoulders", "head&shoulders", "Heads & shoulders", "Heads and shoulders"],
  Pantene: ["PANTENE", "Pantène", "Pantene Pro-V", "Pantene Pro V"],
  "Estée Lauder": ["Estee Lauder", "Estēe Lauder"],
  TRESemmé: ["TRESemme"],
  "Johnson's": ["Johnson’s", "Johnsons", "Johnson's Baby", "Johnson’s baby"],
  "A-Derma": ["Aderma", "A- DERMA", "A DERMA"],
  "Oral-B": ["Oral B", "OralB", "Oral - B"],
  Bulldog: ["Bull dog", "Bulldog Skincare", "Bull Dog Skincare"],
  "Dr. Bronner's": ["Dr.Bronners", "Dr Bronner", "Dr. Bronner"],
  "René Furterer": ["Rene Furterer Paris", "René FURTERER Paris"],
  Kérastase: ["Keratase paris", "Kératase Paris"],
  Skin1004: ["Skin 1004"],
  "Some By Mi": ["SOME BY MI", "SOMEBYMI"],
  "Невская косметика": ["Невская Косметика"],
  Angiopharm: ["ANGIOPHARM", "Ангиофарм"],
};

/** Вариант с фиксированным ключом (правило «все с ключом X» в BRAND_ALIASES). */
const ALIAS_KEYS: Record<string, string> = {
  larocheposay: "La Roche-Posay",
};

/** brandKey(variant|канона) → каноническое имя, собрано из BRAND_ALIASES. */
const aliasByKey = new Map<string, string>();
for (const [canonical, variants] of Object.entries(BRAND_ALIASES)) {
  aliasByKey.set(brandKey(canonical), canonical);
  for (const variant of variants) aliasByKey.set(brandKey(variant), canonical);
}

const LOREAL_KEY = "loreal";
const LOREAL_PROFESSIONNEL_KEY = "lorealprofessionnel";

/**
 * Каноническое имя по алиасам или null. Особое правило: любое значение,
 * чей ключ начинается с «loreal», — L'Oréal Paris, кроме «lorealprofessionnel…»
 * (L'Oréal Professionnel).
 */
export function aliasCanonical(raw: string): string | null {
  const key = brandKey(cleanBrand(raw));
  if (!key) return null;
  if (key.startsWith(LOREAL_KEY) && !key.startsWith(LOREAL_PROFESSIONNEL_KEY)) {
    return "L'Oréal Paris";
  }
  return aliasByKey.get(key) ?? null;
}

/** Вариант написания бренда с числом средств (для выбора имени группы). */
export interface BrandVariant {
  name: string;
  products: number;
}

/**
 * Выбор канонического имени для группы вариантов с одинаковым ключом
 * (групп без алиаса): 1) вариант с алиасом побеждает; 2) варианты, где есть
 * хотя бы одна строчная буква, важнее КАПСА (Klorane важнее KLORANE);
 * 3) больше средств; 4) по алфавиту.
 */
export function chooseCanonicalName(variants: readonly BrandVariant[]): string {
  for (const v of variants) {
    const alias = aliasCanonical(v.name);
    if (alias) return alias;
  }
  const withLower = variants.filter((v) => /[a-zа-я]/.test(v.name));
  const pool = withLower.length > 0 ? withLower : variants;
  return [...pool].sort(
    (a, b) => b.products - a.products || a.name.localeCompare(b.name, "ru")
  )[0].name;
}

/** Склеенная группа вариантов одного бренда. */
export interface CanonicalGroup {
  /** Ключ канонического имени (для brand-redirects.data.ts). */
  key: string;
  canonical: string;
  variants: BrandVariant[];
  products: number;
}

/**
 * Разбивает варианты написания на группы одного бренда: union-find по brandKey
 * с слиянием через алиасы (Eau Thermale Avène → Avène). Каждая группа получает
 * каноническое имя через алиасы или правила выбора.
 */
export function resolveCanonicalGroups(variants: readonly BrandVariant[]): CanonicalGroup[] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = k;
    while (parent.get(cur) !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string): void => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const v of variants) {
    const key = brandKey(v.name);
    if (!parent.has(key)) parent.set(key, key);
    const alias = aliasCanonical(v.name);
    if (alias) union(key, brandKey(alias));
  }

  const byRoot = new Map<string, BrandVariant[]>();
  for (const v of variants) {
    const root = find(brandKey(v.name));
    const g = byRoot.get(root);
    if (g) g.push(v);
    else byRoot.set(root, [v]);
  }

  return [...byRoot.values()].map((groupVariants) => {
    const canonical = chooseCanonicalName(groupVariants);
    return {
      key: brandKey(canonical),
      canonical,
      variants: groupVariants,
      products: groupVariants.reduce((sum, v) => sum + v.products, 0),
    };
  });
}

/**
 * Каноническое имя для записи в БД. NO_BRAND и пустая строка — без изменений;
 * иначе cleanBrand → BRAND_ALIASES → knownByKey (существующее каноническое
 * имя группы из БД) → очищенная строка.
 */
export function canonicalBrand(
  raw: string,
  knownByKey?: ReadonlyMap<string, string>
): string {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === NO_BRAND) return raw;
  const cleaned = cleanBrand(raw);
  const alias = aliasCanonical(cleaned);
  if (alias) return alias;
  const known = knownByKey?.get(brandKey(cleaned));
  return known ?? cleaned;
}
