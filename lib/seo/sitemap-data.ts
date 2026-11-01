import { prisma } from "@/lib/prisma";
import { EMPTY_FILTERS, ingredientFiltersQuery } from "@/lib/ingredients/catalog-filters";
import { letterOf, sortLetters } from "@/lib/ingredients/catalog-alphabet";
import { catalogPageHref, defaultLetter } from "@/lib/ingredients/catalog-pages";
import { displayBrand } from "@/lib/products/brand";
import {
  brandCategoryKey,
  isIndexableFilterPage,
  MIN_BRAND_CATEGORY_PRODUCTS,
  MIN_BRAND_PRODUCTS,
  productFiltersQuery,
  type IndexableFilterCounts,
} from "@/lib/products/catalog-filters";
import { CATEGORY_PLURAL } from "@/lib/seo/ingredient-categories";
import { CONTENT_UPDATED_AT, LANDINGS } from "@/lib/seo/landings";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Данные для sitemap. Файлы разбиты по типам, чтобы в Вебмастере было видно,
 * что именно не индексируется:
 *   /sitemap/static.xml      — главная, /analyze, /sostav/*, каталоги, буквы, категории;
 *   /sitemap/ingredients.xml — карточки ингредиентов;
 *   /sitemap/filters.xml     — индексируемые фильтр-страницы (бренд ≥ 5, пара ≥ 8);
 *   /sitemap/products-N.xml  — карточки продуктов пачками по PRODUCT_CHUNK.
 * Старые адреса /sitemap/0.xml, /1.xml… остаются рабочими (файл 0 — бывшее
 * всё-в-одном содержимое, N ≥ 1 — пачки продуктов).
 * Роуты динамические: на сборке (docker build на VPS, GitHub Action) БД
 * недоступна — обращения к ней только в рантайме.
 *
 * lastmod — честный: updatedAt из БД у продуктов/ингредиентов/фильтров,
 * CONTENT_UPDATED_AT у посадочных. Никаких new Date() «при каждом запросе».
 */

export const PRODUCT_CHUNK = 40000;

export interface SitemapEntry {
  url: string;
  /** YYYY-MM-DD */
  lastModified: string;
  changeFrequency: string;
  priority: number;
}

/** Индексируемые продукты (правило не менять): noindex-продукты (распознано < 50%
 *  состава) и скрытые в sitemap не включаем. */
const INDEXABLE_PRODUCT_WHERE = `
  WHERE "hidden" = false
    AND ("ingredientsTotal" = 0
         OR "ingredientsRecognized"::float / "ingredientsTotal" >= 0.5)
`;

const INDEXABLE_PRODUCT_SQL = `
  SELECT count(*)::int AS count FROM "Product"
${INDEXABLE_PRODUCT_WHERE}
`;

export async function indexableProductCount(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(INDEXABLE_PRODUCT_SQL);
  return rows[0]?.count ?? 0;
}

/** Число файлов products-N.xml по числу индексируемых продуктов: пачки
 *  по PRODUCT_CHUNK (0 продуктов — файлов нет). */
export function sitemapFileCountForProducts(indexableCount: number): number {
  return Math.ceil(indexableCount / PRODUCT_CHUNK);
}

/** URL в XML не экранируются заранее: entry() хранит «сырой» URL, экранирование
 *  — в toUrlSetXml (иначе &amp; уезжал бы в IndexNow и canonical). */
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Формат lastmod по протоколу: полной даты YYYY-MM-DD достаточно. */
function formatLastModified(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function entry(
  path: string,
  priority: number,
  changeFrequency: SitemapEntry["changeFrequency"],
  lastModified?: Date | null
): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified: formatLastModified(lastModified ?? CONTENT_UPDATED_AT),
    changeFrequency,
    priority,
  };
}

/** Строка матрицы бренд × категория по индексируемым продуктам с максимальным
 *  updatedAt выборки — для lastmod фильтр-страниц. */
export interface IndexableFacetRow {
  brand: string;
  category: string;
  count: number;
  maxUpdatedAt: Date | null;
}

