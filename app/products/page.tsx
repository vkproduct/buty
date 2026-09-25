import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PRODUCT_CATEGORY_LABEL } from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

export const metadata: Metadata = {
  title: "Каталог продуктов с разбором состава",
  description:
    "Разобранные составы популярных средств: сыворотки, кремы, SPF. Функции ингредиентов, конфликты активов и уровень доказательности каждой формулы.",
  alternates: { canonical: "/products" },
};

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: { brand?: string };
}) {
  const brands = await prisma.product.findMany({
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  const products = await prisma.product.findMany({
    where: { brand: searchParams.brand || undefined },
    include: { _count: { select: { ingredients: true } } },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <Container className="space-y-8">
        <header className="max-w-3xl space-y-4">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Каталог продуктов
          </h1>
          <p className="text-muted-foreground">
            Каждый продукт здесь разобран по составу: ингредиенты перечислены в
            порядке INCI-списка, для каждого указаны функция и уровень
            доказательности. Мы не оцениваем «натуральность» — только химию
            формулы и то, что о ней говорят исследования.
          </p>
          <p className="text-muted-foreground">
            Если в одном флаконе встречаются конфликтующие активы, мы показываем
            это отдельно: такие сочетания могут инактивировать друг друга или
            суммировать раздражение, и это важнее рекламных обещаний на
            упаковке.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Бренд:</span>
          <Link href="/products">
            <Badge variant={searchParams.brand ? "outline" : "lavender"}>
              Все
            </Badge>
          </Link>
          {brands.map(({ brand }) => (
            <Link key={brand} href={`/products?brand=${encodeURIComponent(brand)}`}>
              <Badge variant={searchParams.brand === brand ? "lavender" : "outline"}>
                {brand}
              </Badge>
            </Link>
          ))}
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/products/${product.slug}`}>
                <GlassCard className="h-full space-y-2 p-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{product.brand}</Badge>
                    <Badge variant="outline">
                      {PRODUCT_CATEGORY_LABEL[product.category] ??
                        product.category}
                    </Badge>
                  </div>
                  <h2 className="font-display text-lg font-bold text-lavender">
                    {product.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Распознано ингредиентов: {product._count.ingredients}
                  </p>
                </GlassCard>
              </Link>
            </li>
          ))}
        </ul>
        {products.length === 0 && (
          <p className="text-muted-foreground">
            По выбранному фильтру ничего не найдено.
          </p>
        )}
      </Container>
    </main>
  );
}
