import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical, ShieldAlert, Sparkles } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABEL,
  EVIDENCE_LABEL,
  SEVERITY_LABEL,
} from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

// ISR: страница кэшируется на 1 час; новые ингредиенты рендерятся по запросу
export const dynamicParams = true;
export const revalidate = 3600;

async function getIngredient(slug: string) {
  return prisma.ingredient.findUnique({
    where: { slug },
    include: {
      conflictsFrom: { include: { ingredientB: true } },
      conflictsTo: { include: { ingredientA: true } },
      products: {
        include: { product: true },
        orderBy: { position: "asc" },
        take: 8,
      },
    },
  });
}

/** Ингредиенты, с которыми текущий часто встречается в одних продуктах и не конфликтует. */
async function getSynergies(ingredientId: string, conflictIds: Set<string>) {
  const coProducts = await prisma.productIngredient.findMany({
    where: { product: { ingredients: { some: { ingredientId } } } },
    include: { ingredient: true },
  });
  const counts = new Map<string, { slug: string; name: string; n: number }>();
  for (const row of coProducts) {
    if (row.ingredientId === ingredientId || conflictIds.has(row.ingredientId))
      continue;
    const entry = counts.get(row.ingredientId) ?? {
      slug: row.ingredient.slug,
      name: row.ingredient.displayName,
      n: 0,
    };
    entry.n += 1;
    counts.set(row.ingredientId, entry);
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 6);
}

export async function generateStaticParams() {
  const ingredients = await prisma.ingredient.findMany({
    select: { slug: true },
  });
  return ingredients.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const ingredient = await prisma.ingredient.findUnique({
    where: { slug: params.slug },
  });
  if (!ingredient) return { title: "Ингредиент не найден" };
  const title = `${ingredient.displayName} (${ingredient.inciName}) в косметике`;
  const description = `${ingredient.function}. Рабочая концентрация: ${
    ingredient.typicalConc ?? "зависит от формулы"
  }. Уровень доказательности: ${EVIDENCE_LABEL[
    ingredient.evidenceLevel
  ].label.toLowerCase()}. Конфликты и сочетания с другими активами.`;
  return {
    title,
    description,
    alternates: { canonical: `/ingredients/${ingredient.slug}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function IngredientPage({
  params,
}: {
  params: { slug: string };
}) {
  const ingredient = await getIngredient(params.slug);
  if (!ingredient) notFound();

  const conflicts = [
    ...ingredient.conflictsFrom.map((c) => ({
      severity: c.severity,
      reason: c.reason,
      other: c.ingredientB,
    })),
    ...ingredient.conflictsTo.map((c) => ({
      severity: c.severity,
      reason: c.reason,
      other: c.ingredientA,
    })),
  ];
  const conflictIds = new Set(conflicts.map((c) => c.other.id));
  const synergies = await getSynergies(ingredient.id, conflictIds);
  const evidence = EVIDENCE_LABEL[ingredient.evidenceLevel];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${ingredient.displayName} (${ingredient.inciName})`,
    description: ingredient.description,
    url: `https://buty.app/ingredients/${ingredient.slug}`,
    about: {
      "@type": "Substance",
      name: ingredient.inciName,
      alternateName: ingredient.displayName,
    },
    lastReviewed: new Date().toISOString().slice(0, 10),
  };

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container className="space-y-8">
        <nav className="text-sm text-muted-foreground">
          <Link href="/ingredients" className="hover:text-lavender">
            Каталог ингредиентов
          </Link>
          <span className="mx-2">/</span>
          <span>{ingredient.displayName}</span>
        </nav>

        <GlassCard className="space-y-4 p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              {CATEGORY_LABEL[ingredient.category] ?? ingredient.category}
            </Badge>
            <Badge variant={evidence.variant}>{evidence.label}</Badge>
            {ingredient.typicalConc && (
              <Badge variant="outline">
                Рабочая концентрация: {ingredient.typicalConc}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            {ingredient.displayName}
          </h1>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            INCI: {ingredient.inciName}
          </p>
          <p className="max-w-3xl text-lg text-muted-foreground">
            {ingredient.function}
          </p>
          <p className="max-w-3xl">{ingredient.description}</p>
          {ingredient.safetyNotes && (
            <p className="max-w-3xl rounded-2xl bg-amber-100/60 p-4 text-sm text-amber-700">
              <ShieldAlert className="mr-1 inline h-4 w-4" />
              {ingredient.safetyNotes}
            </p>
          )}
        </GlassCard>

        {conflicts.length > 0 && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <ShieldAlert className="h-5 w-5 text-coral-700" />
              С чем конфликтует
            </h2>
            <ul className="space-y-3">
              {conflicts.map((c) => {
                const sev = SEVERITY_LABEL[c.severity] ?? SEVERITY_LABEL.low;
                return (
                  <li
                    key={c.other.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/50 p-4"
                  >
                    <Link
                      href={`/ingredients/${c.other.slug}`}
                      className="font-semibold text-lavender hover:underline"
                    >
                      {c.other.displayName}
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

        {synergies.length > 0 && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Sparkles className="h-5 w-5 text-lavender" />
              С чем сочетается
            </h2>
            <p className="text-sm text-muted-foreground">
              Эти ингредиенты часто встречаются вместе с {ingredient.displayName}{" "}
              в одних формулах и не имеют зафиксированных конфликтов.
            </p>
            <div className="flex flex-wrap gap-2">
              {synergies.map((s) => (
                <Link key={s.slug} href={`/ingredients/${s.slug}`}>
                  <Badge variant="outline">{s.name}</Badge>
                </Link>
              ))}
            </div>
          </GlassCard>
        )}

        {ingredient.products.length > 0 && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <FlaskConical className="h-5 w-5 text-lavender" />
              Часто встречается в
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ingredient.products.map((pi) => (
                <li key={pi.product.id}>
                  <Link
                    href={`/products/${pi.product.slug}`}
                    className="block rounded-2xl bg-white/50 p-4 transition-shadow hover:shadow-glass"
                  >
                    <span className="text-sm text-muted-foreground">
                      {pi.product.brand}
                    </span>
                    <span className="block font-semibold text-lavender">
                      {pi.product.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </Container>
    </main>
  );
}
