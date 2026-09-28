import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import type { EvidenceLevel, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, EVIDENCE_LABEL } from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Каталог ингредиентов косметики",
  description:
    "Функции, рабочие концентрации, уровень доказательности и конфликты активов — каталог ингредиентов с дерматологической точки зрения.",
  alternates: { canonical: "/ingredients" },
};

interface SearchParams {
  q?: string;
  category?: string;
  evidence?: string;
}

function filterHref(base: SearchParams, patch: Partial<SearchParams>): string {
  const merged = { ...base, ...patch };
  const params = new URLSearchParams();
  if (merged.q?.trim()) params.set("q", merged.q.trim());
  if (merged.category) params.set("category", merged.category);
  if (merged.evidence) params.set("evidence", merged.evidence);
  const qs = params.toString();
  return qs ? `/ingredients?${qs}` : "/ingredients";
}

/** Ссылка-строка фильтра в сайдбаре. */
function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-brand/15 font-semibold text-brand"
          : "text-muted-foreground hover:bg-white hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export default async function IngredientsCatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category || undefined;
  const evidence = searchParams.evidence as EvidenceLevel | undefined;

  const where: Prisma.IngredientWhereInput = {
    category,
    evidenceLevel: evidence,
    ...(q
      ? {
          OR: [
            { inciName: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { synonyms: { some: { alias: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [ingredients, categoryCounts, evidenceCounts, totalCount] =
    await Promise.all([
      prisma.ingredient.findMany({
        where,
        orderBy: { displayName: "asc" },
      }),
      prisma.ingredient.groupBy({
        by: ["category"],
        _count: { category: true },
        orderBy: { category: "asc" },
      }),
      prisma.ingredient.groupBy({
        by: ["evidenceLevel"],
        _count: { evidenceLevel: true },
      }),
      prisma.ingredient.count(),
    ]);
  const evidenceCountByLevel = new Map(
    evidenceCounts.map((r) => [r.evidenceLevel, r._count.evidenceLevel])
  );
  const hasActiveFilters = Boolean(q || category || evidence);

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <Container className="space-y-8">
        <header className="max-w-3xl space-y-4">
          <span className="eyebrow">База знаний</span>
          <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[36px]">
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

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Вертикальный сайдбар с поиском и фильтрами */}
          <aside className="lg:col-span-3">
            <div className="space-y-6 lg:sticky lg:top-24">
              <GlassCard className="space-y-5 p-6">
                <form action="/ingredients" method="get" className="space-y-2">
                  {category && <input type="hidden" name="category" value={category} />}
                  {evidence && <input type="hidden" name="evidence" value={evidence} />}
                  <label htmlFor="ingredient-search" className="text-sm font-semibold">
                    Поиск по базе
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="ingredient-search"
                      name="q"
                      type="search"
                      defaultValue={q}
                      placeholder="Название или INCI…"
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ищем по русским и латинским названиям и синонимам.
                  </p>
                </form>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Категория</p>
                  <FilterLink
                    href={filterHref(searchParams, { category: undefined })}
                    active={!category}
                  >
                    <span>Все категории</span>
                    <span className="text-xs text-muted-foreground">{totalCount}</span>
                  </FilterLink>
                  {categoryCounts.map(({ category: c, _count }) => (
                    <FilterLink
                      key={c}
                      href={filterHref(searchParams, { category: c })}
                      active={category === c}
                    >
                      <span>{CATEGORY_LABEL[c] ?? c}</span>
                      <span className="text-xs text-muted-foreground">
                        {_count.category}
                      </span>
                    </FilterLink>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Доказательность</p>
                  <FilterLink
                    href={filterHref(searchParams, { evidence: undefined })}
                    active={!evidence}
                  >
                    <span>Любая</span>
                    <span className="text-xs text-muted-foreground">{totalCount}</span>
                  </FilterLink>
                  {(Object.keys(EVIDENCE_LABEL) as EvidenceLevel[]).map((level) => (
                    <FilterLink
                      key={level}
                      href={filterHref(searchParams, { evidence: level })}
                      active={evidence === level}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            level === "STRONG" && "bg-success",
                            level === "MODERATE" && "bg-amber-500",
                            level === "LIMITED" && "bg-coral-700",
                            level === "ANECDOTAL" && "bg-muted-foreground"
                          )}
                        />
                        {EVIDENCE_LABEL[level].label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {evidenceCountByLevel.get(level) ?? 0}
                      </span>
                    </FilterLink>
                  ))}
                </div>

                {hasActiveFilters && (
                  <Link
                    href="/ingredients"
                    className="inline-block rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Сбросить фильтры
                  </Link>
                )}
              </GlassCard>
            </div>
          </aside>

          {/* Результаты */}
          <section className="lg:col-span-9">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Найдено:{" "}
                <span className="font-semibold text-foreground">
                  {ingredients.length}
                </span>
              </p>
              {q && (
                <p className="truncate text-sm text-muted-foreground">
                  по запросу «<span className="font-medium">{q}</span>»
                </p>
              )}
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ingredients.map((ingredient) => {
                const ev = EVIDENCE_LABEL[ingredient.evidenceLevel];
                return (
                  <li key={ingredient.id}>
                    <Link href={`/ingredients/${ingredient.slug}`}>
                      <GlassCard className="h-full space-y-2 p-6">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="default">
                            {CATEGORY_LABEL[ingredient.category] ??
                              ingredient.category}
                          </Badge>
                          <Badge variant={ev.variant}>{ev.label}</Badge>
                        </div>
                        <h2 className="font-display text-lg font-bold text-brand">
                          {ingredient.displayName}
                        </h2>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {ingredient.inciName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ingredient.function}
                        </p>
                        {ingredient.typicalConc && (
                          <p className="text-xs text-muted-foreground">
                            Рабочая концентрация: {ingredient.typicalConc}
                          </p>
                        )}
                      </GlassCard>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {ingredients.length === 0 && (
              <GlassCard className="p-8 text-center">
                <p className="text-muted-foreground">
                  По выбранным фильтрам ничего не найдено.
                </p>
                <Link
                  href="/ingredients"
                  className="mt-3 inline-block font-semibold text-brand hover:underline"
                >
                  Сбросить фильтры
                </Link>
              </GlassCard>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}
