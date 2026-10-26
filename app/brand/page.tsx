import Link from "next/link";

import {
  brandIsPaid,
  brandProductsWhere,
  effectiveProductLimit,
  requireBrandAccess,
} from "@/lib/brands/access";
import { brandContactEmail } from "@/lib/brands/contact";
import { STORES } from "@/lib/brands/links";
import { BRAND_STATS_SINCE, tariffById } from "@/lib/brands/tariffs";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";

export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90] as const;

function fmtDate(d: Date): string {
  return d.toLocaleDateString("ru-RU");
}

/** /brand — обзор: просмотры, переходы, конверсия, топ средств. */
export default async function BrandOverviewPage({
  searchParams,
}: {
  searchParams?: { brand?: string; days?: string };
}) {
  const { brand } = await requireBrandAccess(searchParams?.brand);
  const days = (PERIODS as readonly number[]).includes(Number(searchParams?.days))
    ? Number(searchParams?.days)
    : 30;
  const since = new Date(Date.now() - days * 86_400_000);
  const paid = brandIsPaid(brand);
  const tariff = tariffById(brand.tariff);

  const products = await prisma.product.findMany({
    where: brandProductsWhere(brand),
    select: { id: true, slug: true, brand: true, name: true },
  });
  const productIds = products.map((p) => p.id);
  const productById = new Map(products.map((p) => [p.id, p]));

  const [viewsAgg, clicksCount, clicksByStore, productsWithLinks] = await Promise.all([
    productIds.length
      ? prisma.productDailyStat.aggregate({
          where: { productId: { in: productIds }, day: { gte: since } },
          _sum: { views: true },
        })
      : Promise.resolve({ _sum: { views: null } }),
    prisma.partnerClick.count({
      where: { link: { brandId: brand.id }, createdAt: { gte: since } },
    }),
    prisma.partnerClick.groupBy({
      by: ["store"],
      where: { link: { brandId: brand.id }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.productLink.findMany({
      where: { brandId: brand.id, active: true },
      select: { productId: true },
      distinct: ["productId"],
    }),
  ]);

  const views = viewsAgg._sum.views ?? 0;
  const conversion = views > 0 ? `${((clicksCount / views) * 100).toFixed(1)}%` : "—";
  const limit = effectiveProductLimit(brand);
  const linksCount = productsWithLinks.length;

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-bold">{brand.name}</h2>
          {tariff && <Badge variant="outline">{tariff.name}</Badge>}
        </div>
        {paid ? (
          <p className="text-sm text-muted-foreground">
            Оплачено до {fmtDate(brand.paidUntil!)}
          </p>
        ) : (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Тариф не оплачен — ссылки не показываются на сайте. Напишите нам:{" "}
            <a href={`mailto:${brandContactEmail()}`} className="font-semibold underline">
              {brandContactEmail()}
            </a>
          </p>
        )}
        {brand.tariff !== "free" && (
          <p className="text-sm text-muted-foreground">
            Средств со ссылками: {linksCount}
            {limit !== null ? ` из ${limit}` : ""}
          </p>
        )}
      </GlassCard>

      {brand.tariff === "free" ? (
        <GlassCard className="space-y-3 p-6">
          <StatTile label="Просмотры карточек" value={String(views)} />
          <p className="text-sm text-muted-foreground">
            Ссылки на покупку — с тарифа{" "}
            <Link href="/for-brands#tarify" className="font-semibold text-brand hover:underline">
              Базовый
            </Link>
            .
          </p>
        </GlassCard>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/brand?days=${p}${searchParams?.brand ? `&brand=${searchParams.brand}` : ""}`}
                className={
                  p === days
                    ? "rounded-full bg-brand px-3 py-1 font-semibold text-white"
                    : "rounded-full bg-white px-3 py-1 text-brand transition-shadow hover:shadow-glass"
                }
              >
                {p} дней
              </Link>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <GlassCard className="p-6">
              <StatTile label="Просмотры карточек" value={String(views)} />
            </GlassCard>
            <GlassCard className="p-6">
              <StatTile label="Переходы по ссылкам" value={String(clicksCount)} />
            </GlassCard>
            <GlassCard className="p-6">
              <StatTile label="Конверсия в переход" value={conversion} />
            </GlassCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="space-y-3 p-6">
              <h3 className="font-display text-lg font-semibold">Переходы по магазинам</h3>
              {clicksByStore.length === 0 ? (
                <p className="text-sm text-muted-foreground">Переходов пока нет.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {clicksByStore
                      .sort((a, b) => b._count._all - a._count._all)
                      .map((row) => (
                        <tr key={row.store ?? "old"} className="border-t border-ink-hair">
                          <td className="py-2">
                            {row.store ? (STORES[row.store]?.label ?? row.store) : "Старая кнопка «Где купить»"}
                          </td>
                          <td className="py-2 text-right font-semibold">{row._count._all}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </GlassCard>

            <TopProductsCard
              productIds={productIds}
              since={since}
              productById={productById}
            />
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Статистика собирается с {BRAND_STATS_SINCE}.
      </p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

async function TopProductsCard({
  productIds,
  since,
  productById,
}: {
  productIds: string[];
  since: Date;
  productById: Map<string, { id: string; slug: string; brand: string; name: string }>;
}) {
  const [viewsByProduct, clicksByProduct] = await Promise.all([
    productIds.length
      ? prisma.productDailyStat.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds }, day: { gte: since } },
          _sum: { views: true },
        })
      : Promise.resolve([]),
    prisma.partnerClick.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const clicksMap = new Map(clicksByProduct.map((c) => [c.productId, c._count._all]));
  const rows = viewsByProduct
    .map((v) => {
      const product = productById.get(v.productId);
      const views = v._sum.views ?? 0;
      const clicks = clicksMap.get(v.productId) ?? 0;
      return {
        product,
        views,
        clicks,
        conversion: views > 0 ? `${((clicks / views) * 100).toFixed(1)}%` : "—",
      };
    })
    .filter((r) => r.product)
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  return (
    <GlassCard className="space-y-3 p-6">
      <h3 className="font-display text-lg font-semibold">Топ средств</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Просмотров пока нет.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Средство</th>
              <th className="py-1 text-right font-medium">Просмотры</th>
              <th className="py-1 text-right font-medium">Переходы</th>
              <th className="py-1 text-right font-medium">Конверсия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product!.id} className="border-t border-ink-hair">
                <td className="max-w-56 truncate py-2">
                  <Link
                    href={`/products/${r.product!.slug}`}
                    className="text-brand hover:underline"
                  >
                    {r.product!.name}
                  </Link>
                </td>
                <td className="py-2 text-right">{r.views}</td>
                <td className="py-2 text-right">{r.clicks}</td>
                <td className="py-2 text-right">{r.conversion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </GlassCard>
  );
}
