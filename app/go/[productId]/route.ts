import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { brandIsPaid } from "@/lib/brands/access";
import { withUtm } from "@/lib/brands/links";
import { prisma } from "@/lib/prisma";
import { wbSearchUrl } from "@/lib/seo/labels";

export const dynamic = "force-dynamic";

/**
 * GET /go/[productId] — партнёрский редирект: пишет PartnerClick и ведёт
 * на ссылку бренда (если она есть и бренд оплачен) или на partnerUrl
 * продукта (fallback — поиск на Wildberries).
 *
 * ?link=<id>: редирект строго на ссылку этого же продукта (active && !broken).
 * Чужой link (от другого продукта) игнорируем — открытого редиректа нет.
 */
export async function GET(
  request: Request,
  { params }: { params: { productId: string } },
) {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: { id: true, slug: true, brand: true, name: true, partnerUrl: true },
  });
  if (!product) {
    return new Response("Продукт не найден", { status: 404 });
  }

  const linkId = new URL(request.url).searchParams.get("link");
  let link: { id: string; url: string; addUtm: boolean; store: string } | null = null;

  if (linkId) {
    // Пункты 1 и 5: ссылка этого продукта, активная, не битая, бренд оплачен.
    const found = await prisma.productLink.findFirst({
      where: { id: linkId, productId: product.id, active: true, broken: false },
      include: { brand: true },
    });
    if (found && brandIsPaid(found.brand)) {
      link = found;
    }
  }

  if (!link) {
    // Пункт 2: первая видимая ссылка продукта (по position), если бренд оплачен.
    const candidates = await prisma.productLink.findMany({
      where: { productId: product.id, active: true, broken: false },
      include: { brand: true },
      orderBy: { position: "asc" },
      take: 3,
    });
    link = candidates.find((c) => brandIsPaid(c.brand)) ?? null;
  }

  const session = await getSession();
  const source = new URL(request.url).searchParams.get("source") ?? "direct";
  await prisma.partnerClick.create({
    data: {
      userId: session?.user?.id ?? null,
      productId: product.id,
      source,
      linkId: link?.id ?? null,
      store: link?.store ?? null,
    },
  });

  if (link) {
    redirect(link.addUtm ? withUtm(link.url, product.slug) : link.url);
  }
  redirect(product.partnerUrl ?? wbSearchUrl(product.brand, product.name));
}
