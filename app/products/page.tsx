import { cache, Children, type ReactElement, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, LayoutGrid, Search, SearchX, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  ALL_BRANDS,
  facetCounts,
  isIndexableFilterPage,
  PAGE_SIZE,
  parsePage,
  parseProductFilters,
  productFiltersHref,
  toggleValue,
  compareNames,
  type FacetRow,
  type ProductFilters,
  type RawProductSearchParams,
} from "@/lib/products/catalog-filters";
import {
  productCategoryLabel,
  productCategoryPlural,
  productCategoryStyle,
  sortProductCategories,
} from "@/lib/seo/product-categories";
import { brandWithRu } from "@/lib/seo/brands";
import { displayBrand, NO_BRAND } from "@/lib/products/brand";
import { Container } from "@/components/ui/container";
import { ChipRail } from "@/components/products/chip-rail";
import { ProductFilterSheet } from "@/components/products/product-filters";
import { cn, pluralRu } from "@/lib/utils";

type SearchParams = RawProductSearchParams;

/** Полная матрица бренд × категория (без поиска) — справочник допустимых значений. */
const loadCatalogMatrix = cache(async (): Promise<FacetRow[]> => {
  const rows = await prisma.product.groupBy({
    by: ["brand", "category"],
    where: { hidden: false },
    _count: { _all: true },
  });
  return rows.map((r) => ({ brand: r.brand, category: r.category, count: r._count._all }));
});

async function loadFilters(searchParams: SearchParams) {
  const matrix = await loadCatalogMatrix();
  const known = {
    // «Без бренда» — заглушка INCIDB, не бренд: в список фильтра не включаем
    brands: [...new Set(matrix.map((r) => r.brand))]
      .filter((b) => displayBrand(b) !== null)
      .sort(compareNames),
    categories: sortProductCategories([...new Set(matrix.map((r) => r.category))]),
  };
  return { matrix, known, filters: parseProductFilters(searchParams, known) };
}

function searchWhere(q: string): Prisma.ProductWhereInput {
  return q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
}

/** Заголовок посадочной — готовая строка для h1 и <title> (без добавок,
 *  чтобы не было дублей вида «разбор — разбор ингредиентов»). */
