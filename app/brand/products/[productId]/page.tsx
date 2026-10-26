import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  brandIsPaid,
  productBelongsToBrand,
  requireBrandAccess,
} from "@/lib/brands/access";
import { brandContactEmail } from "@/lib/brands/contact";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";
import { ProductLinksForm } from "./links-form";

export const dynamic = "force-dynamic";

/** Подпись статуса проверки ссылки. */
function checkStatus(link: { broken: boolean; lastStatus: number | null; lastCheckedAt: Date | null }): string {
  if (link.broken) return "Не открывается (404) — скрыта с сайта";
  if (link.lastCheckedAt) return "Работает";
  return "Ещё не проверялась";
}

/** /brand/products/[productId] — ссылки на покупку средства (до 3). */
export default async function BrandProductLinksPage({
  params,
  searchParams,
}: {
  params: { productId: string };
  searchParams?: { brand?: string };
}) {
  const { brand } = await requireBrandAccess(searchParams?.brand);
  const product = await prisma.product.findUnique({ where: { id: params.productId } });
  if (!product || !productBelongsToBrand(product, brand)) notFound();

  const links = await prisma.productLink.findMany({
    where: { productId: product.id, brandId: brand.id },
    orderBy: { position: "asc" },
  });

  const paid = brandIsPaid(brand);
  const backHref = `/brand/products${searchParams?.brand ? `?brand=${searchParams.brand}` : ""}`;

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-3 p-6">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Все средства
        </Link>
        <h2 className="font-display text-xl font-bold">
          {product.brand} {product.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Ссылки на покупку (до 3): официальный сайт бренда или магазин из списка. Ссылки
          появляются на карточке средства вместо кнопки «Где купить» и никак не влияют на
          разбор состава.
        </p>
        {!paid && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Тариф не оплачен — ссылки не сохраняются и не показываются на сайте. Напишите
            нам:{" "}
            <a href={`mailto:${brandContactEmail()}`} className="font-semibold underline">
              {brandContactEmail()}
            </a>
          </p>
        )}
      </GlassCard>

      <ProductLinksForm
        productId={product.id}
        brandSlug={brand.slug}
        paid={paid}
        initialLinks={links.map((l) => ({
          id: l.id,
          url: l.url,
          addUtm: l.addUtm,
          active: l.active,
          status: checkStatus(l),
          checkedAt: l.lastCheckedAt,
          store: l.store,
        }))}
      />
    </div>
  );
}
