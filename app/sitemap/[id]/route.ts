import { NextResponse } from "next/server";

import { legacyStaticEntries, productEntries, toUrlSetXml } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

/** /sitemap/products-N.xml — карточки продуктов пачками по 40 000.
 *  Старые адреса остаются рабочими: /sitemap/0.xml — бывшее всё-в-одном
 *  содержимое (статика + ингредиенты + фильтры), /sitemap/N.xml (N ≥ 1) —
 *  прежние пачки продуктов. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Сегмент приходит с расширением («products-1.xml»), режем его.
  const name = params.id.replace(/\.xml$/i, "");
  const productMatch = /^products-(\d+)$/.exec(name);
  const legacyNumber = /^\d+$/.test(name) ? Number(name) : null;

  if (productMatch) {
    const n = Number(productMatch[1]);
    if (!Number.isInteger(n) || n < 1) return new NextResponse("Not found", { status: 404 });
    return xml(await productEntries(n));
  }
  if (legacyNumber === 0) {
    return xml(await legacyStaticEntries());
  }
  if (legacyNumber !== null) {
    return xml(await productEntries(legacyNumber));
  }
  return new NextResponse("Not found", { status: 404 });
}

function xml(entries: Awaited<ReturnType<typeof productEntries>>) {
  return new NextResponse(toUrlSetXml(entries), {
    headers: { "Content-Type": "application/xml" },
  });
}
