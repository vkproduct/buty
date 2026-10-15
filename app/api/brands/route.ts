import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

/**
 * Поиск брендов для панели фильтров каталога: подстрока без учёта регистра,
 * до MAX_RESULTS брендов по убыванию числа продуктов. Без q — топ брендов.
 * Панель по умолчанию показывает только топ-50, остальное находится через этот роут.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length === 0) return NextResponse.json({ brands: [] });

  const rows = await prisma.product.groupBy({
    by: ["brand"],
    where: {
      hidden: false,
      brand: { contains: q, mode: "insensitive" },
    },
    _count: { _all: true },
  });
  const brands = rows
    .map((r) => ({ brand: r.brand, count: r._count._all }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand, "ru"))
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ brands }, { headers: { "Cache-Control": "public, max-age=300" } });
}
