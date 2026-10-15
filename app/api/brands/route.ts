import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

/**
 * Поиск брендов для панели фильтров каталога: подстрока без учёта регистра,
 * до MAX_RESULTS брендов по убыванию числа продуктов. Без q — топ брендов.
 * Панель по умолчанию показывает только топ-50, остальное находится через этот роут.
 * Для каждого бренда возвращаем разбивку по категориям: после выбора такого
 * бренда живые счётчики панели («Показать N», счётчики категорий) считаются
 * по ней — в отданной клиенту матрице facets этого бренда нет.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length === 0) return NextResponse.json({ brands: [] });

  const rows = await prisma.product.groupBy({
    by: ["brand", "category"],
    where: {
      hidden: false,
      brand: { contains: q, mode: "insensitive" },
    },
    _count: { _all: true },
  });

  const byBrand = new Map<string, { brand: string; count: number; categories: Array<{ category: string; count: number }> }>();
  for (const r of rows) {
    let entry = byBrand.get(r.brand);
    if (!entry) {
      entry = { brand: r.brand, count: 0, categories: [] };
      byBrand.set(r.brand, entry);
    }
    entry.count += r._count._all;
    entry.categories.push({ category: r.category, count: r._count._all });
  }
  const brands = [...byBrand.values()]
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand, "ru"))
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ brands }, { headers: { "Cache-Control": "public, max-age=300" } });
}
