import Link from "next/link";
import { notFound } from "next/navigation";

import { updateProduct } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { PRODUCT_CATEGORY_LABEL } from "@/lib/seo/labels";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";

/** Правка продукта. */
export default async function AdminProductEdit({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });
  if (!product) notFound();

  return (
    <GlassCard className="max-w-xl space-y-4 p-6">
      <h2 className="font-display text-xl font-bold">
        {product.brand} {product.name}
      </h2>
      <p className="text-sm text-muted-foreground">
        slug: {product.slug} ·{" "}
        <Link
          href={`/products/${product.slug}`}
          className="text-lavender hover:underline"
        >
          открыть страницу
        </Link>
      </p>
      <form action={updateProduct} className="space-y-3">
        <input type="hidden" name="id" value={product.id} />
        <Input name="brand" defaultValue={product.brand} required />
        <Input name="name" defaultValue={product.name} required />
        <select
          name="category"
          className="w-full rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm backdrop-blur"
          defaultValue={product.category}
        >
          {Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input
          name="sourceUrl"
          defaultValue={product.sourceUrl ?? ""}
          placeholder="Официальная страница (URL)"
        />
        <Input
          name="partnerUrl"
          defaultValue={product.partnerUrl ?? ""}
          placeholder="Партнёрская ссылка (URL)"
        />
        <Button type="submit" className="w-full">
          Сохранить
        </Button>
      </form>
    </GlassCard>
  );
}
