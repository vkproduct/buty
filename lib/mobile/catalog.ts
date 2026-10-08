/**
 * Каталоги для мобильного приложения: ингредиенты и продукты (JSON, постранично).
 * Отдельно от SEO-страниц: приложению не нужны canonical/индексация, нужны лёгкие списки.
 */
import type { EvidenceLevel, Prisma } from "@prisma/client";

import { analyzeMatched } from "@/lib/analysis/analyze";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo/site";

export const PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 60;
const EVIDENCE: EvidenceLevel[] = ["STRONG", "MODERATE", "LIMITED", "ANECDOTAL"];
const FLAGS = ["comedogenic", "feedsMalassezia", "fragranceAllergen"] as const;

/** Разбор пагинации: cursor — смещение (строка-число), limit — размер страницы. */
export function parsePage(params: URLSearchParams): { skip: number; take: number } {
  const skip = Math.max(0, Number.parseInt(params.get("cursor") ?? "0", 10) || 0);
  const take = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(params.get("limit") ?? String(PAGE_SIZE), 10) || PAGE_SIZE),
  );
  return { skip, take };
}

/** Следующий курсор или null, если страница последняя. */
export function nextCursor(skip: number, take: number, received: number): string | null {
  return received > take ? String(skip + take) : null;
}

function cleanList(params: URLSearchParams, key: string): string[] {
  return [...new Set(params.getAll(key).map((v) => v.trim()).filter(Boolean))].slice(0, 30);
}

const ingredientListSelect = {
  slug: true,
  inciName: true,
  displayName: true,
  category: true,
  evidenceLevel: true,
  typicalConc: true,
  comedogenic: true,
  feedsMalassezia: true,
  fragranceAllergen: true,
} satisfies Prisma.IngredientSelect;

