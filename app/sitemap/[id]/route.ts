import { NextResponse } from "next/server";

import { productEntries, staticEntries, toUrlSetXml } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

/** Файл 0 — статика, ингредиенты и посадочные; файлы 1…N — карточки продуктов. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Сегмент приходит с расширением («0.xml»), режем его.
  const id = Number(params.id.replace(/\.xml$/i, ""));
  if (!Number.isInteger(id) || id < 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const entries = id === 0 ? await staticEntries() : await productEntries(id);
  return new NextResponse(toUrlSetXml(entries), {
    headers: { "Content-Type": "application/xml" },
  });
}
