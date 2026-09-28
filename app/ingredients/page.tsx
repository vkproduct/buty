import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LayoutGrid, Search, SearchX, X } from "lucide-react";
import type { EvidenceLevel, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABEL,
  EVIDENCE_LABEL,
  EVIDENCE_META,
  EVIDENCE_ORDER,
} from "@/lib/seo/labels";
import { CATEGORY_GROUPS, categoryStyle } from "@/lib/seo/ingredient-categories";
import { Container } from "@/components/ui/container";
import { EvidenceMeter } from "@/components/ingredients/evidence-meter";
import { FilterPopover } from "@/components/ingredients/filter-popover";
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

/** С какого размера выдачи включаем алфавитные группы и указатель. */
const GROUPING_THRESHOLD = 24;

function filterHref(base: SearchParams, patch: Partial<SearchParams>): string {
  const merged = { ...base, ...patch };
  const params = new URLSearchParams();
  if (merged.q?.trim()) params.set("q", merged.q.trim());
  if (merged.category) params.set("category", merged.category);
  if (merged.evidence) params.set("evidence", merged.evidence);
  const qs = params.toString();
  // Якорь #catalog: после смены фильтра пользователь сразу видит панель и выдачу,
  // а не прокручивается в начало страницы.
  return `/ingredients${qs ? `?${qs}` : ""}#catalog`;
}

/**
 * Ключ алфавитной группы: первая буква русского названия.
 * Цифры — в одну группу «0–9» (в начале), латиница — в одну группу «A–Z» (в конце),
 * чтобы латинская P не стояла рядом с кириллической Р как «две одинаковые буквы».
 */
function letterOf(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();
  if (/[0-9]/.test(ch)) return "0–9";
  if (/[A-Z]/.test(ch)) return "A–Z";
  return ch === "Ё" ? "Е" : ch;
}

function letterRank(key: string): number {
  if (key === "0–9") return 0;
  if (key === "A–Z") return 2;
  return 1;
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Плашка-иконка категории. */
function CategoryIcon({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const { icon: Icon, tint } = categoryStyle(category);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        size === "md" ? "h-9 w-9 rounded-xl" : "h-7 w-7 rounded-full",
        tint
      )}
      aria-hidden
    >
      <Icon className={size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} strokeWidth={2} />
    </span>
  );
}

