import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { ingredientFiltersQuery } from "@/lib/ingredients/catalog-filters";
import { productFiltersQuery } from "@/lib/products/catalog-filters";
import { CATEGORY_PLURAL } from "@/lib/seo/ingredient-categories";
import { LANDINGS } from "@/lib/seo/landings";
import { absoluteUrl } from "@/lib/seo/site";

// Динамический sitemap: без обращения к БД на этапе сборки.
export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

/** Next 14 не экранирует URL в sitemap.xml: «&» в посадочных «бренд + категория» ломает XML. */
function entry(path: string, priority: number, changeFrequency: Entry["changeFrequency"]): Entry {
  return {
    url: absoluteUrl(path).replace(/&/g, "&amp;"),
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

/**
 * Карта сайта: главная, посадочные «состав …», каталоги, индексируемые
 * посадочные фильтров (категория ингредиентов, бренд, категория продуктов,
 * бренд + категория) и все карточки.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: Entry[] = [
    entry("/", 1, "weekly"),
    entry("/analyze", 0.9, "monthly"),
    entry("/sostav", 0.9, "monthly"),
    ...LANDINGS.map((l) => entry(`/sostav/${l.slug}`, 0.9, "monthly")),
    entry("/ingredients", 0.9, "weekly"),
    entry("/products", 0.9, "weekly"),
    entry("/pricing", 0.5, "monthly"),
    entry("/for-brands", 0.4, "monthly"),
  ];

  let dbEntries: Entry[] = [];
  try {
    const [ingredients, products, ingredientCategories, productPairs] = await Promise.all([
      prisma.ingredient.findMany({ select: { slug: true } }),
      prisma.product.findMany({ select: { slug: true } }),
      prisma.ingredient.findMany({ select: { category: true }, distinct: ["category"] }),
      prisma.product.groupBy({ by: ["brand", "category"] }),
    ]);
    const brands = [...new Set(productPairs.map((p) => p.brand))];
    const productCategories = [...new Set(productPairs.map((p) => p.category))];

    dbEntries = [
      ...ingredientCategories
        .filter((c) => CATEGORY_PLURAL[c.category])
        .map((c) =>
          entry(`/ingredients?${ingredientFiltersQuery({ categories: [c.category] })}`, 0.8, "weekly")
        ),
      ...brands.map((b) => entry(`/products?${productFiltersQuery({ brands: [b] })}`, 0.8, "weekly")),
      ...productCategories.map((c) =>
        entry(`/products?${productFiltersQuery({ categories: [c] })}`, 0.7, "weekly")
      ),
      ...productPairs.map((p) =>
        entry(`/products?${productFiltersQuery({ brands: [p.brand], categories: [p.category] })}`, 0.6, "weekly")
      ),
      ...ingredients.map((i) => entry(`/ingredients/${i.slug}`, 0.8, "monthly")),
      ...products.map((p) => entry(`/products/${p.slug}`, 0.8, "monthly")),
    ];
  } catch {
    // БД недоступна — отдаём хотя бы статические страницы.
  }

  return [...staticEntries, ...dbEntries];
}