export async function indexableFacetRows(): Promise<IndexableFacetRow[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ brand: string; category: string; count: number; maxUpdatedAt: Date | null }>>(
    `SELECT "brand", "category", count(*)::int AS count, max("updatedAt") AS "maxUpdatedAt"
  FROM "Product"
${INDEXABLE_PRODUCT_WHERE}
  GROUP BY "brand", "category"`
  );
  return rows;
}

/** Счётчики для порогов индексации фильтр-страниц (isIndexableFilterPage). */
export function toIndexableCounts(rows: readonly IndexableFacetRow[]): IndexableFilterCounts {
  const byBrand = new Map<string, number>();
  const byBrandCategory = new Map<string, number>();
  for (const r of rows) {
    if (displayBrand(r.brand) === null) continue; // «Без бренда» — заглушка, не бренд
    byBrand.set(r.brand, (byBrand.get(r.brand) ?? 0) + r.count);
    byBrandCategory.set(brandCategoryKey(r.brand, r.category), r.count);
  }
  return { byBrand, byBrandCategory };
}

/** static.xml: главная, посадочные «состав …», хаб /sostav, каталоги, буквы
 *  каталога ингредиентов и категории ингредиентов. Контент статичен — lastmod
 *  CONTENT_UPDATED_AT, обновляется вручную при правке текстов. */
export async function staticEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [
    entry("/", 1, "weekly"),
    entry("/analyze", 0.9, "monthly"),
    entry("/sostav", 0.9, "monthly"),
    ...LANDINGS.map((l) => entry(`/sostav/${l.slug}`, 0.9, "monthly")),
    entry("/ingredients", 0.9, "weekly"),
    entry("/products", 0.9, "weekly"),
    entry("/for-brands", 0.4, "monthly"),
    entry("/privacy", 0.2, "yearly"),
  ];

  try {
    const [ingredients, ingredientCategories] = await Promise.all([
      prisma.ingredient.findMany({ select: { slug: true, inciName: true, displayName: true, updatedAt: true } }),
      prisma.ingredient.groupBy({
        by: ["category"],
        _max: { updatedAt: true },
      }),
    ]);
    // «Без бренда»-подобных сентинелов у ингредиентов нет, но пустые имена молча пропускаем.
    const ingredientLetters = sortLetters(
      new Set(
        ingredients.flatMap((i) =>
          [i.inciName, i.displayName].filter((name) => name?.trim()).map(letterOf)
        )
      )
    );
    const fallbackLetter = defaultLetter(ingredientLetters);
    const maxIngredientUpdatedAt = ingredients.reduce<Date | null>(
      (max, i) => (max && max > i.updatedAt ? max : i.updatedAt),
      null
    );
    // Буквы каталога (первая страница каждой; буква по умолчанию — это сам /ingredients).
    // Состав букв меняется только вместе с составом ингредиентов — lastmod общий.
    entries.push(
      ...ingredientCategories
        .filter((c) => CATEGORY_PLURAL[c.category])
        .map((c) =>
          entry(
            `/ingredients?${ingredientFiltersQuery({ categories: [c.category] })}`,
            0.8,
            "weekly",
            c._max.updatedAt
          )
        ),
      ...ingredientLetters
        .filter((letter) => letter !== fallbackLetter)
        .map((letter) =>
          entry(
            catalogPageHref(EMPTY_FILTERS, { letter }, { defaultLetter: fallbackLetter, anchor: false }),
            0.6,
            "weekly",
            maxIngredientUpdatedAt
          )
        )
    );
  } catch {
    // БД недоступна — отдаём хотя бы статические страницы.
  }

  return entries;
}

/** ingredients.xml: карточки ингредиентов; lastmod — updatedAt из БД. */
export async function ingredientEntries(): Promise<SitemapEntry[]> {
  const ingredients = await prisma.ingredient.findMany({
    select: { slug: true, updatedAt: true },
  });
  return ingredients.map((i) => entry(`/ingredients/${i.slug}`, 0.8, "monthly", i.updatedAt));
}

