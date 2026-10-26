import Link from "next/link";

import { brandIsPaid, effectiveProductLimit } from "@/lib/brands/access";
import { tariffById } from "@/lib/brands/tariffs";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export const dynamic = "force-dynamic";

/** /admin/brands — бренды-клиенты: тарифы, оплата, участники, ссылки. */
export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    include: { members: { include: { user: { select: { email: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [activeLinkRows, clicksByBrand] = await Promise.all([
    prisma.productLink.findMany({
      where: { active: true },
      select: { brandId: true, productId: true },
      distinct: ["brandId", "productId"],
    }),
    prisma.partnerClick.groupBy({
      by: ["linkId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const activeProducts = new Map<string, number>();
  for (const row of activeLinkRows) {
    activeProducts.set(row.brandId, (activeProducts.get(row.brandId) ?? 0) + 1);
  }
  const clickByLink = new Map(clicksByBrand.map((c) => [c.linkId, c._count._all]));
  const clickedLinkIds = clicksByBrand
    .map((c) => c.linkId)
    .filter((id): id is string => !!id);
  const allLinks = clickedLinkIds.length
    ? await prisma.productLink.findMany({
        where: { id: { in: clickedLinkIds } },
        select: { id: true, brandId: true },
      })
    : [];
  const clicksByBrandId = new Map<string, number>();
  for (const l of allLinks) {
    clicksByBrandId.set(
      l.brandId,
      (clicksByBrandId.get(l.brandId) ?? 0) + (clickByLink.get(l.id) ?? 0),
    );
  }

  return (
    <GlassCard className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Бренды</h2>
        <Button asChild size="sm">
          <Link href="/admin/brands/new">Добавить бренд</Link>
        </Button>
      </div>

      {brands.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Брендов пока нет — подключаются вручную после договора и счёта.
        </p>
      )}

      {brands.map((brand) => {
        const limit = effectiveProductLimit(brand);
        const paid = brandIsPaid(brand);
        return (
          <div key={brand.id} className="space-y-1 rounded-2xl bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/brands/${brand.id}`}
                className="font-semibold text-brand hover:underline"
              >
                {brand.name}
              </Link>
              <span className="text-muted-foreground">
                {tariffById(brand.tariff)?.name ?? brand.tariff}
              </span>
              <span className={paid ? "text-success-700" : "text-coral-700"}>
                {brand.paidUntil
                  ? `оплачено до ${brand.paidUntil.toLocaleDateString("ru-RU")}`
                  : "не оплачено"}
              </span>
              <span className="ml-auto flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/brand?brand=${brand.slug}`}>Открыть кабинет</Link>
                </Button>
              </span>
            </div>
            <p className="text-muted-foreground">
              Участники:{" "}
              {brand.members.map((m) => m.user.email).join(", ") || "нет"}
              {" · "}Средств со ссылками: {activeProducts.get(brand.id) ?? 0}
              {limit !== null ? ` / ${limit}` : ""}
              {" · "}Переходов за 30 дней: {clicksByBrandId.get(brand.id) ?? 0}
            </p>
          </div>
        );
      })}
    </GlassCard>
  );
}