/** Список ингредиентов с поиском (русское, INCI, синонимы) и фильтрами. */
export async function listIngredients(params: URLSearchParams) {
  const { skip, take } = parsePage(params);
  const q = params.get("q")?.trim().slice(0, 100) ?? "";
  const categories = cleanList(params, "category");
  const evidence = cleanList(params, "evidence").filter((e): e is EvidenceLevel =>
    EVIDENCE.includes(e as EvidenceLevel),
  );
  const flags = cleanList(params, "flag").filter((f): f is (typeof FLAGS)[number] =>
    (FLAGS as readonly string[]).includes(f),
  );

  const where: Prisma.IngredientWhereInput = {
    ...(categories.length ? { category: { in: categories } } : {}),
    ...(evidence.length ? { evidenceLevel: { in: evidence } } : {}),
    ...(flags.length ? { AND: flags.map((f) => ({ [f]: true })) } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { inciName: { contains: q, mode: "insensitive" } },
            { synonyms: { some: { alias: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.ingredient.findMany({
    where,
    select: ingredientListSelect,
    orderBy: { displayName: "asc" },
    skip,
    take: take + 1,
  });
  const result: {
    items: typeof rows;
    nextCursor: string | null;
    total?: number;
    categories?: { id: string; count: number }[];
  } = { items: rows.slice(0, take), nextCursor: nextCursor(skip, take, rows.length) };

  if (skip === 0) {
    const [total, groups] = await Promise.all([
      prisma.ingredient.count({ where }),
      prisma.ingredient.groupBy({ by: ["category"], _count: { _all: true } }),
    ]);
    result.total = total;
    result.categories = groups
      .map((g) => ({ id: g.category, count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  }
  return result;
}

/** Карточка ингредиента: описание, синонимы, конфликты, средства с ним. */
export async function getIngredientCard(slug: string) {
  const ing = await prisma.ingredient.findUnique({
    where: { slug },
    include: {
      synonyms: { select: { alias: true } },
      conflictsFrom: { include: { ingredientB: { select: { slug: true, displayName: true } } } },
      conflictsTo: { include: { ingredientA: { select: { slug: true, displayName: true } } } },
      products: {
        where: { product: { hidden: false } },
        include: { product: { select: { slug: true, brand: true, name: true, category: true } } },
        orderBy: { position: "asc" },
        take: 10,
      },
    },
  });
  if (!ing) return null;

  const seen = new Set([ing.inciName.toLowerCase(), ing.displayName.toLowerCase()]);
  const otherNames = ing.synonyms
    .map((s) => s.alias.trim())
    .filter((a) => {
      const key = a.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);

  return {
    slug: ing.slug,
    inciName: ing.inciName,
    displayName: ing.displayName,
    category: ing.category,
    function: ing.function,
    evidenceLevel: ing.evidenceLevel,
    typicalConc: ing.typicalConc,
    description: ing.description,
    howItWorks: ing.howItWorks,
    combinations: ing.combinations,
    risks: ing.risks,
    safetyNotes: ing.safetyNotes,
    comedogenic: ing.comedogenic,
    feedsMalassezia: ing.feedsMalassezia,
    fragranceAllergen: ing.fragranceAllergen,
    otherNames,
    conflicts: [
      ...ing.conflictsFrom.map((c) => ({ ...c.ingredientB, severity: c.severity, reason: c.reason })),
      ...ing.conflictsTo.map((c) => ({ ...c.ingredientA, severity: c.severity, reason: c.reason })),
    ],
    products: ing.products.map((p) => p.product),
    webUrl: absoluteUrl(`/ingredients/${ing.slug}`),
  };
}

/** Список продуктов с поиском и фильтрами по брендам и категориям. */
export async function listProducts(params: URLSearchParams) {
  const { skip, take } = parsePage(params);
  const q = params.get("q")?.trim().slice(0, 100) ?? "";
  const brands = cleanList(params, "brand");
  const categories = cleanList(params, "category");

  const where: Prisma.ProductWhereInput = {
    hidden: false,
    ...(brands.length ? { brand: { in: brands } } : {}),
    ...(categories.length ? { category: { in: categories } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.product.findMany({
    where,
    select: {
      id: true,
      slug: true,
      brand: true,
      name: true,
      category: true,
      _count: { select: { ingredients: true } },
    },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    skip,
    take: take + 1,
  });
  const items = rows.slice(0, take).map(({ _count, ...p }) => ({
    ...p,
    ingredientsCount: _count.ingredients,
  }));
  const result: {
    items: typeof items;
    nextCursor: string | null;
    total?: number;
    categories?: { id: string; count: number }[];
    brands?: { name: string; count: number }[];
  } = { items, nextCursor: nextCursor(skip, take, rows.length) };

  if (skip === 0) {
    const [total, byCategory, byBrand] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.groupBy({ by: ["category"], where: { hidden: false }, _count: { _all: true } }),
      prisma.product.groupBy({ by: ["brand"], where: { hidden: false }, _count: { _all: true } }),
    ]);
    result.total = total;
    result.categories = byCategory
      .map((g) => ({ id: g.category, count: g._count._all }))
      .sort((a, b) => b.count - a.count);
    result.brands = byBrand
      .map((g) => ({ name: g.brand, count: g._count._all }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }
  return result;
}

/** Карточка продукта: состав с полным разбором (как у текстового разбора). */
export async function getProductCard(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      ingredients: {
        include: { ingredient: { select: { id: true, inciName: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!product) return null;

  const matched = product.ingredients.map((pi) => ({
    id: pi.ingredient.id,
    matchedVia: pi.ingredient.inciName,
  }));
  const total = Math.max(product.ingredientsTotal, matched.length);
  const analysis = await analyzeMatched(matched, [], total);
  const coverage = product.ingredientsTotal > 0
    ? product.ingredientsRecognized / product.ingredientsTotal
    : 1;

  return {
    id: product.id,
    slug: product.slug,
    brand: product.brand,
    name: product.name,
    category: product.category,
    rawIngredients: product.rawIngredients,
    coverage,
    analysis,
    buyUrl: absoluteUrl(`/go/${product.id}?source=app`),
    webUrl: absoluteUrl(`/products/${product.slug}`),
  };
}
