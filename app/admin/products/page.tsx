import Link from "next/link";

import { createProduct } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { PRODUCT_CATEGORY_LABEL } from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";

/** Продукты: список + форма добавления. */
export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    include: { _count: { select: { ingredients: true } } },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    take: 200,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <GlassCard className="space-y-2 p-6">
        <h2 className="font-display text-xl font-bold">
          Продукты ({products.length})
        </h2>
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/50 px-4 py-2 text-sm"
            >
              <Link
                href={`/admin/products/${p.id}`}
                className="font-semibold text-lavender hover:underline"
              >
                {p.brand} {p.name}
              </Link>
              <Badge variant="outline">
                {PRODUCT_CATEGORY_LABEL[p.category] ?? p.category}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {p._count.ingredients} ингр.
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">Добавить продукт</h2>
        <form action={createProduct} className="space-y-3">
          <Input name="brand" placeholder="Бренд" required />
          <Input name="name" placeholder="Название" required />
          <Input name="slug" placeholder="slug (пусто — автоматически)" />
          <select
            name="category"
            className="w-full rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm backdrop-blur"
            defaultValue="cream"
          >
            {Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Input name="sourceUrl" placeholder="Официальная страница (URL)" />
          <Input name="partnerUrl" placeholder="Партнёрская ссылка (URL)" />
          <Button type="submit" className="w-full">
            Создать
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
