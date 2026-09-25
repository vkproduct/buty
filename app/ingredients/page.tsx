import type { Metadata } from "next";
import Link from "next/link";
import type { EvidenceLevel } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, EVIDENCE_LABEL } from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

export const metadata: Metadata = {
  title: "Каталог ингредиентов косметики",
  description:
    "Функции, рабочие концентрации, уровень доказательности и конфликты активов — каталог ингредиентов с дерматологической точки зрения.",
  alternates: { canonical: "/ingredients" },
};

interface SearchParams {
  category?: string;
  evidence?: string;
}

function filterHref(base: SearchParams, patch: Partial<SearchParams>): string {
  const merged = { ...base, ...patch };
  const params = new URLSearchParams();
  if (merged.category) params.set("category", merged.category);
  if (merged.evidence) params.set("evidence", merged.evidence);
  const qs = params.toString();
  return qs ? `/ingredients?${qs}` : "/ingredients";
}

export default async function IngredientsCatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const categories = await prisma.ingredient.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  const ingredients = await prisma.ingredient.findMany({
    where: {
      category: searchParams.category || undefined,
      evidenceLevel: (searchParams.evidence as EvidenceLevel) || undefined,
    },
    orderBy: { displayName: "asc" },
  });

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <Container className="space-y-8">
        <header className="max-w-3xl space-y-4">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Каталог ингредиентов
          </h1>
          <p className="text-muted-foreground">
            Маркетинг оценивает ингредиенты по громкости обещаний, дерматология —
            по качеству доказательств. Здесь каждый компонент описан через его
            функцию в формуле, типичную рабочую концентрацию и уровень
            доказательности: от рандомизированных исследований до данных in
            vitro.
          </p>
          <p className="text-muted-foreground">
            Отдельно мы фиксируем конфликты активов: сочетания, которые
            инактивируют друг друга или суммируют раздражение. Это важнее, чем
            «натуральность» состава, — эффективность ухода определяется
            химией, а не происхождением молекулы.
          </p>
        </header>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Категория:</span>
            <Link href={filterHref(searchParams, { category: undefined })}>
              <Badge variant={searchParams.category ? "outline" : "lavender"}>
                Все
              </Badge>
            </Link>
            {categories.map(({ category }) => (
              <Link
                key={category}
                href={filterHref(searchParams, { category })}
              >
                <Badge
                  variant={
                    searchParams.category === category ? "lavender" : "outline"
                  }
                >
                  {CATEGORY_LABEL[category] ?? category}
                </Badge>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Доказательность:</span>
            <Link href={filterHref(searchParams, { evidence: undefined })}>
              <Badge variant={searchParams.evidence ? "outline" : "lavender"}>
                Все
              </Badge>
            </Link>
            {(Object.keys(EVIDENCE_LABEL) as EvidenceLevel[]).map((level) => (
              <Link
                key={level}
                href={filterHref(searchParams, { evidence: level })}
              >
                <Badge
                  variant={
                    searchParams.evidence === level
                      ? EVIDENCE_LABEL[level].variant
                      : "outline"
                  }
                >
                  {EVIDENCE_LABEL[level].label}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ingredients.map((ingredient) => {
            const evidence = EVIDENCE_LABEL[ingredient.evidenceLevel];
            return (
              <li key={ingredient.id}>
                <Link href={`/ingredients/${ingredient.slug}`}>
                  <GlassCard className="h-full space-y-2 p-6">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="default">
                        {CATEGORY_LABEL[ingredient.category] ??
                          ingredient.category}
                      </Badge>
                      <Badge variant={evidence.variant}>
                        {evidence.label}
                      </Badge>
                    </div>
                    <h2 className="font-display text-lg font-bold text-lavender">
                      {ingredient.displayName}
                    </h2>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {ingredient.inciName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ingredient.function}
                    </p>
                  </GlassCard>
                </Link>
              </li>
            );
          })}
        </ul>
        {ingredients.length === 0 && (
          <p className="text-muted-foreground">
            По выбранным фильтрам ничего не найдено.
          </p>
        )}
      </Container>
    </main>
  );
}
