import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 10;

/** GET /api/products/search?q= — поиск продуктов по бренду/названию (для добавления на полку). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ products: [] });
  }
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, brand: true, name: true, category: true, slug: true },
    take: MAX_RESULTS,
    orderBy: { brand: "asc" },
  });
  return NextResponse.json({ products });
}
