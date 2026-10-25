import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FlaskConical, ShieldAlert } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { displayBrand } from "@/lib/products/brand";
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
import { JsonLd } from "@/components/seo/json-ld";
import { brandRu, brandWithRu } from "@/lib/seo/brands";
import { productCategoryPlural } from "@/lib/seo/product-categories";
import { productFiltersQuery } from "@/lib/products/catalog-filters";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  clampDescription,
  faqJsonLd,
  inciTitle,
  type FaqItem,
  withFreeNote,
} from "@/lib/seo/site";
import { pluralRu } from "@/lib/utils";

// ISR: страница кэшируется на 1 час и рендерится по запросу (без пререндера
// на сборке — иначе next build прогоняет сотни страниц через БД и упирается
// в 45-минутный лимит Vercel)
export const dynamicParams = true;
export const revalidate = 3600;

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

/**
 * Похожие по составу средства: доля общих ингредиентов (коэффициент Жаккара).
 * Отвечает на запросы «аналоги по составу» и связывает карточки перелинковкой.
 */
async function getSimilarProductsUncached(productId: string, ingredientIds: string[]) {
  if (ingredientIds.length < 3) return [];
  const shared = await prisma.productIngredient.groupBy({
    by: ["productId"],
    where: { ingredientId: { in: ingredientIds }, productId: { not: productId } },
    _count: { _all: true },
  });
  // Кандидатов у популярных ингредиентов (aqua и т.п.) десятки тысяч —
  // без ограничения findMany упирается в лимит БД на 32767 bind-переменных.
  // Берём топ-200 по числу общих ингредиентов: для топ-4 по Жаккару этого
  // достаточно, а запрос остаётся дешёвым.
  const candidates = shared
    .filter((r) => r._count._all >= 3)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 200);
  if (candidates.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: candidates.map((c) => c.productId) }, hidden: false },
    select: { id: true, slug: true, brand: true, name: true, _count: { select: { ingredients: true } } },
  });
  const sharedBy = new Map(candidates.map((c) => [c.productId, c._count._all]));
  return products
    .map((p) => {
      const common = sharedBy.get(p.id) ?? 0;
      const union = ingredientIds.length + p._count.ingredients - common;
      return { ...p, common, score: union > 0 ? common / union : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/**
 * Кэш «похожих» на 24 ч по productId: groupBy по всей ProductIngredient
 * (42 тыс. продуктов × сотни тысяч связей) — тяжёлый запрос, боты не должны
 * гонять его на каждый показ страницы.
 */
const getSimilarProducts = (productId: string, ingredientIds: string[]) =>
  unstable_cache(
    () => getSimilarProductsUncached(productId, ingredientIds),
    ["similar-products", productId],
    { revalidate: 86_400, tags: [`similar-${productId}`] },
  )();

/** Категории, которые считаются «работающими» активами в сводке. */
const ACTIVE_CATEGORIES = new Set(["active", "peptide", "antioxidant", "uv-filter"]);

/**
 * Тип средства с заглавной буквы для title/H1 («Шампунь»), если тип есть
 * и его ещё нет в названии (без учёта регистра) — у одноимённых вариантов
 * тип уже в имени: «… (маска для волос)».
 */
function typeTitle(product: { productType: string | null; name: string }): string | null {
  const t = product.productType?.trim();
  if (!t) return null;
  if (product.name.toLowerCase().includes(t.toLowerCase())) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      ingredients: {
        include: { ingredient: { select: { displayName: true, category: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!product) return { title: "Продукт не найден", robots: { index: false } };
  // покрытие распознавания (0 = карточка вне INCIDB, состав курируемый — считаем полным)
  const coverage = product.ingredientsTotal > 0 ? product.ingredientsRecognized / product.ingredientsTotal : 1;
  const brand = displayBrand(product.brand);
  const full = [brand, product.name].filter(Boolean).join(" ");
  const type = typeTitle(product);
  const fullWithType = type ? `${type} ${full}` : full;
  const title = `${fullWithType}: состав и разбор ингредиентов`;
  const actives = product.ingredients
    .filter((pi) => ACTIVE_CATEGORIES.has(pi.ingredient.category))
    .slice(0, 3)
    .map((pi) => pi.ingredient.displayName.toLowerCase());
  const n = product.ingredients.length;
  const description = clampDescription(
    withFreeNote(
      `${type ? `${fullWithType}` : `Состав ${brand ? `${brandWithRu(brand)} ` : ""}${product.name}`}: расшифровка ${n} ${pluralRu(
        n,
        "ингредиента",
        "ингредиентов",
        "ингредиентов"
      )} на русском${
        actives.length ? `, ключевые активы — ${actives.join(", ")}` : ""
      }. Комедогенные компоненты, отдушки, конфликты и аналоги по составу.`
    )
  );
  const path = `/products/${product.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: "article", url: path },
    // скрытые из каталога (не-косметика) и состав, распознанный меньше чем
    // наполовину, — не для индексации; страница остаётся доступной (не 404)
    ...(product.hidden || coverage < 0.5 ? { robots: { index: false, follow: true } } : {}),
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
  const [conflicts, similar] = await Promise.all([
    getInternalConflicts(ingredientIds),
    getSimilarProducts(product.id, ingredientIds),
  ]);

  const brand = displayBrand(product.brand);
  const full = [brand, product.name].filter(Boolean).join(" ");
  const type = typeTitle(product);
  const fullWithType = type ? `${type} ${full}` : full;
  const path = `/products/${product.slug}`;
  const ru = brandRu(product.brand);
  const list = product.ingredients.map((pi) => pi.ingredient);
  const inciList = list.map((i) => inciTitle(i.inciName)).join(", ");
  const actives = list.filter(
    (i) => ACTIVE_CATEGORIES.has(i.category) && (i.evidenceLevel === "STRONG" || i.evidenceLevel === "MODERATE")
  );
  const comedogenic = list.filter((i) => i.comedogenic);
  const allergens = list.filter((i) => i.fragranceAllergen || i.category === "fragrance");
  const malassezia = list.filter((i) => i.feedsMalassezia);
  const names = (items: typeof list) => items.map((i) => i.displayName).join(", ");
  const n = list.length;
  const nWord = `${n} ${pluralRu(n, "ингредиент", "ингредиента", "ингредиентов")}`;
  // полнота состава: 0 в ingredientsTotal = курируемая карточка вне INCIDB (считаем полной)
  const coverageKnown = product.ingredientsTotal > 0;
  const coverage = coverageKnown ? product.ingredientsRecognized / product.ingredientsTotal : 1;
  const incomplete = coverage < 0.8; // порог баннера из аудита импорта INCIDB
  const partialNote = " в распознанной части состава";
  const brandHref = brand ? `/products?${productFiltersQuery({ brands: [brand] })}` : null;
  const categoryHref = `/products?${productFiltersQuery({ categories: [product.category] })}`;

  const summary: { label: string; value: string; tone: "ok" | "warn" | "neutral" }[] = [
    coverageKnown
      ? {
          label: "Распознано компонентов",
          value: `${product.ingredientsRecognized} из ${product.ingredientsTotal}`,
          tone: incomplete ? "warn" : "neutral",
        }
      : { label: "Разобрано ингредиентов", value: String(n), tone: "neutral" },
    {
      label: "Активы с доказанным действием",
      value: actives.length ? names(actives) : "нет",
      tone: actives.length ? "ok" : "neutral",
    },
    {
      label: "Комедогенные компоненты",
      value: comedogenic.length
        ? names(comedogenic)
        : incomplete
          ? `не найдены${partialNote}`
          : "не найдены",
      tone: comedogenic.length ? "warn" : incomplete ? "neutral" : "ok",
    },
    {
      label: "Отдушки и аллергены",
      value: allergens.length
        ? names(allergens)
        : incomplete
          ? `не найдены${partialNote}`
          : "не найдены",
      tone: allergens.length ? "warn" : incomplete ? "neutral" : "ok",
    },
    {
      label: "Конфликты внутри формулы",
      value: conflicts.length
        ? String(conflicts.length)
        : incomplete
          ? `нет${partialNote}`
          : "нет",
      tone: conflicts.length ? "warn" : incomplete ? "neutral" : "ok",
    },
  ];

  const faq: FaqItem[] = [
    {
      q: `Какой состав у ${full}?`,
      a: `В нашей базе разобрано ${nWord} этого средства${
        coverageKnown
          ? ` (распознано ${product.ingredientsRecognized} из ${product.ingredientsTotal} компонентов с этикетки)`
          : ""
      }: ${inciList}. Функция и доказательная база каждого — в разделе «Ингредиенты с расшифровкой».${
        incomplete ? " Состав распознан не полностью — сверьтесь с упаковкой." : ""
      }`,
    },
    {
      q: `Хороший ли состав у ${full}?`,
      a: `Мы не ставим оценку «хорошо/плохо» — она зависит от вашей кожи. По данным${
        incomplete ? " распознанной части состава" : ""
      }: ${
        actives.length
          ? `активы с доказанным действием — ${names(actives)}`
          : "активов с сильной или умеренной доказательной базой нет"
      }; ${
        comedogenic.length ? `комедогенные компоненты — ${names(comedogenic)}` : "комедогенных компонентов не найдено"
      }; ${allergens.length ? `отдушки и аллергены — ${names(allergens)}` : "отдушек и аллергенов нет"}${
        malassezia.length ? `; компоненты, питающие малассезию, — ${names(malassezia)}` : ""
      }.`,
    },
    {
      q: `Есть ли конфликты активов в ${full}?`,
      a: conflicts.length
        ? `Да: ${conflicts
            .map((c) => `${c.ingredientA.displayName} + ${c.ingredientB.displayName}`)
            .join("; ")}. Подробности — в разделе «Конфликты внутри формулы».`
        : `Зафиксированных конфликтов между ингредиентами этой формулы нет${
            incomplete ? " (по распознанной части состава)" : ""
          }.`,
    },
  ];
  if (similar.length > 0) {
    faq.push({
      q: `Какие есть аналоги ${full} по составу?`,
      a: `Ближе всего по составу: ${similar.map((p) => `${p.brand} ${p.name}`).join(", ")}.`,
    });
  }

  const crumbs = [
    { name: "Продукты", path: "/products" },
    ...(brand && brandHref ? [{ name: brand, path: brandHref }] : []),
    { name: product.name, path },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: full,
    alternateName: ru ? `${ru} ${product.name}` : undefined,
    // заглушка «Без бренда» — не бренд: поле brand не выводим
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    category: PRODUCT_CATEGORY_LABEL[product.category] ?? product.category,
    url: absoluteUrl(path),
    description: product.productType
      ? `${fullWithType}. Состав: ${inciList}`
      : `Состав: ${inciList}`,
  };

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={faqJsonLd(faq)} />
      <Container className="space-y-8">
        <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-brand">
            Продукты
          </Link>
          {brand && brandHref && (
            <>
              <span className="mx-2">/</span>
              <Link href={brandHref} className="hover:text-brand">
                {brand}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </nav>

        <GlassCard className="space-y-4 p-8">
          <div className="flex flex-wrap items-center gap-2">
            {brand && (
              <Link
                href={`/products?${new URLSearchParams({ brand })}`}
                title={`Все средства ${brand}`}
              >
                <Badge variant="default" className="transition-colors hover:bg-ink-hair">
                  {brand}
                </Badge>
              </Link>
            )}
            <Link href={categoryHref} title={productCategoryPlural(product.category)}>
              <Badge variant="outline" className="transition-colors hover:bg-ink-hair">
                {PRODUCT_CATEGORY_LABEL[product.category] ?? product.category}
              </Badge>
            </Link>
            {product.productType && (
              <Badge variant="outline" className="text-ink-muted">
                {product.productType}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[36px]">
            <span className="text-ink-muted">Состав:</span> {fullWithType}
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Разбор состава {brand ? `${brandWithRu(brand)} ` : ""}{product.name}: распознанные
            ингредиенты в порядке INCI-списка — от самых высоких концентраций к самым
            низким. Для каждого компонента указаны функция и уровень доказательности.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={`/go/${product.id}?source=product_page`} data-ym-goal="where_to_buy">
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
          {coverageKnown && (
            <p className="text-sm text-muted-foreground">
              Распознано {product.ingredientsRecognized} из {product.ingredientsTotal}{" "}
              компонентов с этикетки.
            </p>
          )}
        </GlassCard>

        {incomplete && (
          <GlassCard className="border-amber-300 bg-amber-50 p-6" role="alert">
            <p className="font-semibold text-amber-800">
              Состав распознан не полностью
            </p>
            <p className="mt-1 text-sm text-amber-800">
              На этикетке {product.ingredientsTotal} компонентов, в нашей базе распознано{" "}
              {product.ingredientsRecognized}. Разбор может быть неточным: аллергены,
              консерванты или кислоты могли остаться в нераспознанной части — сверьтесь
              с упаковкой (исходный текст состава ниже).
            </p>
          </GlassCard>
        )}

        <GlassCard className="space-y-4 p-8">
          <h2 className="font-display text-2xl font-bold">Коротко о составе</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {summary.map((row) => (
              <div key={row.label} className="rounded-2xl bg-white p-4">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd
                  className={
                    row.tone === "warn"
                      ? "mt-1 font-semibold text-coral-700"
                      : row.tone === "ok"
                        ? "mt-1 font-semibold text-success-700"
                        : "mt-1 font-semibold"
                  }
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
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
                    className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4"
                  >
                    <Link
                      href={`/ingredients/${c.ingredientA.slug}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {c.ingredientA.displayName}
                    </Link>
                    <span className="text-muted-foreground">+</span>
                    <Link
                      href={`/ingredients/${c.ingredientB.slug}`}
                      className="font-semibold text-brand hover:underline"
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
            <FlaskConical className="h-5 w-5 text-brand" />
            Ингредиенты с расшифровкой ({product.ingredients.length})
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {product.ingredients.map((pi) => {
              const ingredient = pi.ingredient;
              const evidence = EVIDENCE_LABEL[ingredient.evidenceLevel];
              return (
                <li key={pi.id}>
                  <Link href={`/ingredients/${ingredient.slug}`}>
                    <div className="h-full space-y-2 rounded-2xl bg-white p-4 transition-shadow hover:shadow-glass">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-brand">
                          {inciTitle(ingredient.inciName)}
                          {ingredient.displayName.trim().toLowerCase() !==
                            ingredient.inciName.trim().toLowerCase() && (
                            <span className="block text-sm font-normal text-muted-foreground">
                              {ingredient.displayName}
                            </span>
                          )}
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

        <GlassCard className="space-y-4 p-8">
          <h2 className="font-display text-2xl font-bold">Состав (INCI)</h2>
          <p className="max-w-3xl leading-relaxed text-muted-foreground">{inciList}</p>
          <Button asChild variant="outline">
            <Link href={`/analyze?text=${encodeURIComponent(inciList)}`} rel="nofollow">
              Открыть в разборе состава
            </Link>
          </Button>
          {product.rawIngredients && (
            <details className="accordion-item border-t border-ink-hair pt-4">
              <summary>Состав с упаковки (исходный текст)</summary>
              <p className="max-w-3xl whitespace-pre-line pb-2 pt-3 text-[15px] leading-relaxed text-ink-muted">
                {product.rawIngredients}
              </p>
            </details>
          )}
        </GlassCard>

        {similar.length > 0 && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="font-display text-2xl font-bold">Похожие по составу средства</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {similar.map((p) => {
                const pb = displayBrand(p.brand);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/products/${p.slug}`}
                      className="block rounded-2xl bg-white p-4 transition-shadow hover:shadow-glass"
                    >
                      {pb && <span className="text-sm text-muted-foreground">{pb}</span>}
                      <span className="block font-semibold text-brand">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Общих ингредиентов: {p.common}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        )}

        <GlassCard className="space-y-4 p-8">
          <h2 className="font-display text-2xl font-bold">Частые вопросы</h2>
          <div className="divide-y divide-ink-hair border-y border-ink-hair">
            {faq.map((f, i) => (
              <details key={f.q} open={i === 0} className="accordion-item">
                <summary>{f.q}</summary>
                <p className="max-w-3xl pb-5 pr-10 text-[15px] leading-relaxed text-ink-muted">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </GlassCard>
      </Container>
    </main>
  );
}
