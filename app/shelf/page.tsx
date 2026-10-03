import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";

import { getSession } from "@/lib/auth";
import { analyzeText } from "@/lib/analysis/analyze";
import { FREE_REACTIONS_LIMIT, FREE_SHELF_LIMIT, getUserPlan } from "@/lib/billing";
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
import { SignInForm } from "@/components/sign-in-form";
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
          <GlassCard className="w-full max-w-lg p-8 sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
              <Lock className="h-5 w-5 text-brand" />
            </span>
            <h1 className="font-display mt-4 text-[28px] font-semibold leading-tight">Моя полка</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Все ваши средства в одном месте: проверка совместимости, режим
              утро / вечер, поиск дублей, дневник реакций и напоминания.
              Войдите по ссылке из письма — пароль не нужен.
            </p>
            <ul className="mt-5 space-y-2 rounded-xl bg-ink-wash p-4 text-sm text-ink-soft">
              <li>
                <span className="font-semibold text-foreground">Бесплатно:</span> до{" "}
                {FREE_SHELF_LIMIT} средств на полке и проверка их совместимости,
                последние {FREE_REACTIONS_LIMIT} реакций, напоминания.
              </li>
              <li>
                <span className="font-semibold text-foreground">Pro:</span> полка без лимита,
                совместимость всей полки, режим, поиск дублей, вся история реакций, экспорт в PDF.
              </li>
            </ul>
            <div className="mt-6">
              <SignInForm cta="Собрать полку бесплатно" />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link href="/pricing" className="font-medium text-brand hover:underline">
                Сравнить тарифы
              </Link>
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
      reminders: {
        where: { doneAt: null },
        orderBy: { nextRunAt: "asc" },
        select: { id: true, type: true, nextRunAt: true },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  const baseView: Omit<ShelfItemView, "reactions">[] = await Promise.all(
    items.map(async (item) => {
      const reminders = item.reminders.map((r) => ({
        id: r.id,
        type: r.type,
        nextRunAt: r.nextRunAt.toISOString(),
      }));
      if (item.product) {
        return {
          id: item.id,
          kind: "catalog" as const,
          status: item.status,
          addedAt: item.addedAt.toISOString(),
          title: item.product.name,
          subtitle: item.product.brand,
          slug: item.product.slug,
          ingredientNames: item.product.ingredients.map(
            (pi) => pi.ingredient.displayName,
          ),
          customInci: null,
          unrecognizedCount: 0,
          reminders,
        };
      }
      const analysis = item.customInci ? await analyzeText(item.customInci) : null;
      return {
        id: item.id,
        kind: "custom" as const,
        status: item.status,
        addedAt: item.addedAt.toISOString(),
        title: item.customName ?? "Своё средство",
        subtitle: "Своё средство",
        slug: null,
        ingredientNames:
          analysis?.ingredients.map((i) => i.displayName) ?? [],
        customInci: item.customInci,
        unrecognizedCount: analysis
          ? Math.max(0, analysis.summary.total - analysis.summary.recognized)
          : 0,
        reminders,
      };
    }),
  );

  const plan = await getUserPlan(session.user.id);

  // Совместимость считается для всех: на free полка ограничена
  // FREE_SHELF_LIMIT средствами, Pro — вся полка без лимита.
  // Поиск дублей и режим утро/вечер — только Pro.
  const products = await loadShelfProducts(session.user.id, true);
  const ingredientIds = [
    ...new Set(products.flatMap((p) => p.actives.map((a) => a.id))),
  ];
  const edges = await loadConflictEdges(ingredientIds);
  const pairs = buildCompatibilityMatrix(products, edges);
  let duplicates: ReturnType<typeof findDuplicates> = [];
  let routine: ReturnType<typeof buildRoutine> = {
    morning: [],
    evening: [],
    notes: [],
  };
  if (plan.isPro) {
    duplicates = findDuplicates(products);
    routine = buildRoutine(products, profile);
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
  // Реакции по каждому средству — для окна средства на полке
  const reactionsByItem = new Map<string, ShelfItemView["reactions"]>();
  for (const r of visibleReactions) {
    const list = reactionsByItem.get(r.shelfItemId) ?? [];
    list.push({
      id: r.id,
      type: r.type,
      note: r.note,
      occurredAt: r.occurredAt.toISOString(),
      suspects: (JSON.parse(r.suspectIngredientIds) as string[])
        .map((id) => suspectNameById.get(id))
        .filter((n): n is string => Boolean(n)),
    });
    reactionsByItem.set(r.shelfItemId, list);
  }
  const view: ShelfItemView[] = baseView.map((item) => ({
    ...item,
    reactions: reactionsByItem.get(item.id) ?? [],
  }));

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
              совместимость всей полки, поиск дублей, режим, полная история реакций и{" "}
              <Link href="/shelf/export" className="font-medium text-brand hover:underline">
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
                полку без лимита и совместимость всех средств, поиск дублей,
                режим утро/вечер, полную историю реакций и экспорт полки в PDF.
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
