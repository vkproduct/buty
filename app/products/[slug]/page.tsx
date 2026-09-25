import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FlaskConical, ShieldAlert } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABEL,
  EVIDENCE_LABEL,
  PRODUCT_CATEGORY_LABEL,
  SEVERITY_LABEL,
} from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

export const dynamicParams = false;

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      ingredients: {
        include: { ingredient: true },
        orderBy: { position: "asc" },
      },
    },
  });
}

/** Конфликты активов внутри состава продукта. */
async function getInternalConflicts(ingredientIds: string[]) {
  if (ingredientIds.length < 2) return [];
  return prisma.ingredientConflict.findMany({
    where: {
      ingredientAId: { in: ingredientIds },
      ingredientBId: { in: ingredientIds },
    },
    include: { ingredientA: true, ingredientB: true },
  });
}

export async function generateStaticParams() {
  const products = await prisma.product.findMany({ select: { slug: true } });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
  });
  if (!product) return { title: "Продукт не найден" };
  const title = `${product.brand} ${product.name} — разбор состава`;
  const description = `Научный разбор состава ${product.brand} ${product.name}: функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности формулы.`;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const ingredientIds = product.ingredients.map((pi) => pi.ingredientId);
  const conflicts = await getInternalConflicts(ingredientIds);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    category: PRODUCT_CATEGORY_LABEL[product.category] ?? product.category,
    url: `https://buty.ru/products/${product.slug}`,
    description: `Состав: ${product.ingredients
      .map((pi) => pi.ingredient.inciName)
      .join(", ")}`,
  };

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container className="space-y-8">
        <nav className="text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-lavender">
            Каталог продуктов
          </Link>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </nav>

        <GlassCard className="space-y-4 p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{product.brand}</Badge>
            <Badge variant="outline">
              {PRODUCT_CATEGORY_LABEL[product.category] ?? product.category}
            </Badge>
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            {product.name}
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Состав разобран по распознанным ингредиентам в порядке INCI-списка —
            от самых высоких концентраций к самым низким. Для каждого компонента
            указаны функция и уровень доказательности.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={`/go/${product.id}?source=product_page`}>
                Где купить
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            {product.sourceUrl && (
              <Button asChild variant="outline">
                <a href={product.sourceUrl} target="_blank" rel="noopener">
                  Официальная страница
                </a>
              </Button>
            )}
          </div>
        </GlassCard>

        {conflicts.length > 0 && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <ShieldAlert className="h-5 w-5 text-coral-700" />
              Конфликты внутри формулы
            </h2>
            <ul className="space-y-3">
              {conflicts.map((c) => {
                const sev = SEVERITY_LABEL[c.severity] ?? SEVERITY_LABEL.low;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/50 p-4"
                  >
                    <Link
                      href={`/ingredients/${c.ingredientA.slug}`}
                      className="font-semibold text-lavender hover:underline"
                    >
                      {c.ingredientA.displayName}
                    </Link>
                    <span className="text-muted-foreground">+</span>
                    <Link
                      href={`/ingredients/${c.ingredientB.slug}`}
                      className="font-semibold text-lavender hover:underline"
                    >
                      {c.ingredientB.displayName}
                    </Link>
                    <Badge variant={sev.variant}>{sev.label}</Badge>
                    <span className="w-full text-sm text-muted-foreground">
                      {c.reason}
                    </span>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        )}

        <GlassCard className="space-y-4 p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <FlaskConical className="h-5 w-5 text-lavender" />
            Состав ({product.ingredients.length})
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {product.ingredients.map((pi) => {
              const ingredient = pi.ingredient;
              const evidence = EVIDENCE_LABEL[ingredient.evidenceLevel];
              return (
                <li key={pi.id}>
                  <Link href={`/ingredients/${ingredient.slug}`}>
                    <div className="h-full space-y-2 rounded-2xl bg-white/50 p-4 transition-shadow hover:shadow-glass">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-lavender">
                          {ingredient.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          №{pi.position}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default">
                          {CATEGORY_LABEL[ingredient.category] ??
                            ingredient.category}
                        </Badge>
                        <Badge variant={evidence.variant}>
                          {evidence.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ingredient.function}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      </Container>
    </main>
  );
}
