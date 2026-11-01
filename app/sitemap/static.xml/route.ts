import { NextResponse } from "next/server";

import { staticEntries, toUrlSetXml } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

/** /sitemap/static.xml — главная, посадочные /sostav/*, каталоги, буквы и
 *  категории ингредиентов. */
export async function GET() {
  return new NextResponse(toUrlSetXml(await staticEntries()), {
    headers: { "Content-Type": "application/xml" },
  });
}
