import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search, SearchX, X } from "lucide-react";
import type { Ingredient, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, EVIDENCE_LABEL, EVIDENCE_META, EVIDENCE_ORDER } from "@/lib/seo/labels";
import {
  CATEGORY_GROUPS,
  CATEGORY_PLURAL,
  categoryStyle,
} from "@/lib/seo/ingredient-categories";
import { FLAG_META } from "@/lib/ingredients/flags";
import {
  activeFilterCount,
  ingredientFiltersHref,
  isIndexableFilterPage,
  parseIngredientFilters,
  toggleValue,
  type IngredientFacetRow,
  type IngredientFilters,
  type RawIngredientSearchParams,
} from "@/lib/ingredients/catalog-filters";
import {
  catalogEntries,
  DIGITS_KEY,
  EN_ALPHABET,
  groupByLetter,
  letterAnchor,
  RU_ALPHABET,
  sortLetters,
  type CatalogEntry,
} from "@/lib/ingredients/catalog-alphabet";
import { Container } from "@/components/ui/container";
import { EvidenceMeter } from "@/components/ingredients/evidence-meter";
import {
  IngredientFilterPanel,
  type CategoryGroupOption,
} from "@/components/ingredients/ingredient-filters";
import { IngredientFlags } from "@/components/ingredients/ingredient-flags";
import { BackToFilters } from "@/components/ingredients/back-to-filters";
import { cn, pluralRu } from "@/lib/utils";

type SearchParams = RawIngredientSearchParams;

/** С какого размера выдачи включаем алфавитные группы и указатель. */
const GROUPING_THRESHOLD = 24;

