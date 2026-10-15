import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/seo/site";
import { sitemapFileCount, toSitemapIndexXml } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

/** Индекс sitemap: перечисляет файлы /sitemap/0.xml (статика и посадочные)
 *  и /sitemap/1.xml…N.xml (продукты пачками по 40 000). */
export async function GET() {
  const files = await sitemapFileCount().catch(() => 1);
  const urls = Array.from({ length: files }, (_, i) => absoluteUrl(`/sitemap/${i}.xml`));
  return new NextResponse(toSitemapIndexXml(urls), {
    headers: { "Content-Type": "application/xml" },
  });
}
