import { NextResponse } from "next/server";

import { listIngredients } from "@/lib/mobile/catalog";

export const dynamic = "force-dynamic";

/** GET /api/mobile/ingredients?q=&category=&evidence=&flag=&cursor=&limit= */
export async function GET(request: Request) {
  return NextResponse.json(await listIngredients(new URL(request.url).searchParams));
}
