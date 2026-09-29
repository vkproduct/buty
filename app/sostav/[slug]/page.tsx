import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyzeForm } from "@/components/analyze-form";
import { JsonLd } from "@/components/seo/json-ld";
import {
  FaqList,
  IngredientGrid,
  LandingSections,
  ProductGrid,
  RelatedLandings,
  type IngredientCardData,
  type ProductCardData,
} from "@/components/seo/landing-blocks";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";
import { getLanding, type Landing } from "@/lib/seo/landings";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, SITE_NAME } from "@/lib/seo/site";

// Текст статичный, блоки ингредиентов и продуктов — из БД: ISR по запросу,
// без пререндера на сборке (сборка не должна зависеть от БД).
export const revalidate = 3600;

const INGREDIENT_SELECT = {
  slug: true,
  displayName: true,
  inciName: true,
  category: true,
  function: true,
  evidenceLevel: true,
  typicalConc: true,
} as const;

/** Ингредиенты посадочной в заданном порядке; при недоступной БД — пусто. */
async function loadIngredients(landing: Landing): Promise<IngredientCardData[]> {
  try {
    if (landing.ingredientFlag) {
      return await prisma.ingredient.findMany({
        where: { comedogenic: true },
        select: INGREDIENT_SELECT,
        orderBy: { displayName: "asc" },
      });
    }
    const rows = await prisma.ingredient.findMany({
      where: { slug: { in: landing.ingredientSlugs } },
      select: INGREDIENT_SELECT,
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    return landing.ingredientSlugs.flatMap((s) => bySlug.get(s) ?? []);
  } catch {
    return [];
  }
}

async function loadProducts(landing: Landing): Promise<ProductCardData[]> {
  if (landing.productCategories.length === 0) return [];
  try {
    return await prisma.product.findMany({
      where: { category: { in: landing.productCategories } },
      select: { slug: true, brand: true, name: true, category: true },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      take: 8,
    });
  } catch {
    return [];
  }
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const landing = getLanding(params.slug);
  if (!landing) return { title: "Страница не найдена", robots: { index: false } };
  const path = `/sostav/${landing.slug}`;
  return {
    title: { absolute: `${landing.title} | ${SITE_NAME}` },
    description: landing.description,
    alternates: { canonical: path },
    openGraph: {
      title: landing.title,
      description: landing.description,
      type: "article",
      url: path,
    },
  };
}

export default async function LandingPage({ params }: { params: { slug: string } }) {
  const landing = getLanding(params.slug);
  if (!landing) notFound();

  const [ingredients, products] = await Promise.all([
    loadIngredients(landing),
    loadProducts(landing),
  ]);
  const path = `/sostav/${landing.slug}`;
  const crumbs = [
    { name: "Составы косметики", path: "/sostav" },
    { name: landing.nav, path },
  ];
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: landing.h1,
    description: landing.description,
    url: absoluteUrl(path),
    inLanguage: "ru",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
  };

  return (
    <main className="min-h-screen bg-white pb-24">
      <JsonLd data={webPage} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={faqJsonLd(landing.faq)} />

      <Container className="pt-8 sm:pt-10">
        <nav aria-label="Хлебные крошки" className="text-sm text-ink-muted">
          <Link href="/sostav" className="hover:text-brand-700">
            Составы косметики
          </Link>
          <span className="mx-2">/</span>
          <span>{landing.nav}</span>
        </nav>
      </Container>

      <Container className="grid gap-10 pb-12 pt-6 lg:grid-cols-12 lg:gap-14">
        <header className="space-y-4 lg:col-span-7">
          <span className="eyebrow">Разбор состава</span>
          <h1 className="font-display text-[30px] font-semibold leading-[1.1] sm:text-[42px]">
            {landing.h1}
          </h1>
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">{landing.lead}</p>
        </header>
        <div
          id="razbor"
          className="scroll-mt-28 rounded-3xl border border-ink-hair bg-white p-6 shadow-pop sm:p-8 lg:col-span-5"
        >
          <h2 className="text-[20px] font-semibold">Проверить состав онлайн</h2>
          <p className="mb-5 mt-1.5 text-[15px] leading-relaxed text-ink-muted">
            Вставьте INCI-список — расшифруем каждый ингредиент на русском.
            Бесплатно и без регистрации.
          </p>
          <AnalyzeForm id={`inci-${landing.slug}`} rows={4} />
        </div>
      </Container>

      <Container className="grid gap-14 lg:grid-cols-12">
        <article className="space-y-14 lg:col-span-8">
          <LandingSections sections={landing.sections} />

          {ingredients.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-[22px] font-semibold leading-tight sm:text-[26px]">
                {landing.ingredientFlag === "comedogenic"
                  ? "Комедогенные ингредиенты: список"
                  : "Ключевые ингредиенты с расшифровкой"}
              </h2>
              <IngredientGrid items={ingredients} />
            </section>
          )}

          {products.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-[22px] font-semibold leading-tight sm:text-[26px]">
                Разобранные составы средств
              </h2>
              <ProductGrid items={products} />
            </section>
          )}

          <FaqList items={landing.faq} />
        </article>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl bg-ink-wash p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-semibold">Другие разборы составов</h2>
            <RelatedLandings current={landing.slug} className="mt-4" />
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">
              Все ингредиенты с функциями, концентрациями и доказательной базой — в{" "}
              <Link href="/ingredients" className="font-medium text-foreground underline">
                справочнике ингредиентов
              </Link>
              .
            </p>
          </div>
        </aside>
      </Container>
    </main>
  );
}