/** Удаляемый чип активного фильтра. */
function ActiveChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink-wash pl-3 pr-2 text-sm font-medium text-foreground transition-colors hover:bg-ink-hair"
    >
      {children}
      <X className="h-3.5 w-3.5 text-ink-muted" aria-label="Убрать фильтр" />
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
  const evidence = (EVIDENCE_ORDER as string[]).includes(searchParams.evidence ?? "")
    ? (searchParams.evidence as EvidenceLevel)
    : undefined;

  const searchWhere: Prisma.IngredientWhereInput = q
    ? {
        OR: [
          { inciName: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
          { synonyms: { some: { alias: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};
  const where: Prisma.IngredientWhereInput = { category, evidenceLevel: evidence, ...searchWhere };

  // Фасетные счётчики: сколько найдётся, если выбрать этот пункт при остальных
  // текущих фильтрах. Глобальные — для навигатора, статистики и списка пунктов.
  const [
    ingredients,
    categoryTotals,
    categoryFacets,
    evidenceTotals,
    evidenceFacets,
    totalCount,
    conflictCount,
  ] = await Promise.all([
    prisma.ingredient.findMany({ where, orderBy: { displayName: "asc" } }),
    prisma.ingredient.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.ingredient.groupBy({
      by: ["category"],
      where: { evidenceLevel: evidence, ...searchWhere },
      _count: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.ingredient.groupBy({ by: ["evidenceLevel"], _count: { evidenceLevel: true } }),
    prisma.ingredient.groupBy({
      by: ["evidenceLevel"],
      where: { category, ...searchWhere },
      _count: { evidenceLevel: true },
    }),
    prisma.ingredient.count(),
    prisma.ingredientConflict.count(),
  ]);

  const countByCategory = new Map(categoryFacets.map((r) => [r.category, r._count.category]));
  const categoryFacetTotal = categoryFacets.reduce((sum, r) => sum + r._count.category, 0);
  const evidenceTotalByLevel = new Map(
    evidenceTotals.map((r) => [r.evidenceLevel, r._count.evidenceLevel])
  );
  const evidenceCountByLevel = new Map(
    evidenceFacets.map((r) => [r.evidenceLevel, r._count.evidenceLevel])
  );
  // Уровни показываем, если они есть в базе вообще (пустые по фильтру — приглушены).
  const evidenceLevels = EVIDENCE_ORDER.filter(
    (level) => (evidenceTotalByLevel.get(level) ?? 0) > 0 || evidence === level
  );

  // Группы категорий: все категории базы; категории вне групп — в «Основу формулы».
  const allCategories = categoryTotals.map((r) => r.category);
  const grouped = new Set(CATEGORY_GROUPS.flatMap((g) => g.categories));
  const orphanCategories = allCategories.filter((c) => !grouped.has(c));
  const categoryGroups = CATEGORY_GROUPS.map((g) => ({
    ...g,
    categories: [...g.categories, ...(g.id === "base" ? orphanCategories : [])].filter(
      (c) => allCategories.includes(c) || c === category
    ),
  })).filter((g) => g.categories.length > 0);

  const hasActiveFilters = Boolean(q || category || evidence);
  const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;

  // Алфавитные группы — для длинной выдачи без поиска.
  const sorted = [...ingredients].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ru")
  );
  const useGrouping = !q && sorted.length > GROUPING_THRESHOLD;
  const letterGroups = new Map<string, typeof sorted>();
  for (const ingredient of sorted) {
    const key = useGrouping ? letterOf(ingredient.displayName) : "all";
    const bucket = letterGroups.get(key);
    if (bucket) bucket.push(ingredient);
    else letterGroups.set(key, [ingredient]);
  }
  const letters = [...letterGroups.keys()].sort(
    (a, b) => letterRank(a) - letterRank(b) || a.localeCompare(b, "ru")
  );

  const stats = [
    { value: totalCount, label: pluralRu(totalCount, "ингредиент", "ингредиента", "ингредиентов") },
    {
      value: allCategories.length,
      label: pluralRu(allCategories.length, "категория", "категории", "категорий"),
    },
    {
      value: evidenceTotalByLevel.get("STRONG") ?? 0,
      label: "с сильной доказательной базой",
    },
    {
      value: conflictCount,
      label: pluralRu(conflictCount, "конфликт активов", "конфликта активов", "конфликтов активов"),
    },
  ];

  return (
    <main className="min-h-screen bg-white pb-24">
      {/* ── Шапка раздела ─────────────────────────────────────────────── */}
      <Container className="pb-10 pt-10 sm:pt-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <header className="space-y-4 lg:col-span-7">
            <span className="eyebrow">База знаний</span>
            <h1 className="font-display text-[32px] font-semibold leading-[1.1] sm:text-[44px]">
              Каталог ингредиентов
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-ink-soft">
              Маркетинг оценивает ингредиенты по громкости обещаний, дерматология —
              по качеству доказательств. Здесь каждый компонент описан через его
              функцию в формуле, рабочую концентрацию и уровень доказательности.
            </p>
          </header>
          <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:col-span-5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-ink-wash px-4 py-3.5 sm:px-5 sm:py-4">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block font-display text-2xl font-semibold leading-none tracking-tight sm:text-[28px]">
                    {s.value}
                  </span>
                  <span className="mt-1.5 block text-sm leading-snug text-ink-muted">
                    {s.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>

      {/* ── Навигатор по категориям ───────────────────────────────────── */}
      <Container className="pb-10">
        <div className="grid gap-4 lg:grid-cols-3">
          {categoryGroups.map((group) => (
            <section
              key={group.id}
              aria-labelledby={`group-${group.id}`}
              className="min-w-0 rounded-3xl border border-ink-hair p-5"
            >
              <h2 id={`group-${group.id}`} className="text-base font-semibold">
                {group.title}
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">{group.hint}</p>
              <ul className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {group.categories.map((c) => {
                  const active = category === c;
                  const count = countByCategory.get(c) ?? 0;
                  const chipClass =
                    "inline-flex h-10 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-sm transition-colors";
                  const content = (
                    <>
                      <CategoryIcon category={c} size="sm" />
                      <span className="font-medium">{categoryLabel(c)}</span>
                      <span className={active ? "text-white/70" : "text-ink-muted"}>{count}</span>
                    </>
                  );
                  return (
                    <li key={c} className="shrink-0">
                      {count === 0 && !active ? (
                        <span
                          className={cn(chipClass, "cursor-default border-ink-hair opacity-40")}
                          title="Нет ингредиентов при текущих фильтрах"
                        >
                          {content}
                        </span>
                      ) : (
                        <Link
                          href={filterHref(searchParams, { category: active ? undefined : c })}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            chipClass,
                            active
                              ? "border-foreground bg-foreground text-white"
                              : "border-ink-hair bg-white text-foreground hover:border-foreground"
                          )}
                        >
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Container>

      {/* ── Липкая панель: поиск + доказательность + категория ─────────── */}
      {/* Якорь — обычный блок перед липкой панелью: у «прилипшего» элемента
          браузер не может вычислить исходную позицию для прокрутки. */}
      <div id="catalog" aria-hidden className="scroll-mt-[72px] sm:scroll-mt-20" />
      <div
        data-catalog-toolbar
        className="sticky top-[72px] z-30 border-y border-ink-hair bg-white/90 backdrop-blur-md sm:top-20"
      >
        <Container className="flex flex-wrap items-center gap-x-3 gap-y-2.5 py-3">
          <form
            action="/ingredients#catalog"
            method="get"
            role="search"
            className="relative min-w-0 flex-1 lg:max-w-sm"
          >
            {category && <input type="hidden" name="category" value={category} />}
            {evidence && <input type="hidden" name="evidence" value={evidence} />}
            <label htmlFor="ingredient-search" className="sr-only">
              Поиск по названию, INCI или синониму
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="ingredient-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Ниацинамид, retinol, SLS…"
              className="h-11 w-full rounded-lg border border-transparent bg-ink-wash pl-10 pr-4 text-[15px] text-foreground transition-colors placeholder:text-ink-muted hover:border-ink-line focus-visible:border-foreground focus-visible:bg-white focus-visible:outline-none"
            />
          </form>

          {/* Категория — доступна в любой точке прокрутки */}
          <FilterPopover
            key={`cat-${category ?? "all"}`}
            className="lg:order-last lg:ml-auto"
            panelClassName="w-[min(calc(100vw-3rem),640px)]"
            trigger={
              category ? (
                <>
                  <CategoryIcon category={category} size="sm" />
                  <span className="hidden max-w-[180px] truncate sm:inline">
                    {categoryLabel(category)}
                  </span>
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4 text-ink-muted" />
                  <span className="hidden sm:inline">Все категории</span>
                </>
              )
            }
          >
            <Link
              href={filterHref(searchParams, { category: undefined })}
              className={cn(
                "mb-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-ink-wash",
                !category && "bg-ink-wash"
              )}
            >
              Все категории
              <span className="text-ink-muted">{categoryFacetTotal}</span>
            </Link>
            <div className="grid gap-x-2 sm:grid-cols-2">
              {categoryGroups.map((group) => (
                <div key={group.id} className={cn(group.id === "base" && "sm:col-span-2")}>
                  <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {group.title}
                  </p>
                  <ul className={cn("grid", group.id === "base" && "sm:grid-cols-2 sm:gap-x-2")}>
                    {group.categories.map((c) => (
                      <li key={c}>
                        <Link
                          href={filterHref(searchParams, { category: c })}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-ink-wash",
                            category === c && "bg-ink-wash font-semibold",
                            !countByCategory.get(c) && category !== c && "opacity-40"
                          )}
                        >
                          <CategoryIcon category={c} size="sm" />
                          <span className="flex-1 truncate">{categoryLabel(c)}</span>
                          <span className="text-ink-muted">{countByCategory.get(c) ?? 0}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </FilterPopover>

          {/* Доказательная база — сегментированный переключатель */}
          <nav
            aria-label="Доказательная база"
            className="no-scrollbar -mx-6 flex w-[calc(100%+3rem)] items-center gap-1.5 overflow-x-auto px-6 sm:-mx-10 sm:w-[calc(100%+5rem)] sm:px-10 lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0"
          >
            <span className="mr-1 hidden shrink-0 text-sm text-ink-muted xl:inline">
              Доказательность:
            </span>
            <Link
              href={filterHref(searchParams, { evidence: undefined })}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
                !evidence
                  ? "border-foreground bg-foreground text-white"
                  : "border-ink-hair text-foreground hover:border-foreground"
              )}
            >
              Любая
            </Link>
            {evidenceLevels.map((level) => {
              const active = evidence === level;
              return (
                <Link
                  key={level}
                  href={filterHref(searchParams, { evidence: active ? undefined : level })}
                  title={EVIDENCE_META[level].note}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border pl-3 pr-3.5 text-sm font-medium transition-colors",
                    active
                      ? "border-foreground bg-foreground text-white"
                      : "border-ink-hair text-foreground hover:border-foreground",
                    !active && !evidenceCountByLevel.get(level) && "opacity-40"
                  )}
                >
                  <EvidenceMeter level={level} inverted={active} />
                  {EVIDENCE_META[level].short}
                  <span
                    className={cn(
                      "lg:hidden xl:inline",
                      active ? "text-white/70" : "text-ink-muted"
                    )}
                  >
                    {evidenceCountByLevel.get(level) ?? 0}
                  </span>
                </Link>
              );
            })}
          </nav>
        </Container>
      </div>

      {/* ── Результаты ────────────────────────────────────────────────── */}
      <Container className="pt-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <p className="mr-2 text-sm text-ink-muted" aria-live="polite">
            <span className="text-base font-semibold text-foreground">{ingredients.length}</span>{" "}
            {pluralRu(ingredients.length, "ингредиент", "ингредиента", "ингредиентов")}
            {hasActiveFilters && ` из ${totalCount}`}
          </p>
          {q && (
            <ActiveChip href={filterHref(searchParams, { q: undefined })}>«{q}»</ActiveChip>
          )}
          {category && (
            <ActiveChip href={filterHref(searchParams, { category: undefined })}>
              {categoryLabel(category)}
            </ActiveChip>
          )}
          {evidence && (
            <ActiveChip href={filterHref(searchParams, { evidence: undefined })}>
              {EVIDENCE_META[evidence].short} доказательность
            </ActiveChip>
          )}
          {[q, category, evidence].filter(Boolean).length > 1 && (
            <Link
              href="/ingredients#catalog"
              className="ml-1 text-sm font-semibold text-foreground underline underline-offset-4 hover:text-brand-700"
            >
              Сбросить всё
            </Link>
          )}
        </div>

        {/* Алфавитный указатель */}
        {useGrouping && letters.length > 1 && (
          <nav
            aria-label="Алфавитный указатель"
            className="no-scrollbar -mx-6 mb-8 flex gap-1 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {letters.map((letter, i) => (
              <a
                key={letter}
                href={`#letter-${i}`}
                className="grid h-9 min-w-9 shrink-0 place-items-center rounded-lg px-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink-wash hover:text-foreground"
              >
                {letter}
              </a>
            ))}
          </nav>
        )}

        {ingredients.length > 0 ? (
          <div className="space-y-10">
            {letters.map((letter, i) => {
              const items = letterGroups.get(letter) ?? [];
              return (
                <section
                  key={letter}
                  id={useGrouping ? `letter-${i}` : undefined}
                  aria-label={useGrouping ? `Буква ${letter}` : undefined}
                  className="scroll-mt-52 lg:scroll-mt-44"
                >
                  {useGrouping && (
                    <div className="mb-4 flex items-baseline gap-3">
                      <h2 className="font-display text-2xl font-semibold">{letter}</h2>
                      <span className="text-sm text-ink-muted">{items.length}</span>
                      <span className="h-px flex-1 self-center bg-ink-hair" />
                    </div>
                  )}
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((ingredient) => (
                      <li key={ingredient.id} className="min-w-0">
                        <Link
                          href={`/ingredients/${ingredient.slug}`}
                          className="group flex h-full flex-col rounded-2xl border border-ink-hair bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-line hover:shadow-glass-lg"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <CategoryIcon category={ingredient.category} />
                              <span className="truncate text-[13px] font-medium text-ink-muted">
                                {categoryLabel(ingredient.category)}
                              </span>
                            </span>
                            <EvidenceMeter level={ingredient.evidenceLevel} withLabel />
                          </div>

                          <h3 className="mt-4 break-words text-[17px] font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-700">
                            {ingredient.displayName}
                          </h3>
                          <p
                            className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-ink-muted"
                            title={ingredient.inciName}
                          >
                            {ingredient.inciName}
                          </p>
                          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                            {ingredient.function}
                          </p>

                          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                            {ingredient.typicalConc ? (
                              <span
                                className="truncate rounded-full bg-ink-wash px-2.5 py-1 text-xs font-medium text-ink-soft"
                                title={`Типичная рабочая концентрация: ${ingredient.typicalConc}`}
                              >
                                {ingredient.typicalConc}
                              </span>
                            ) : (
                              <span />
                            )}
                            <ArrowUpRight
                              className="h-4 w-4 shrink-0 text-ink-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                              aria-hidden
                            />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-line px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-wash">
              <SearchX className="h-6 w-6 text-ink-muted" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Ничего не нашли</h2>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Попробуйте латинское INCI-название или уберите один из фильтров. Если
              ингредиента нет в базе — вставьте состав целиком в разбор, мы учтём
              нераспознанные компоненты при пополнении базы.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/ingredients#catalog"
                className="inline-flex h-11 items-center rounded-lg border border-foreground px-5 text-sm font-semibold transition-colors hover:bg-ink-wash"
              >
                Сбросить фильтры
              </Link>
              <Link
                href="/analyze"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-cta px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Разобрать состав <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </Container>

      {/* ── Как читать карточки ───────────────────────────────────────── */}
      <Container className="pt-20">
        <section className="grid gap-10 rounded-3xl bg-ink-wash p-6 sm:p-10 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <h2 className="font-display text-2xl font-semibold leading-tight sm:text-[28px]">
              Как мы оцениваем ингредиенты
            </h2>
            <p className="leading-relaxed text-ink-soft">
              Столбики на карточке — уровень доказательной базы: чем их больше, тем
              надёжнее данные о том, что ингредиент делает то, что обещает этикетка.
            </p>
            <p className="leading-relaxed text-ink-soft">
              Отдельно мы фиксируем конфликты активов: сочетания, которые
              инактивируют друг друга или суммируют раздражение. Это важнее, чем
              «натуральность» состава, — эффективность ухода определяется химией, а
              не происхождением молекулы.
            </p>
            <Link
              href="/analyze"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-cta px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Проверить свой состав <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
            {EVIDENCE_ORDER.map((level) => (
              <li key={level} className="rounded-2xl bg-white p-5">
                <p className="flex items-center gap-2.5 text-sm font-semibold">
                  <EvidenceMeter level={level} />
                  {EVIDENCE_LABEL[level].label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {EVIDENCE_META[level].note}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </main>
  );
}