function landingTitle(filters: ProductFilters): string | null {
  const brand = filters.brands.length === 1 ? filters.brands[0] : null;
  const category = filters.categories.length === 1 ? filters.categories[0] : null;
  if (filters.brands.length > 1 || filters.categories.length > 1) return null;
  if (brand && category)
    return `${productCategoryPlural(category)} ${brandWithRu(brand)}: составы и разбор ингредиентов`;
  if (brand) return `Составы ${brandWithRu(brand)}: разбор ингредиентов`;
  if (category) return `${productCategoryPlural(category)}: составы и разбор ингредиентов`;
  return null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { filters } = await loadFilters(searchParams);
  const page = parsePage(searchParams.page);
  const landing = isIndexableFilterPage(filters) ? landingTitle(filters) : null;
  const pageSuffix = page > 1 ? ` — страница ${page}` : "";
  const canonical = productFiltersHref(filters, {}, { anchor: false, page });

  if (!isIndexableFilterPage(filters)) {
    // Мультивыбор и поиск — служебные состояния: не индексируем, но ходим по ссылкам.
    return {
      title: `Составы косметики: разбор средств по брендам${pageSuffix}`,
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }
  if (landing) {
    return {
      title: `${landing}${pageSuffix}`,
      description: `${landing}. Полный INCI-состав каждого средства с расшифровкой на русском — активы, комедогенные компоненты, отдушки, конфликты и аналоги по составу.`,
      alternates: { canonical },
    };
  }
  return {
    title: `Составы косметики: разбор средств по брендам${pageSuffix}`,
    description:
      "Разобранные составы популярной косметики: кремы, сыворотки, тоники, средства для умывания и SPF. Расшифровка каждого ингредиента, комедогенность, конфликты активов и аналоги по составу.",
    alternates: { canonical },
  };
}

function CategoryIcon({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const { tint } = productCategoryStyle(category);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        size === "md" ? "h-9 w-9 rounded-xl" : "h-6 w-6 rounded-full",
        tint
      )}
      aria-hidden
    >
      <svg className={cn("icon", size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5")}>
        <use href={`#cat-${category}`} />
      </svg>
    </span>
  );
}

/** Внутренности SVG иконки lucide — для <symbol> спрайта. Иконки категорий и
 *  стрелка карточки повторяются десятки раз на странице: инлайн-SVG с
 *  boilerplate-атрибутами весил ~0.6 КБ каждый, <use> — ~60 байт.
 *  lucide-react хранит иконку как forwardRef: render возвращает <svg>,
 *  дети которого — элементы path/circle/… c готовыми SVG-атрибутами. */
function iconBody(Icon: LucideIcon): string {
  const render = (Icon as unknown as { render: (props: object, ref: null) => ReactElement }).render;
  const svg = render({}, null);
  const serialize = (node: ReactNode): string =>
    Children.toArray(node)
      .map((child) => {
        const el = child as ReactElement<Record<string, unknown>>;
        const attrs = Object.entries(el.props)
          .filter(([k]) => k !== "children")
          .map(([k, v]) => ` ${k}="${String(v)}"`)
          .join("");
        const inner = el.props.children ? serialize(el.props.children as ReactNode) : "";
        return `<${el.type}${attrs}>${inner}</${el.type}>`;
      })
      .join("");
  return serialize(svg.props.children);
}

/** Скрытый SVG-спрайт иконок страницы каталога. */
function IconSprite({ categories }: { categories: readonly string[] }) {
  const symbols: Array<{ id: string; body: string }> = [
    { id: "icon-arrow-up-right", body: iconBody(ArrowUpRight) },
  ];
  const seen = new Set<string>();
  for (const c of categories) {
    if (seen.has(c)) continue;
    seen.add(c);
    symbols.push({ id: `cat-${c}`, body: iconBody(productCategoryStyle(c).icon) });
  }
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        {symbols.map((s) => (
          <symbol key={s.id} id={s.id} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: s.body }} />
        ))}
      </defs>
    </svg>
  );
}
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

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // «Без бренда» — заглушка INCIDB, не бренд: посадочной ?brand=Без бренда нет.
  const rawBrand = searchParams.brand;
  const noBrandRequested = (Array.isArray(rawBrand) ? rawBrand : [rawBrand]).some(
    (v): v is string => typeof v === "string" && v.trim().toLowerCase() === NO_BRAND.toLowerCase(),
  );
  if (noBrandRequested) notFound();

  const { matrix, known, filters } = await loadFilters(searchParams);
  const { q, brands, categories } = filters;
  const page = parsePage(searchParams.page);

  const where: Prisma.ProductWhereInput = {
    AND: [
      { hidden: false },
      searchWhere(q),
      brands.length ? { brand: { in: brands } } : {},
      categories.length ? { category: { in: categories } } : {},
    ],
  };

  const [products, total, searchFacets] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { _count: { select: { ingredients: true } } },
      orderBy: [{ brand: "asc" }, { name: "asc" }, { id: "asc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    // Матрица с учётом поиска — для фасетных счётчиков и живого счётчика панели.
    q
      ? prisma.product
          .groupBy({ by: ["brand", "category"], where: { AND: [{ hidden: false }, searchWhere(q)] }, _count: { _all: true } })
          .then((rows) =>
            rows.map((r) => ({ brand: r.brand, category: r.category, count: r._count._all }))
          )
      : Promise.resolve(matrix),
  ]);

  // Страница за пределами последней — 404 (а не пустая выдача).
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total > 0 && page > totalPages) notFound();

  const { byCategory } = facetCounts(searchFacets, brands, categories);
  // Бренды в панели: топ-50 по числу продуктов + уже выбранные (чтобы их можно
  // было снять). Остальные ~6 000 брендов находятся через поиск в панели —
  // он дозапрашивает /api/brands. Полный список known.brands остаётся
  // справочником допустимых значений для ?brand= в URL.
  const brandTotals = new Map<string, number>();
  for (const r of matrix) {
    brandTotals.set(r.brand, (brandTotals.get(r.brand) ?? 0) + r.count);
  }
  const topBrands = [...brandTotals.entries()]
    .sort((a, b) => b[1] - a[1] || compareNames(a[0], b[0]))
    .slice(0, 50)
    .map(([brand]) => brand);
  const sheetBrands = [...new Set([...topBrands, ...brands])].sort(compareNames);
  // Клиенту отдаём не всю матрицу (это сотни КБ HTML), а только строки брендов,
  // которые реально показаны в панели, плюс итоги по категориям по всем брендам
  // (строки ALL_BRANDS) — для счётчиков категорий и «Показать N».
  const sheetBrandSet = new Set(sheetBrands);
  const categoryTotals = new Map<string, number>();
  for (const r of searchFacets) {
    categoryTotals.set(r.category, (categoryTotals.get(r.category) ?? 0) + r.count);
  }
  const clientFacets: FacetRow[] = [
    ...[...categoryTotals.entries()].map(([category, count]) => ({
      brand: ALL_BRANDS,
      category,
      count,
    })),
    ...searchFacets.filter((r) => sheetBrandSet.has(r.brand)),
  ];
  const categoryOptions = known.categories.map((value) => ({
    value,
    label: productCategoryLabel(value),
  }));

  const totalProducts = matrix.reduce((sum, r) => sum + r.count, 0);
  const hasActiveFilters = Boolean(q || brands.length || categories.length);
  const landing = landingTitle(filters);
  const sheetKey = JSON.stringify(filters);

  const stats = [
    {
      value: totalProducts,
      label: pluralRu(totalProducts, "средство", "средства", "средств"),
    },
    {
      value: known.brands.length,
      label: pluralRu(known.brands.length, "бренд", "бренда", "брендов"),
    },
    {
      value: known.categories.length,
      label: pluralRu(known.categories.length, "категория", "категории", "категорий"),
    },
  ];

  return (
    <main className="min-h-screen bg-white pb-24">
      <IconSprite categories={known.categories} />
      {/* ── Шапка раздела ─────────────────────────────────────────────── */}
      <Container className="pb-10 pt-10 sm:pt-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <header className="space-y-4 lg:col-span-8">
            <span className="eyebrow">Каталог</span>
            <h1 className="font-display text-[32px] font-semibold leading-[1.1] sm:text-[44px]">
              {landing ?? "Составы косметики: разбор средств"}
            </h1>
            <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">
              Каждый продукт здесь разобран по составу: ингредиенты перечислены в
              порядке INCI-списка, для каждого указаны функция и уровень
              доказательности. Если в одном флаконе встречаются конфликтующие
              активы, мы показываем это отдельно — это важнее рекламных обещаний
              на упаковке.
            </p>
          </header>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 lg:col-span-4">
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

      {/* Липкая панель. На мобильных — без backdrop-blur: backdrop-filter делает
          предка containing block для position:fixed и «запер» бы нижний лист
          внутри панели. Пока лист открыт, панель поднимается над шапкой сайта. */}
      <div className="sticky top-[72px] z-30 border-y border-ink-hair bg-white has-[details[open]]:z-[60] sm:top-20 lg:bg-white/90 lg:backdrop-blur-md">
        <Container className="flex flex-wrap items-center gap-x-3 gap-y-2.5 py-3">
          <form
            action="/products#catalog"
            method="get"
            role="search"
            className="relative min-w-0 flex-1 lg:max-w-md"
          >
            {brands.map((b) => (
              <input key={b} type="hidden" name="brand" value={b} />
            ))}
            {categories.map((c) => (
              <input key={c} type="hidden" name="category" value={c} />
            ))}
            <label htmlFor="product-search" className="sr-only">
              Поиск по названию или бренду
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="product-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Найти средство"
              className="h-11 w-full rounded-lg border border-transparent bg-ink-wash pl-10 pr-4 text-[15px] text-foreground transition-colors placeholder:text-ink-muted hover:border-ink-line focus-visible:border-foreground focus-visible:bg-white focus-visible:outline-none"
            />
          </form>

          <ProductFilterSheet
            key={sheetKey}
            applied={filters}
            brands={sheetBrands}
            categories={categoryOptions}
            facets={clientFacets}
            className="shrink-0 lg:ml-auto"
          />

          {/* Категории — чипами в одно касание, второй строкой под поиском:
              на мобильных и узком десктопе — лента с горизонтальной прокруткой,
              с xl все категории видны сразу. */}
          <ChipRail
            aria-label="Категории"
            className="no-scrollbar -mx-6 flex w-[calc(100%+3rem)] items-center gap-1.5 overflow-x-auto px-6 sm:-mx-10 sm:w-[calc(100%+5rem)] sm:px-10 lg:mx-0 lg:w-full lg:px-0 xl:flex-wrap xl:overflow-visible"
          >
            <Link
              href={productFiltersHref(filters, { categories: [] })}
              aria-pressed={categories.length === 0}
              className="chip"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Все
            </Link>
            {known.categories.map((c) => {
              const active = categories.includes(c);
              const count = byCategory.get(c) ?? 0;
              return (
                <Link
                  key={c}
                  href={productFiltersHref(filters, { categories: toggleValue(categories, c) })}
                  aria-pressed={active}
                  className={cn("chip", "gap-2 pl-1.5", !active && count === 0 && "opacity-40")}
                >
                  <CategoryIcon category={c} size="sm" />
                  {productCategoryLabel(c)}
                  <span className="chip-count">{count}</span>
                </Link>
              );
            })}
          </ChipRail>
        </Container>
      </div>

      {/* ── Результаты ────────────────────────────────────────────────── */}
      <Container className="pt-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <p className="mr-2 text-sm text-ink-muted" aria-live="polite">
            <span className="text-base font-semibold text-foreground">{total}</span>{" "}
            {pluralRu(total, "средство", "средства", "средств")}
            {hasActiveFilters && ` из ${totalProducts}`}
          </p>
          {q && <ActiveChip href={productFiltersHref(filters, { q: "" })}>«{q}»</ActiveChip>}
          {brands.map((b) => (
            <ActiveChip key={b} href={productFiltersHref(filters, { brands: toggleValue(brands, b) })}>
              {b}
            </ActiveChip>
          ))}
          {categories.map((c) => (
            <ActiveChip
              key={c}
              href={productFiltersHref(filters, { categories: toggleValue(categories, c) })}
            >
              {productCategoryLabel(c)}
            </ActiveChip>
          ))}
          {[q, ...brands, ...categories].filter(Boolean).length > 1 && (
            <Link
              href="/products#catalog"
              className="ml-1 text-sm font-semibold text-foreground underline underline-offset-4 hover:text-brand-700"
            >
              Сбросить всё
            </Link>
          )}
        </div>

        {products.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product.id} className="min-w-0">
                <Link href={`/products/${product.slug}`} className="product-card">
                  <div className="product-card-top">
                    <span className="product-card-category">
                      <CategoryIcon category={product.category} />
                      <span>{productCategoryLabel(product.category)}</span>
                    </span>
                    <svg className="icon product-card-arrow" aria-hidden>
                      <use href="#icon-arrow-up-right" />
                    </svg>
                  </div>
                  {displayBrand(product.brand) && (
                    <p className="product-card-brand">{product.brand}</p>
                  )}
                  <h2 className="product-card-name">{product.name}</h2>
                  <p className="product-card-ingredients">
                    {product._count.ingredients}{" "}
                    {pluralRu(
                      product._count.ingredients,
                      "ингредиент распознан",
                      "ингредиента распознано",
                      "ингредиентов распознано"
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-line px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-wash">
              <SearchX className="h-6 w-6 text-ink-muted" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Ничего не нашли</h2>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Уберите один из фильтров или проверьте написание. Если нужного средства
              нет в каталоге — вставьте его состав в разбор, это займёт минуту.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/products#catalog"
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

        {/* Постраничная навигация: обычные ссылки, чтобы робот проходил страницы. */}
        {totalPages > 1 && (
          <nav
            aria-label="Страницы каталога"
            className="mt-10 flex items-center justify-center gap-4"
          >
            {page > 1 ? (
              <Link
                href={productFiltersHref(filters, {}, { page: page - 1 })}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-hair px-4 text-sm font-semibold transition-colors hover:border-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Назад
              </Link>
            ) : (
              <span
                aria-hidden
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-hair px-4 text-sm font-semibold text-ink-faint"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Назад
              </span>
            )}
            <span className="text-sm text-ink-muted">
              Страница {page} из {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={productFiltersHref(filters, {}, { page: page + 1 })}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-hair px-4 text-sm font-semibold transition-colors hover:border-foreground"
              >
                Вперёд <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <span
                aria-hidden
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-hair px-4 text-sm font-semibold text-ink-faint"
              >
                Вперёд <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            )}
          </nav>
        )}
      </Container>
    </main>
  );
}
