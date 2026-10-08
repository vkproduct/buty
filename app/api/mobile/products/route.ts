import { NextResponse } from "next/server";

import { listProducts } from "@/lib/mobile/catalog";

export const dynamic = "force-dynamic";

/** GET /api/mobile/products?q=&brand=&category=&cursor=&limit= */
export async function GET(request: Request) {
  return NextResponse.json(await listProducts(new URL(request.url).searchParams));
}
