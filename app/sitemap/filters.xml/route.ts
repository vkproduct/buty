import { NextResponse } from "next/server";

import { filterEntries, toUrlSetXml } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

/** /sitemap/filters.xml — индексируемые фильтр-страницы каталога продуктов
 *  (бренд ≥ 5 продуктов, бренд+категория ≥ 8, «только категория» без порога). */
export async function GET() {
  return new NextResponse(toUrlSetXml(await filterEntries()), {
    headers: { "Content-Type": "application/xml" },
  });
}