function searchWhere(q: string): Prisma.IngredientWhereInput {
  return q
    ? {
        OR: [
          { inciName: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
          { synonyms: { some: { alias: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};
}

/** Матрица признаков: категория × доказательность × флаги → число ингредиентов. */
async function loadFacetRows(q: string): Promise<IngredientFacetRow[]> {
  const rows = await prisma.ingredient.groupBy({
    by: ["category", "evidenceLevel", "comedogenic", "feedsMalassezia", "fragranceAllergen"],
    where: searchWhere(q),
    _count: { _all: true },
  });
  return rows.map((r) => ({
    category: r.category,
    evidence: r.evidenceLevel,
    comedogenic: r.comedogenic,
    feedsMalassezia: r.feedsMalassezia,
    fragranceAllergen: r.fragranceAllergen,
    count: r._count._all,
  }));
}

/** Полная матрица (без поиска) — справочник категорий и статистика; один запрос на рендер. */
const loadCatalogMatrix = cache(() => loadFacetRows(""));

async function loadFilters(searchParams: SearchParams) {
  const matrix = await loadCatalogMatrix();
  const categories = [...new Set(matrix.map((r) => r.category))];
  return { matrix, categories, filters: parseIngredientFilters(searchParams, { categories }) };
}

/** Заголовок посадочной «одна категория»: «Увлажнители в косметике». */
function landingTitle(filters: IngredientFilters): string | null {
  if (!isIndexableFilterPage(filters) || filters.categories.length !== 1) return null;
  const plural = CATEGORY_PLURAL[filters.categories[0]];
  return plural ? `${plural} в составе косметики` : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { filters } = await loadFilters(searchParams);

  if (!isIndexableFilterPage(filters)) {
    // Поиск, мультивыбор, доказательность и флаги — служебные состояния:
    // не индексируем, но поисковик ходит по ссылкам на карточки.
    return {
      title: "Ингредиенты косметики: расшифровка составов",
      alternates: { canonical: "/ingredients" },
      robots: { index: false, follow: true },
    };
  }
  const landing = landingTitle(filters);
  if (landing) {
    return {
      title: `${landing}: список и расшифровка`,
      description: `${landing}: как обозначаются в составе, зачем нужны в формуле, рабочие концентрации, комедогенность, доказательная база и конфликты — дерматологический разбор каждого ингредиента.`,
      alternates: { canonical: ingredientFiltersHref(filters, {}, { anchor: false }) },
    };
  }
  return {
    title: "Ингредиенты косметики: расшифровка составов на русском",
    description:
      "Справочник компонентов косметики: как ингредиент обозначается в составе, что он делает, рабочая концентрация, комедогенность, доказательная база и конфликты активов.",
    alternates: { canonical: "/ingredients" },
  };
}

/** Плашка-иконка категории. */
function CategoryIcon({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const { icon: Icon, tint } = categoryStyle(category);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        size === "md" ? "h-9 w-9 rounded-xl" : "h-6 w-6 rounded-full",
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
  const { matrix, categories: allCategories, filters } = await loadFilters(searchParams);
  const { q, categories, evidence, flags } = filters;

  const where: Prisma.IngredientWhereInput = {
    AND: [
      searchWhere(q),
      categories.length ? { category: { in: categories } } : {},
      evidence.length ? { evidenceLevel: { in: evidence } } : {},
      flags.length ? { OR: flags.map((f) => ({ [f]: true })) } : {},
    ],
  };

  const [ingredients, searchFacets, conflictCount] = await Promise.all([
    prisma.ingredient.findMany({ where, orderBy: { displayName: "asc" } }),
    // Матрица с учётом поиска — для фасетных и живых счётчиков панели фильтров.
    q ? loadFacetRows(q) : Promise.resolve(matrix),
    prisma.ingredientConflict.count(),
  ]);

  const totalCount = matrix.reduce((sum, r) => sum + r.count, 0);
  const strongCount = matrix
    .filter((r) => r.evidence === "STRONG")
    .reduce((sum, r) => sum + r.count, 0);

  // Группы категорий: все категории базы; категории вне групп — в «Основу формулы».
  const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;
  const grouped = new Set(CATEGORY_GROUPS.flatMap((g) => g.categories));
  const orphanCategories = allCategories.filter((c) => !grouped.has(c)).sort();
  const categoryGroups: CategoryGroupOption[] = CATEGORY_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    categories: [...g.categories, ...(g.id === "base" ? orphanCategories : [])]
      .filter((c) => allCategories.includes(c))
      .map((value) => ({ value, label: categoryLabel(value) })),
  })).filter((g) => g.categories.length > 0);

  const activeCount = activeFilterCount(filters);
  const hasActiveFilters = Boolean(q) || activeCount > 0;
  const landing = landingTitle(filters);
  // Ключ по применённым фильтрам: после навигации панели монтируются заново.
  const panelKey = JSON.stringify(filters);
  const panelProps = { applied: filters, facets: searchFacets, categoryGroups };

  // Алфавитные группы — для длинной выдачи без поиска.
  const useGrouping = !q && ingredients.length > GROUPING_THRESHOLD;
  const rows: CatalogEntry<Ingredient>[] = useGrouping
    ? catalogEntries(ingredients)
    : ingredients.map((ingredient) => ({
        ingredient,
        title: ingredient.displayName,
        subtitle: ingredient.inciName,
        letter: "all",
      }));
  const letterGroups = groupByLetter(rows);
  const letters = sortLetters(letterGroups.keys());

  const stats = [
    { value: totalCount, label: pluralRu(totalCount, "ингредиент", "ингредиента", "ингредиентов") },
    {
      value: allCategories.length,
      label: pluralRu(allCategories.length, "категория", "категории", "категорий"),
    },
    { value: strongCount, label: "с сильной доказательной базой" },
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
            <span className="eyebrow">{landing ? "Каталог ингредиентов" : "База знаний"}</span>
            <h1 className="font-display text-[32px] font-semibold leading-[1.1] sm:text-[44px]">
              {landing ?? "Ингредиенты косметики: расшифровка составов"}
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

      {/* Якорь — обычный блок перед липкой панелью: у «прилипшего» элемента
          браузер не может вычислить исходную позицию для прокрутки. */}
      <div id="catalog" aria-hidden className="scroll-mt-[72px] sm:scroll-mt-20" />
      {/* Липкая панель в одну строку на любой ширине.
          На мобильных у неё нет backdrop-blur: иначе position: fixed нижнего листа
          привязался бы к панели, а не к экрану. Пока панель фильтров открыта,
          тулбар поднимается над шапкой — затемнение закрывает всю страницу. */}
      <div
        data-catalog-toolbar
        className="sticky top-[72px] z-30 border-y border-ink-hair bg-white has-[details[open]]:z-[60] sm:top-20 lg:bg-white/90 lg:backdrop-blur-md"
      >
        <Container className="flex items-center gap-2.5 py-3">
          <form
            action="/ingredients#catalog"
            method="get"
            role="search"
            className="relative min-w-0 flex-1 lg:max-w-[420px]"
          >
            {categories.map((c) => (
              <input key={c} type="hidden" name="category" value={c} />
            ))}
            {evidence.map((v) => (
              <input key={v} type="hidden" name="evidence" value={v} />
            ))}
            {flags.map((f) => (
              <input key={f} type="hidden" name="flag" value={f} />
            ))}
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
              enterKeyHint="search"
              className="h-11 w-full rounded-lg border border-transparent bg-ink-wash pl-10 pr-4 text-base text-foreground transition-colors placeholder:text-ink-muted hover:border-ink-line focus-visible:border-foreground focus-visible:bg-white focus-visible:outline-none sm:text-[15px]"
            />
          </form>

          {/* Мобильные и планшеты: одна кнопка «Фильтры» → нижний лист со всем сразу */}
          <IngredientFilterPanel
            key={`sheet-${panelKey}`}
            variant="sheet"
            className="shrink-0 lg:hidden"
            {...panelProps}
          />

          {/* Десктоп: три выпадающие панели справа от поиска */}
          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <IngredientFilterPanel
              key={`evidence-${panelKey}`}
              variant="popover"
              section="evidence"
              align="right"
              {...panelProps}
            />
            <IngredientFilterPanel
              key={`category-${panelKey}`}
              variant="popover"
              section="category"
              align="right"
              {...panelProps}
            />
            <IngredientFilterPanel
              key={`flags-${panelKey}`}
              variant="popover"
              section="flags"
              align="right"
              {...panelProps}
            />
          </div>
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
            <ActiveChip href={ingredientFiltersHref(filters, { q: "" })}>«{q}»</ActiveChip>
          )}
          {evidence.map((level) => (
            <ActiveChip
              key={level}
              href={ingredientFiltersHref(filters, { evidence: toggleValue(evidence, level) })}
            >
              <EvidenceMeter level={level} />
              {EVIDENCE_META[level].short}
            </ActiveChip>
          ))}
          {categories.map((c) => (
            <ActiveChip
              key={c}
              href={ingredientFiltersHref(filters, { categories: toggleValue(categories, c) })}
            >
              {categoryLabel(c)}
            </ActiveChip>
          ))}
          {flags.map((key) => (
            <ActiveChip
              key={key}
              href={ingredientFiltersHref(filters, { flags: toggleValue(flags, key) })}
            >
              {FLAG_META[key].label}
            </ActiveChip>
          ))}
          {activeCount + (q ? 1 : 0) > 1 && (
            <Link
              href="/ingredients#catalog"
              className="ml-1 text-sm font-semibold text-foreground underline underline-offset-4 hover:text-brand-700"
            >
              Сбросить всё
            </Link>
          )}
        </div>

        {/* Алфавитный указатель: кириллица первой строкой, латиница — второй.
            Буквы без ингредиентов в текущей выдаче показаны приглушёнными. */}
        {useGrouping && letters.length > 1 && (
          <nav aria-label="Алфавитный указатель" className="mb-8 space-y-1">
            {[
              { id: "ru", label: "Кириллица", keys: [...(letterGroups.has(DIGITS_KEY) ? [DIGITS_KEY] : []), ...RU_ALPHABET] },
              { id: "en", label: "Латиница", keys: EN_ALPHABET },
            ].map((row) => (
              <ul
                key={row.id}
                aria-label={row.label}
                className="no-scrollbar -mx-6 flex gap-0.5 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0"
              >
                {row.keys.map((key) => {
                  const cls =
                    "grid h-9 min-w-8 shrink-0 place-items-center rounded-lg px-1.5 text-sm font-semibold";
                  return (
                    <li key={key} className="shrink-0">
                      {letterGroups.has(key) ? (
                        <a
                          href={`#${letterAnchor(key)}`}
                          className={cn(
                            cls,
                            "text-ink-soft transition-colors hover:bg-ink-wash hover:text-foreground"
                          )}
                        >
                          {key}
                        </a>
                      ) : (
                        <span className={cn(cls, "cursor-default text-ink-line")} aria-hidden>
                          {key}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ))}
          </nav>
        )}

        {ingredients.length > 0 ? (
          <div className="space-y-10">
            {letters.map((letter) => {
              const items = letterGroups.get(letter) ?? [];
              return (
                <section
                  key={letter}
                  id={useGrouping ? letterAnchor(letter) : undefined}
                  aria-label={useGrouping ? `Буква ${letter}` : undefined}
                  className="scroll-mt-40 sm:scroll-mt-44"
                >
                  {useGrouping && (
                    <div className="mb-4 flex items-baseline gap-3">
                      <h2 className="font-display text-2xl font-semibold">{letter}</h2>
                      <span className="text-sm text-ink-muted">{items.length}</span>
                      <span className="h-px flex-1 self-center bg-ink-hair" />
                    </div>
                  )}
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map(({ ingredient, title, subtitle }) => (
                      <li key={`${ingredient.id}-${title}`} className="min-w-0">
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
                            {title}
                          </h3>
                          {subtitle && (
                            <p
                              className={cn(
                                "mt-1 truncate text-xs font-medium text-ink-muted",
                                // INCI-подпись — капсом, русское название — как есть.
                                subtitle === ingredient.inciName && "uppercase tracking-wide"
                              )}
                              title={subtitle}
                            >
                              {subtitle}
                            </p>
                          )}
                          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                            {ingredient.function}
                          </p>

                          {(ingredient.comedogenic ||
                            ingredient.feedsMalassezia ||
                            ingredient.fragranceAllergen) && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <IngredientFlags flags={ingredient} />
                            </div>
                          )}

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

      {/* Плавающая кнопка «наверх»: из глубины каталога — обратно к фильтрам */}
      <BackToFilters />
    </main>
  );
}
