import { NextResponse } from "next/server";

import { getProductCard } from "@/lib/mobile/catalog";
import { jsonError } from "@/lib/mobile/http";

export const dynamic = "force-dynamic";

/** GET /api/mobile/products/[slug] — карточка продукта с разбором состава. */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const card = await getProductCard(params.slug);
  if (!card) return jsonError("Продукт не найден", 404);
  return NextResponse.json(card);
}
