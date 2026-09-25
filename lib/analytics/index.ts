import { prisma } from "@/lib/prisma";

/** Агрегаты для брендов: разобранные составы, клики «Где купить», словарь. */

export interface ProductAnalysisStat {
  productId: string;
  brand: string;
  name: string;
  slug: string;
  ingredientCount: number; // сколько ингредиентов разобрано в составе
}

export interface ProductClickStat {
  productId: string;
  brand: string;
  name: string;
  slug: string;
  clicks: number;
}

export interface UnknownTokenStat {
  token: string;
  count: number;
}

/** Разборы состава по продуктам: число распознанных ингредиентов на продукт. */
export async function getProductAnalysisStats(): Promise<ProductAnalysisStat[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      brand: true,
      name: true,
      slug: true,
      _count: { select: { ingredients: true } },
    },
    orderBy: { brand: "asc" },
  });
  return products.map((p) => ({
    productId: p.id,
    brand: p.brand,
    name: p.name,
    slug: p.slug,
    ingredientCount: p._count.ingredients,
  }));
}

/** Клики по партнёрским ссылкам /go/ в разрезе продуктов (по убыванию). */
export async function getProductClickStats(): Promise<ProductClickStat[]> {
  const grouped = await prisma.partnerClick.groupBy({
    by: ["productId"],
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
  });
  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, brand: true, name: true, slug: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return grouped.flatMap((g) => {
    const p = byId.get(g.productId);
    return p
      ? [
          {
            productId: p.id,
            brand: p.brand,
            name: p.name,
            slug: p.slug,
            clicks: g._count._all,
          },
        ]
      : [];
  });
}

/** Топ нераспознанных токенов из Feedback — приоритет расширения словаря. */
export async function getTopUnknownTokens(
  limit = 20,
): Promise<UnknownTokenStat[]> {
  const grouped = await prisma.feedback.groupBy({
    by: ["rawToken"],
    _count: { _all: true },
    orderBy: { _count: { rawToken: "desc" } },
    take: limit,
  });
  return grouped.map((g) => ({ token: g.rawToken, count: g._count._all }));
}
