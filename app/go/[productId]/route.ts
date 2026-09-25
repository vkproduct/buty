import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { wbSearchUrl } from "@/lib/seo/labels";

export const dynamic = "force-dynamic";

/**
 * GET /go/[productId] — партнёрский редирект: пишет PartnerClick
 * и ведёт на partnerUrl продукта (fallback — поиск на Wildberries).
 */
export async function GET(
  request: Request,
  { params }: { params: { productId: string } },
) {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: { id: true, brand: true, name: true, partnerUrl: true },
  });
  if (!product) {
    return new Response("Продукт не найден", { status: 404 });
  }

  const session = await getSession();
  const source = new URL(request.url).searchParams.get("source") ?? "direct";
  await prisma.partnerClick.create({
    data: {
      userId: session?.user?.id ?? null,
      productId: product.id,
      source,
    },
  });

  redirect(product.partnerUrl ?? wbSearchUrl(product.brand, product.name));
}
