import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";

import { getSession } from "@/lib/auth";
import { analyzeText } from "@/lib/analysis/analyze";
import { FREE_REACTIONS_LIMIT, getUserPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import {
  buildCompatibilityMatrix,
  buildRoutine,
  findDuplicates,
} from "@/lib/shelf/compatibility";
import { loadConflictEdges, loadShelfProducts } from "@/lib/shelf/data";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { ShelfTabs, type ReactionView, type ReminderView } from "@/components/shelf-tabs";
import type { ShelfItemView } from "@/components/shelf-client";

export const metadata: Metadata = { title: "Моя полка" };
export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const session = await getSession();

  if (!session?.user) {
    return (
      <main className="bg-gradient-hero min-h-screen">
        <Container className="flex min-h-[70vh] items-center justify-center py-20">
          <GlassCard className="max-w-lg p-10 text-center">
            <Lock className="mx-auto h-8 w-8 text-lavender" />
            <h1 className="font-display mt-4 text-3xl font-bold">Моя полка</h1>
            <p className="mt-4 text-muted-foreground">
              Коллекция ваших средств с разбором составов. Войдите по ссылке из
              письма, чтобы собрать свою полку.
            </p>
            <Button asChild className="mt-6">
              <Link href="/auth/signin">Войти</Link>
            </Button>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-lavender-400">
              <Sparkles className="h-4 w-4" /> Pro-функции скоро
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Проверка совместимости активов, порядок нанесения, поиск дублей,
              история реакций и напоминания — в Pro-подписке.
            </p>
          </GlassCard>
        </Container>
      </main>
    );
  }

  const profile = await prisma.skinProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding");

  const items = await prisma.shelfItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          ingredients: {
            include: { ingredient: true },
            orderBy: { position: "asc" },
          },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  const view: ShelfItemView[] = await Promise.all(
    items.map(async (item) => {
      if (item.product) {
        return {
          id: item.id,
          status: item.status,
          addedAt: item.addedAt.toISOString(),
          title: item.product.name,
          subtitle: item.product.brand,
          slug: item.product.slug,
          ingredientNames: item.product.ingredients.map(
            (pi) => pi.ingredient.displayName,
          ),
        };
      }
      const analysis = item.customInci ? await analyzeText(item.customInci) : null;
      return {
        id: item.id,
        status: item.status,
        addedAt: item.addedAt.toISOString(),
        title: item.customName ?? "Своё средство",
        subtitle: "Своё средство",
        slug: null,
        ingredientNames:
          analysis?.ingredients.map((i) => i.displayName) ?? [],
      };
    }),
  );

  const plan = await getUserPlan(session.user.id);

  // Pro-логика части 6 считается только для Pro — для free матрица скрыта
  let pairs: ReturnType<typeof buildCompatibilityMatrix> = [];
  let duplicates: ReturnType<typeof findDuplicates> = [];
  let routine: ReturnType<typeof buildRoutine> = {
    morning: [],
    evening: [],
    notes: [],
  };
  if (plan.isPro) {
    const products = await loadShelfProducts(session.user.id, true);
    const ingredientIds = [
      ...new Set(products.flatMap((p) => p.actives.map((a) => a.id))),
    ];
    const edges = await loadConflictEdges(ingredientIds);
    pairs = buildCompatibilityMatrix(products, edges);
    duplicates = findDuplicates(products);
    routine = buildRoutine(products, profile.skinType);
  }

  // История реакций: free — последние FREE_REACTIONS_LIMIT, Pro — без лимита
  const reactionRows = await prisma.skinReaction.findMany({
    where: { userId: session.user.id },
    include: {
      shelfItem: { include: { product: { select: { name: true } } } },
    },
    orderBy: { occurredAt: "desc" },
    ...(plan.isPro ? {} : { take: FREE_REACTIONS_LIMIT + 1 }),
  });
  const reactionsLimited = reactionRows.length > FREE_REACTIONS_LIMIT;
  const visibleReactions = plan.isPro
    ? reactionRows
    : reactionRows.slice(0, FREE_REACTIONS_LIMIT);
  const suspectIds = [
    ...new Set(
      visibleReactions.flatMap(
        (r) => JSON.parse(r.suspectIngredientIds) as string[],
      ),
    ),
  ];
  const suspectIngredients = suspectIds.length
    ? await prisma.ingredient.findMany({
        where: { id: { in: suspectIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const suspectNameById = new Map(
    suspectIngredients.map((i) => [i.id, i.displayName]),
  );
  const reactions: ReactionView[] = visibleReactions.map((r) => ({
    id: r.id,
    type: r.type,
    note: r.note,
    photoUrl: r.photoUrl,
    occurredAt: r.occurredAt.toISOString(),
    itemTitle:
      r.shelfItem.product?.name ?? r.shelfItem.customName ?? "Своё средство",
    suspects: (JSON.parse(r.suspectIngredientIds) as string[])
      .map((id) => suspectNameById.get(id))
      .filter((n): n is string => Boolean(n)),
  }));

  const reminderRows = await prisma.reminder.findMany({
    where: { userId: session.user.id },
    include: {
      shelfItem: { include: { product: { select: { name: true } } } },
      logs: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { nextRunAt: "asc" },
  });
  const reminders: ReminderView[] = reminderRows.map((r) => ({
    id: r.id,
    type: r.type,
    nextRunAt: r.nextRunAt.toISOString(),
    doneAt: r.doneAt ? r.doneAt.toISOString() : null,
    itemTitle:
      r.shelfItem.product?.name ?? r.shelfItem.customName ?? "Своё средство",
    logs: r.logs.map((l) => ({
      id: l.id,
      channel: l.channel,
      message: l.message,
      createdAt: l.createdAt.toISOString(),
    })),
  }));

  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="py-12">
        <ShelfTabs
          items={view}
          pairs={pairs}
          duplicates={duplicates}
          routine={routine}
          reactions={reactions}
          reminders={reminders}
          isPro={plan.isPro}
          reactionsLimited={!plan.isPro && reactionsLimited}
        />
        {plan.isPro ? (
          <GlassCard className="mt-8 flex items-center gap-3 p-5">
            <Sparkles className="h-5 w-5 shrink-0 text-amber" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Pro активен
                {plan.currentPeriodEnd
                  ? ` до ${plan.currentPeriodEnd.toLocaleDateString("ru-RU")}`
                  : ""}
                :
              </span>{" "}
              матрица совместимости, режим, полная история реакций и{" "}
              <Link href="/shelf/export" className="font-medium text-lavender hover:underline">
                экспорт полки в PDF
              </Link>
              .
            </p>
          </GlassCard>
        ) : (
          <GlassCard className="mt-8 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-amber" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Pro открывает:
                </span>{" "}
                матрицу совместимости, режим утро/вечер, полную историю реакций,
                экспорт полки в PDF и полку без лимита.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/pricing">Перейти на Pro</Link>
            </Button>
          </GlassCard>
        )}
      </Container>
    </main>
  );
}