/** filters.xml: индексируемые фильтр-страницы каталога продуктов.
 *  Бренд — только при ≥ MIN_BRAND_PRODUCTS продуктах, пара бренд+категория —
 *  при ≥ MIN_BRAND_CATEGORY_PRODUCTS; «только категория» — как раньше.
 *  lastmod — максимальный updatedAt продуктов в выборке. */
export async function filterEntries(): Promise<SitemapEntry[]> {
  const rows = await indexableFacetRows();
  const counts = toIndexableCounts(rows);
  const branded = rows.filter((r) => displayBrand(r.brand) !== null);
  const productCategories = [...new Set(branded.map((r) => r.category))];
  const maxByCategory = new Map<string, Date | null>();
  for (const r of branded) {
    const cur = maxByCategory.get(r.category);
    maxByCategory.set(r.category, cur && cur > (r.maxUpdatedAt ?? cur) ? cur : r.maxUpdatedAt);
  }

  const entries: SitemapEntry[] = [
    // «только категория» — без порога, как раньше
    ...productCategories.map((c) =>
      entry(`/products?${productFiltersQuery({ categories: [c] })}`, 0.7, "weekly", maxByCategory.get(c))
    ),
  ];
  const emittedBrands = new Set<string>();
  for (const r of branded) {
    if (
      isIndexableFilterPage(
        { q: "", brands: [r.brand], categories: [r.category] },
        counts
      )
    ) {
      entries.push(
        entry(
          `/products?${productFiltersQuery({ brands: [r.brand], categories: [r.category] })}`,
          0.6,
          "weekly",
          r.maxUpdatedAt
        )
      );
    }
    // бренд целиком — один раз на бренд
    if (!emittedBrands.has(r.brand) && (counts.byBrand.get(r.brand) ?? 0) >= MIN_BRAND_PRODUCTS) {
      emittedBrands.add(r.brand);
      const maxBrand = branded
        .filter((b) => b.brand === r.brand)
        .reduce<Date | null>((max, b) => (max && b.maxUpdatedAt && max > b.maxUpdatedAt ? max : (b.maxUpdatedAt ?? max)), null);
      entries.push(
        entry(`/products?${productFiltersQuery({ brands: [r.brand] })}`, 0.8, "weekly", maxBrand)
      );
    }
  }
  return entries;
}

/** products-N.xml: карточки продуктов (стабильный порядок — по id), lastmod —
 *  updatedAt из БД. Выборка тем же условием индексации, что и indexableProductCount(). */
export async function productEntries(id: number): Promise<SitemapEntry[]> {
  const products = await prisma.$queryRawUnsafe<Array<{ slug: string; updatedAt: Date }>>(
    `SELECT "slug", "updatedAt" FROM "Product"
${INDEXABLE_PRODUCT_WHERE}
  ORDER BY "id" ASC
  LIMIT ${PRODUCT_CHUNK} OFFSET ${(id - 1) * PRODUCT_CHUNK}`
  );
  return products.map((p) => entry(`/products/${p.slug}`, 0.8, "monthly", p.updatedAt));
}

/** Содержимое старого файла 0.xml (статика + ингредиенты + фильтры одним
 *  файлом) — чтобы уже загруженный в Вебмастер индекс не получал 404. */
export async function legacyStaticEntries(): Promise<SitemapEntry[]> {
  const [staticE, ingredients, filters] = await Promise.all([
    staticEntries(),
    ingredientEntries().catch(() => [] as SitemapEntry[]),
    filterEntries().catch(() => [] as SitemapEntry[]),
  ]);
  return [...staticE, ...ingredients, ...filters];
}

export function toUrlSetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(e.url)}</loc>\n    <lastmod>${e.lastModified}</lastmod>\n` +
        `    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function toSitemapIndexXml(urls: string[]): string {
  const body = urls.map((u) => `  <sitemap>\n    <loc>${escapeXml(u)}</loc>\n  </sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}
