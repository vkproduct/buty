import { NextResponse } from "next/server";

import { getIngredientCard } from "@/lib/mobile/catalog";
import { jsonError } from "@/lib/mobile/http";

export const dynamic = "force-dynamic";

/** GET /api/mobile/ingredients/[slug] — карточка ингредиента. */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const card = await getIngredientCard(params.slug);
  if (!card) return jsonError("Ингредиент не найден", 404);
  return NextResponse.json(card);
}
