import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Atom, FlaskConical, ShieldAlert, Sparkles } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABEL,
  EVIDENCE_LABEL,
  EVIDENCE_META,
  SEVERITY_LABEL,
} from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { IngredientFlags } from "@/components/ingredients/ingredient-flags";
import { FLAG_META } from "@/lib/ingredients/flags";
import { ingredientFiltersQuery } from "@/lib/ingredients/catalog-filters";
import { CATEGORY_PLURAL } from "@/lib/seo/ingredient-categories";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  clampDescription,
  faqJsonLd,
  inciTitle,
  lowerFirst,
  type FaqItem,
} from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";

// ISR: страница кэшируется на 1 час и рендерится по запросу (без пререндера
// на сборке — иначе next build прогоняет сотни страниц через БД и упирается
// в 45-минутный лимит Vercel)
export const dynamicParams = true;
export const revalidate = 3600;

async function getIngredient(slug: string) {
  return prisma.ingredient.findUnique({
    where: { slug },
    include: {
      synonyms: { select: { alias: true } },
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

/**
 * Другие написания ингредиента в составе: латиница и кириллица без дублей INCI —
 * отвечают на запросы «как обозначается … в составе».
 */
function otherNames(inciName: string, displayName: string, aliases: string[]): string[] {
  const seen = new Set([inciName.toLowerCase(), displayName.toLowerCase()]);
  const out: string[] = [];
  for (const a of aliases) {
    const key = a.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(/^[A-Z0-9 ,/().&+-]+$/.test(a) ? inciTitle(a) : a);
  }
  return out.slice(0, 12);
}

type IngredientWithRelations = NonNullable<Awaited<ReturnType<typeof getIngredient>>>;

/** Вопросы-ответы из данных карточки: те же формулировки, что в поисковых запросах. */
function buildFaq(
  ingredient: IngredientWithRelations,
  names: string[],
  conflictNames: string[]
): FaqItem[] {
  const name = ingredient.displayName;
  const inci = inciTitle(ingredient.inciName);
  const faq: FaqItem[] = [
    {
      q: `Как ${name} обозначается в составе косметики?`,
      a: `В INCI-списке на упаковке — ${inci}.${
        names.length ? ` Также встречается как: ${names.join(", ")}.` : ""
      } Ингредиенты перечислены по убыванию концентрации (для компонентов от 1%), поэтому чем ближе ${inci} к началу списка, тем его больше в средстве.`,
    },
    {
      q: `Для чего ${name} в составе косметики?`,
      a: `${ingredient.function}. ${ingredient.description}`,
    },
  ];
  if (ingredient.typicalConc) {
    faq.push({
      q: `Какая концентрация ${name} работает?`,
      a: `Типичная рабочая концентрация по исследованиям — ${ingredient.typicalConc}. Производители обычно не раскрывают точный процент, ориентируйтесь на позицию ингредиента в составе.`,
    });
  }
  faq.push({
    q: `${name} комедогенен?`,
    a: ingredient.comedogenic
      ? `Да, для ${name} есть опубликованные данные о комедогенности. ${FLAG_META.comedogenic.note} Если кожа склонна к закрытым комедонам, следите за реакцией.`
      : `В нашей базе ${name} не отмечен как комедогенный: опубликованных данных о закупорке пор нет. Реакция кожи индивидуальна — новое средство вводите по одному.`,
  });
  faq.push({
    q: `С чем нельзя сочетать ${name}?`,
    a: conflictNames.length
      ? `Зафиксированные конфликты: ${conflictNames.join(", ")}. Подробности и уровень риска — в разделе «С чем конфликтует».`
      : `Зафиксированных конфликтов с другими активами в нашей базе нет.`,
  });
  faq.push({
    q: `Доказано ли действие ${name}?`,
    a: `${EVIDENCE_LABEL[ingredient.evidenceLevel].label}: ${lowerFirst(
      EVIDENCE_META[ingredient.evidenceLevel].note
    )}.`,
  });
  return faq;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const ingredient = await prisma.ingredient.findUnique({
    where: { slug: params.slug },
  });
  if (!ingredient) return { title: "Ингредиент не найден", robots: { index: false } };
  const inci = inciTitle(ingredient.inciName);
  const same = ingredient.displayName.toLowerCase() === inci.toLowerCase();
  const title = same
    ? `${ingredient.displayName} в составе косметики: что это, свойства и действие`
    : `${ingredient.displayName} (${inci}) в составе косметики: что это и как действует`;
  const description = clampDescription(
    `${ingredient.displayName} (${inci}) — ${lowerFirst(ingredient.function)}. Как обозначается в составе, рабочая концентрация${
      ingredient.typicalConc ? ` ${ingredient.typicalConc}` : ""
    }, комедогенность, с чем сочетать и с чем нельзя.`
  );
  const path = `/ingredients/${ingredient.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: "article", url: path },
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
  const inci = inciTitle(ingredient.inciName);
  const names = otherNames(
    ingredient.inciName,
    ingredient.displayName,
    ingredient.synonyms.map((s) => s.alias)
  );
  const faq = buildFaq(
    ingredient,
    names,
    conflicts.map((c) => c.other.displayName)
  );
  const categoryPlural = CATEGORY_PLURAL[ingredient.category];
  const categoryHref = `/ingredients?${ingredientFiltersQuery({ categories: [ingredient.category] })}`;
  const path = `/ingredients/${ingredient.slug}`;
  const crumbs = [
    { name: "Ингредиенты", path: "/ingredients" },
    ...(categoryPlural ? [{ name: categoryPlural, path: categoryHref }] : []),
    { name: ingredient.displayName, path },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${ingredient.displayName} (${ingredient.inciName})`,
    description: ingredient.description,
    url: absoluteUrl(path),
    inLanguage: "ru",
    about: {
      "@type": "Substance",
      name: inci,
      alternateName: [ingredient.displayName, ...names],
    },
    lastReviewed: new Date().toISOString().slice(0, 10),
  };

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={faqJsonLd(faq)} />
      <Container className="space-y-8">
        <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground">
          <Link href="/ingredients" className="hover:text-brand">
            Ингредиенты
          </Link>
          {categoryPlural && (
            <>
              <span className="mx-2">/</span>
              <Link href={categoryHref} className="hover:text-brand">
                {categoryPlural}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span>{inciTitle(ingredient.inciName)}</span>
        </nav>

        <GlassCard className="space-y-4 p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              {CATEGORY_LABEL[ingredient.category] ?? ingredient.category}
            </Badge>
            <Badge variant={evidence.variant}>{evidence.label}</Badge>
            <IngredientFlags flags={ingredient} />
            {ingredient.typicalConc && (
              <Badge variant="outline">
                Рабочая концентрация: {ingredient.typicalConc}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[36px]">
            {inciTitle(ingredient.inciName)}{" "}
            <span className="text-ink-muted">в составе косметики</span>
          </h1>
          {ingredient.displayName.trim().toLowerCase() !==
            ingredient.inciName.trim().toLowerCase() && (
            <p className="font-display text-xl font-medium text-ink-soft sm:text-2xl">
              {ingredient.displayName}
            </p>
          )}
          {names.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Другие названия в составе: {names.join(", ")}
            </p>
          )}
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

        {(ingredient.comedogenic ||
          ingredient.feedsMalassezia ||
          ingredient.fragranceAllergen) && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <ShieldAlert className="h-5 w-5 text-coral-700" />
              Флаги безопасности
            </h2>
            <ul className="max-w-3xl space-y-3">
              {(
                [
                  "comedogenic",
                  "feedsMalassezia",
                  "fragranceAllergen",
                ] as const
              )
                .filter((key) => ingredient[key])
                .map((key) => (
                  <li key={key} className="flex flex-wrap items-baseline gap-2">
                    <Badge variant={FLAG_META[key].variant}>
                      {FLAG_META[key].label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {FLAG_META[key].note}
                    </span>
                  </li>
                ))}
            </ul>
          </GlassCard>
        )}

        {ingredient.howItWorks && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Atom className="h-5 w-5 text-brand" />
              Как действует
            </h2>
            <p className="max-w-3xl text-muted-foreground">
              {ingredient.howItWorks}
            </p>
          </GlassCard>
        )}

        {ingredient.risks && (
          <GlassCard className="space-y-4 p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <ShieldAlert className="h-5 w-5 text-coral-700" />
              Риски и ограничения
            </h2>
            <p className="max-w-3xl text-muted-foreground">{ingredient.risks}</p>
          </GlassCard>
        )}

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
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4"
                  >
                    <Link
                      href={`/ingredients/${c.other.slug}`}
                      className="font-semibold text-brand hover:underline"
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
              <Sparkles className="h-5 w-5 text-brand" />
              С чем сочетается
            </h2>
            <p className="text-sm text-muted-foreground">
              Эти ингредиенты часто встречаются вместе с {ingredient.displayName}{" "}
              в одних формулах и не имеют зафиксированных конфликтов.
            </p>
            {ingredient.combinations && (
              <p className="max-w-3xl text-muted-foreground">
                {ingredient.combinations}
              </p>
            )}
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
              <FlaskConical className="h-5 w-5 text-brand" />
              Часто встречается в
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ingredient.products.map((pi) => (
                <li key={pi.product.id}>
                  <Link
                    href={`/products/${pi.product.slug}`}
                    className="block rounded-2xl bg-white p-4 transition-shadow hover:shadow-glass"
                  >
                    <span className="text-sm text-muted-foreground">
                      {pi.product.brand}
                    </span>
                    <span className="block font-semibold text-brand">
                      {pi.product.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        <GlassCard className="space-y-4 p-8">
          <h2 className="font-display text-2xl font-bold">
            {ingredient.displayName}: частые вопросы
          </h2>
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

        <GlassCard className="flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">
              Есть ли {ingredient.displayName} в вашем средстве?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Проверьте состав косметики онлайн: вставьте INCI-список — разберём
              каждый ингредиент бесплатно и без регистрации.
            </p>
          </div>
          <Button asChild>
            <Link href="/analyze">Проверить состав</Link>
          </Button>
        </GlassCard>
      </Container>
    </main>
  );
}
