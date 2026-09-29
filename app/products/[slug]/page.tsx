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
async function getSimilarProducts(productId: string, ingredientIds: string[]) {
  if (ingredientIds.length < 3) return [];
  const shared = await prisma.productIngredient.groupBy({
    by: ["productId"],
    where: { ingredientId: { in: ingredientIds }, productId: { not: productId } },
    _count: { _all: true },
  });
  const candidates = shared.filter((r) => r._count._all >= 3);
  if (candidates.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: candidates.map((c) => c.productId) } },
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

/** Категории, которые считаются «работающими» активами в сводке. */
const ACTIVE_CATEGORIES = new Set(["active", "peptide", "antioxidant", "uv-filter"]);

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
  const full = `${product.brand} ${product.name}`;
  const title = `${full}: состав и разбор ингредиентов`;
  const actives = product.ingredients
    .filter((pi) => ACTIVE_CATEGORIES.has(pi.ingredient.category))
    .slice(0, 3)
    .map((pi) => pi.ingredient.displayName.toLowerCase());
  const n = product.ingredients.length;
  const description = clampDescription(
    `Состав ${brandWithRu(product.brand)} ${product.name}: расшифровка ${n} ${pluralRu(
      n,
      "ингредиента",
      "ингредиентов",
      "ингредиентов"
    )} на русском${
      actives.length ? `, ключевые активы — ${actives.join(", ")}` : ""
    }. Комедогенные компоненты, отдушки, конфликты и аналоги по составу.`
  );
  const path = `/products/${product.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: "article", url: path },
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

  const full = `${product.brand} ${product.name}`;
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
  const brandHref = `/products?${productFiltersQuery({ brands: [product.brand] })}`;
  const categoryHref = `/products?${productFiltersQuery({ categories: [product.category] })}`;

  const summary: { label: string; value: string; tone: "ok" | "warn" | "neutral" }[] = [
    { label: "Разобрано ингредиентов", value: String(n), tone: "neutral" },
    {
      label: "Активы с доказанным действием",
      value: actives.length ? names(actives) : "нет",
      tone: actives.length ? "ok" : "neutral",
    },
    {
      label: "Комедогенные компоненты",
      value: comedogenic.length ? names(comedogenic) : "не найдены",
      tone: comedogenic.length ? "warn" : "ok",
    },
    {
      label: "Отдушки и аллергены",
      value: allergens.length ? names(allergens) : "не найдены",
      tone: allergens.length ? "warn" : "ok",
    },
    {
      label: "Конфликты внутри формулы",
      value: conflicts.length ? String(conflicts.length) : "нет",
      tone: conflicts.length ? "warn" : "ok",
    },
  ];

  const faq: FaqItem[] = [
    {
      q: `Какой состав у ${full}?`,
      a: `В нашей базе разобрано ${nWord} этого средства: ${inciList}. Функция и доказательная база каждого — в разделе «Ингредиенты с расшифровкой».`,
    },
    {
      q: `Хороший ли состав у ${full}?`,
      a: `Мы не ставим оценку «хорошо/плохо» — она зависит от вашей кожи. По данным: ${
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
        : "Зафиксированных конфликтов между ингредиентами этой формулы нет.",
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
    { name: product.brand, path: brandHref },
    { name: product.name, path },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: full,
    alternateName: ru ? `${ru} ${product.name}` : undefined,
    brand: { "@type": "Brand", name: product.brand },
    category: PRODUCT_CATEGORY_LABEL[product.category] ?? product.category,
    url: absoluteUrl(path),
    description: `Состав: ${inciList}`,
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
          <span className="mx-2">/</span>
          <Link href={brandHref} className="hover:text-brand">
            {product.brand}
          </Link>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </nav>

        <GlassCard className="space-y-4 p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/products?${new URLSearchParams({ brand: product.brand })}`}
              title={`Все средства ${product.brand}`}
            >
              <Badge variant="default" className="transition-colors hover:bg-ink-hair">
                {product.brand}
              </Badge>
            </Link>
            <Link href={categoryHref} title={productCategoryPlural(product.category)}>
              <Badge variant="outline" className="transition-colors hover:bg-ink-hair">
                {PRODUCT_CATEGORY_LABEL[product.category] ?? product.category}
              </Badge>
            </Link>
          </div>
          <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[36px]">
            <span className="text-ink-muted">Состав</span> {full}
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Разбор состава {brandWithRu(product.brand)} {product.name}: распознанные
            ингредиенты в порядке INCI-списка — от самых высоких концентраций к самым
            низким. Для каждого компонента указаны функция и уровень доказательности.
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

        <GlassCard className="space-y-4 p-8">
          <h2 className="font-display text-2xl font-bold">Состав (INCI)</h2>
          <p className="max-w-3xl leading-relaxed text-muted-foreground">{inciList}</p>
          <Button asChild variant="outline">
            <Link href={`/analyze?text=${encodeURIComponent(inciList)}`} rel="nofollow">
              Открыть в разборе состава
            </Link>
          </Button>
        </GlassCard>

        {similar.length > 0 && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="font-display text-2xl font-bold">Похожие по составу средства</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {similar.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/products/${p.slug}`}
                    className="block rounded-2xl bg-white p-4 transition-shadow hover:shadow-glass"
                  >
                    <span className="text-sm text-muted-foreground">{p.brand}</span>
                    <span className="block font-semibold text-brand">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Общих ингредиентов: {p.common}
                    </span>
                  </Link>
                </li>
              ))}
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
