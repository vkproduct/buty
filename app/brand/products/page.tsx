import Link from "next/link";

import {
  brandIsPaid,
  brandProductsWhere,
  requireBrandAccess,
} from "@/lib/brands/access";
import { brandContactEmail } from "@/lib/brands/contact";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/** /brand/products — средства бренда: ссылки, статусы, просмотры за 30 дней. */
export default async function BrandProductsPage({
  searchParams,
}: {
  searchParams?: { brand?: string; q?: string; page?: string; links?: string };
}) {
  const { brand } = await requireBrandAccess(searchParams?.brand);
  const paid = brandIsPaid(brand);
  const q = (searchParams?.q ?? "").trim().slice(0, 100);
  const onlyWithLinks = searchParams?.links === "1";
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);

  const where = {
    ...brandProductsWhere(brand),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { brand: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: { id: true, slug: true, brand: true, name: true },
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const productIds = products.map((p) => p.id);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [links, viewsAgg] = await Promise.all([
    productIds.length
      ? prisma.productLink.findMany({
          where: { productId: { in: productIds } },
          select: { productId: true, active: true, broken: true },
        })
      : Promise.resolve([]),
    productIds.length
      ? prisma.productDailyStat.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds }, day: { gte: since } },
          _sum: { views: true },
        })
      : Promise.resolve([]),
  ]);
  const linksByProduct = new Map<string, { total: number; active: number; broken: number }>();
  for (const l of links) {
    const entry = linksByProduct.get(l.productId) ?? { total: 0, active: 0, broken: 0 };
    entry.total += 1;
    if (l.active) entry.active += 1;
    if (l.broken) entry.broken += 1;
    linksByProduct.set(l.productId, entry);
  }
  const viewsByProduct = new Map(viewsAgg.map((v) => [v.productId, v._sum.views ?? 0]));

  const filtered = onlyWithLinks
    ? products.filter((p) => (linksByProduct.get(p.id)?.total ?? 0) > 0)
    : products;

  const brandParam = searchParams?.brand ? `&brand=${searchParams.brand}` : "";

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-4 p-6">
        <div className="flex flex-wrap items-end gap-3">
          <form method="GET" className="flex flex-1 flex-wrap items-center gap-2">
            {searchParams?.brand && <input type="hidden" name="brand" value={searchParams.brand} />}
            <Input
              name="q"
              defaultValue={q}
              placeholder="Поиск по названию"
              className="max-w-xs"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="links" value="1" defaultChecked={onlyWithLinks} />
              Только со ссылками
            </label>
            <Button type="submit" size="sm">
              Найти
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            {onlyWithLinks ? `${filtered.length} из ${total}` : total} средств
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {q || onlyWithLinks
              ? "Ничего не найдено — измените поиск или снимите фильтр."
              : "Средств вашего бренда пока нет в каталоге."}{" "}
            Нет нужного средства или ошибка в составе? Пришлите фото упаковки на{" "}
            <a href={`mailto:${brandContactEmail()}`} className="text-brand underline">
              {brandContactEmail()}
            </a>
            .
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">Средство</th>
                <th className="py-1 text-right font-medium">Ссылки</th>
                <th className="py-1 text-right font-medium">Просмотры, 30 дн.</th>
                <th className="py-1 text-right font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const stats = linksByProduct.get(p.id);
                const status = !stats || stats.active === 0
                  ? "Нет ссылок"
                  : !paid
                    ? "Скрыты: тариф не оплачен"
                    : stats.broken > 0
                      ? "Есть битые"
                      : "Показываются";
                return (
                  <tr key={p.id} className="border-t border-ink-hair">
                    <td className="max-w-64 truncate py-2">
                      <Link
                        href={`/products/${p.slug}`}
                        target="_blank"
                        className="text-brand hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">{p.brand}</span>
                    </td>
                    <td className="py-2 text-right">{stats?.total ?? 0}</td>
                    <td className="py-2 text-right">{viewsByProduct.get(p.id) ?? 0}</td>
                    <td className="py-2 text-right">
                      <Badge
                        variant={
                          status === "Показываются"
                            ? "success"
                            : status === "Есть битые"
                              ? "coral"
                              : "outline"
                        }
                      >
                        {status}
                      </Badge>{" "}
                      <Link
                        href={`/brand/products/${p.id}${brandParam ? `?${brandParam.slice(1)}` : ""}`}
                        className="text-brand hover:underline"
                      >
                        править
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {total > PAGE_SIZE && (
          <div className="flex gap-2 text-sm">
            {page > 1 && (
              <Link
                href={`/brand/products?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${onlyWithLinks ? "&links=1" : ""}${brandParam}`}
                className="rounded-full bg-white px-3 py-1 text-brand hover:shadow-glass"
              >
                ← Назад
              </Link>
            )}
            {page * PAGE_SIZE < total && (
              <Link
                href={`/brand/products?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${onlyWithLinks ? "&links=1" : ""}${brandParam}`}
                className="rounded-full bg-white px-3 py-1 text-brand hover:shadow-glass"
              >
                Дальше →
              </Link>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
