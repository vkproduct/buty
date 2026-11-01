import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/seo/site";
import {
  indexableProductCount,
  sitemapFileCountForProducts,
  toSitemapIndexXml,
} from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

/** Индекс sitemap: файлы по типам, чтобы в Вебмастере было видно, что именно
 *  не индексируется: static (посадочные и каталоги), ingredients, filters
 *  (индексируемые фильтр-страницы) и products-N (карточки пачками по 40 000). */
export async function GET() {
  const products = await indexableProductCount().catch(() => 0);
  const urls = [
    absoluteUrl("/sitemap/static.xml"),
    absoluteUrl("/sitemap/ingredients.xml"),
    absoluteUrl("/sitemap/filters.xml"),
    ...Array.from({ length: sitemapFileCountForProducts(products) }, (_, i) =>
      absoluteUrl(`/sitemap/products-${i + 1}.xml`)
    ),
  ];
  return new NextResponse(toSitemapIndexXml(urls), {
    headers: { "Content-Type": "application/xml" },
  });
}
