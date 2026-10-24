import { prisma } from "@/lib/prisma";
import { ingredientFiltersQuery } from "@/lib/ingredients/catalog-filters";
import { displayBrand } from "@/lib/products/brand";
import { productFiltersQuery } from "@/lib/products/catalog-filters";
import { CATEGORY_PLURAL } from "@/lib/seo/ingredient-categories";
import { LANDINGS } from "@/lib/seo/landings";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Данные для sitemap: файл 0 — статика, ингредиенты и посадочные фильтры;
 * файлы 1…N — карточки продуктов пачками по PRODUCT_CHUNK. Продукты разбиты
 * на файлы, потому что суммарно URL больше лимита протокола (50 000 на файл).
 * Роуты (/sitemap.xml, /sitemap/[id]) динамические: на сборке (docker build
 * на VPS, GitHub Action) БД недоступна — обращения к ней только в рантайме.
 */

export const PRODUCT_CHUNK = 40000;

export interface SitemapEntry {
  url: string;
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

/** Число файлов sitemap по числу индексируемых продуктов: id 0 (статика) + пачки. */
export function sitemapFileCountForProducts(indexableCount: number): number {
  return 1 + Math.ceil(indexableCount / PRODUCT_CHUNK);
}

/** Число файлов sitemap: id 0 (статика) + пачки продуктов. */
export async function sitemapFileCount(): Promise<number> {
  const count = await indexableProductCount().catch(() => 0);
  return sitemapFileCountForProducts(count);
}

/** URL в sitemap.xml не экранируются фреймворком: «&» в посадочных ломает XML. */
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function entry(path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"]): SitemapEntry {
  return {
    url: escapeXml(absoluteUrl(path)),
    lastModified: new Date().toISOString(),
    changeFrequency,
    priority,
  };
}

/** Файл 0: главная, посадочные «состав …», каталоги, индексируемые посадочные
 *  фильтров (категория ингредиентов, бренд, категория продуктов, бренд + категория)
 *  и все страницы ингредиентов. */
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
    const [ingredients, ingredientCategories, productPairs] = await Promise.all([
      prisma.ingredient.findMany({ select: { slug: true } }),
      prisma.ingredient.findMany({ select: { category: true }, distinct: ["category"] }),
      prisma.product.groupBy({ by: ["brand", "category"], where: { hidden: false } }),
    ]);
    // «Без бренда» — заглушка INCIDB, не бренд: посадочных под неё нет
    const brandedPairs = productPairs.filter((p) => displayBrand(p.brand) !== null);
    const brands = [...new Set(brandedPairs.map((p) => p.brand))];
    const productCategories = [...new Set(productPairs.map((p) => p.category))];

    entries.push(
      ...ingredientCategories
        .filter((c) => CATEGORY_PLURAL[c.category])
        .map((c) =>
          entry(`/ingredients?${ingredientFiltersQuery({ categories: [c.category] })}`, 0.8, "weekly")
        ),
      ...brands.map((b) => entry(`/products?${productFiltersQuery({ brands: [b] })}`, 0.8, "weekly")),
      ...productCategories.map((c) =>
        entry(`/products?${productFiltersQuery({ categories: [c] })}`, 0.7, "weekly")
      ),
      ...productPairs.filter((p) => displayBrand(p.brand) !== null).map((p) =>
        entry(`/products?${productFiltersQuery({ brands: [p.brand], categories: [p.category] })}`, 0.6, "weekly")
      ),
      ...ingredients.map((i) => entry(`/ingredients/${i.slug}`, 0.8, "monthly")),
    );
  } catch {
    // БД недоступна — отдаём хотя бы статические страницы.
  }

  return entries;
}

/** Файлы 1…N: карточки продуктов (стабильный порядок — по id). Выборка в БД
 *  тем же условием индексации, что и indexableProductCount(), — иначе при
 *  > PRODUCT_CHUNK не скрытых продуктов хвост каталога потерялся бы. */
export async function productEntries(id: number): Promise<SitemapEntry[]> {
  const products = await prisma.$queryRawUnsafe<Array<{ slug: string }>>(
    `SELECT "slug" FROM "Product"
${INDEXABLE_PRODUCT_WHERE}
  ORDER BY "id" ASC
  LIMIT ${PRODUCT_CHUNK} OFFSET ${(id - 1) * PRODUCT_CHUNK}`
  );
  return products.map((p) => entry(`/products/${p.slug}`, 0.8, "monthly"));
}

export function toUrlSetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastModified}</lastmod>\n` +
        `    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function toSitemapIndexXml(urls: string[]): string {
  const body = urls.map((u) => `  <sitemap>\n    <loc>${escapeXml(u)}</loc>\n  </sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}
