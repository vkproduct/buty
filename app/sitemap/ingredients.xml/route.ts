import { NextResponse } from "next/server";

import { ingredientEntries, toUrlSetXml } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

/** /sitemap/ingredients.xml — карточки ингредиентов. */
export async function GET() {
  return new NextResponse(toUrlSetXml(await ingredientEntries()), {
    headers: { "Content-Type": "application/xml" },
  });
}
