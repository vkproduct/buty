/**
 * Полная модель «Моей полки» для отображения: средства, совместимость,
 * дубли и режим (Pro), реакции и напоминания с учётом тарифа.
 * Общая для страницы /shelf и мобильного API /api/mobile/shelf.
 */
import type { SkinProfile } from "@prisma/client";

import { analyzeText } from "@/lib/analysis/analyze";
import { FREE_REACTIONS_LIMIT, getUserPlan, type PlanInfo } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import {
  buildCompatibilityMatrix,
  buildRoutine,
  findDuplicates,
  type DuplicateGroup,
  type PairResult,
  type Routine,
} from "./compatibility";
import { loadConflictEdges, loadShelfProducts } from "./data";

export interface ShelfReminderBrief {
  id: string;
  type: "introduce" | "restock";
  nextRunAt: string;
}

export interface ShelfReactionBrief {
  id: string;
  type: string;
  note: string | null;
  occurredAt: string;
  suspects: string[];
}

export interface ShelfItemData {
  id: string;
  /** catalog — средство из базы Buty, custom — «своё средство» пользователя */
  kind: "catalog" | "custom";
  status: "using" | "finished" | "reacted";
  addedAt: string;
  title: string;
  subtitle: string;
  slug: string | null;
  ingredientNames: string[];
  /** Исходный INCI-текст «своего средства» (для редактирования) */
  customInci: string | null;
  /** Сколько компонентов состава не удалось распознать */
  unrecognizedCount: number;
  /** Активные (ещё не сработавшие) напоминания */
  reminders: ShelfReminderBrief[];
  /** Реакции на средство (на free — в пределах видимой истории) */
  reactions: ShelfReactionBrief[];
}

export interface ShelfReactionData {
  id: string;
  type: string;
  note: string | null;
  photoUrl: string | null;
  occurredAt: string;
  itemTitle: string;
  suspects: string[];
}

export interface ShelfReminderData {
  id: string;
  type: "introduce" | "restock";
  nextRunAt: string;
  doneAt: string | null;
  itemTitle: string;
  logs: { id: string; channel: string; message: string; createdAt: string }[];
}

export interface ShelfView {
  plan: PlanInfo;
  items: ShelfItemData[];
  pairs: PairResult[];
  duplicates: DuplicateGroup[];
  routine: Routine;
  reactions: ShelfReactionData[];
  /** На free скрыта часть истории реакций */
  reactionsLimited: boolean;
  reminders: ShelfReminderData[];
}

function itemTitleOf(item: { product: { name: string } | null; customName: string | null }) {
  return item.product?.name ?? item.customName ?? "Своё средство";
}

/** Собирает полку пользователя. Профиль кожи нужен для режима утро/вечер. */
export async function loadShelfView(userId: string, profile: SkinProfile): Promise<ShelfView> {
  const items = await prisma.shelfItem.findMany({
    where: { userId },
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

  const baseView: Omit<ShelfItemData, "reactions">[] = await Promise.all(
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
          ingredientNames: item.product.ingredients.map((pi) => pi.ingredient.displayName),
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
        ingredientNames: analysis?.ingredients.map((i) => i.displayName) ?? [],
        customInci: item.customInci,
        unrecognizedCount: analysis
          ? Math.max(0, analysis.summary.total - analysis.summary.recognized)
          : 0,
        reminders,
      };
    }),
  );

  const plan = await getUserPlan(userId);

  // Совместимость считается для всех: на free полка ограничена
  // FREE_SHELF_LIMIT средствами, Pro — вся полка без лимита.
  // Поиск дублей и режим утро/вечер — только Pro.
  const products = await loadShelfProducts(userId, true);
  const ingredientIds = [...new Set(products.flatMap((p) => p.actives.map((a) => a.id)))];
  const edges = await loadConflictEdges(ingredientIds);
  const pairs = buildCompatibilityMatrix(products, edges);
  let duplicates: DuplicateGroup[] = [];
  let routine: Routine = { morning: [], evening: [], notes: [] };
  if (plan.isPro) {
    duplicates = findDuplicates(products);
    routine = buildRoutine(products, profile);
  }

  // История реакций: free — последние FREE_REACTIONS_LIMIT, Pro — без лимита
  const reactionRows = await prisma.skinReaction.findMany({
    where: { userId },
    include: { shelfItem: { include: { product: { select: { name: true } } } } },
    orderBy: { occurredAt: "desc" },
    ...(plan.isPro ? {} : { take: FREE_REACTIONS_LIMIT + 1 }),
  });
  const reactionsLimited = !plan.isPro && reactionRows.length > FREE_REACTIONS_LIMIT;
  const visibleReactions = plan.isPro ? reactionRows : reactionRows.slice(0, FREE_REACTIONS_LIMIT);
  const suspectIds = [
    ...new Set(visibleReactions.flatMap((r) => JSON.parse(r.suspectIngredientIds) as string[])),
  ];
  const suspectIngredients = suspectIds.length
    ? await prisma.ingredient.findMany({
        where: { id: { in: suspectIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const suspectNameById = new Map(suspectIngredients.map((i) => [i.id, i.displayName]));
  const suspectsOf = (raw: string) =>
    (JSON.parse(raw) as string[])
      .map((id) => suspectNameById.get(id))
      .filter((n): n is string => Boolean(n));

  // Реакции по каждому средству — для окна средства на полке
  const reactionsByItem = new Map<string, ShelfReactionBrief[]>();
  for (const r of visibleReactions) {
    const list = reactionsByItem.get(r.shelfItemId) ?? [];
    list.push({
      id: r.id,
      type: r.type,
      note: r.note,
      occurredAt: r.occurredAt.toISOString(),
      suspects: suspectsOf(r.suspectIngredientIds),
    });
    reactionsByItem.set(r.shelfItemId, list);
  }

  const reactions: ShelfReactionData[] = visibleReactions.map((r) => ({
    id: r.id,
    type: r.type,
    note: r.note,
    photoUrl: r.photoUrl,
    occurredAt: r.occurredAt.toISOString(),
    itemTitle: itemTitleOf(r.shelfItem),
    suspects: suspectsOf(r.suspectIngredientIds),
  }));

  const reminderRows = await prisma.reminder.findMany({
    where: { userId },
    include: {
      shelfItem: { include: { product: { select: { name: true } } } },
      logs: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { nextRunAt: "asc" },
  });
  const reminders: ShelfReminderData[] = reminderRows.map((r) => ({
    id: r.id,
    type: r.type,
    nextRunAt: r.nextRunAt.toISOString(),
    doneAt: r.doneAt ? r.doneAt.toISOString() : null,
    itemTitle: itemTitleOf(r.shelfItem),
    logs: r.logs.map((l) => ({
      id: l.id,
      channel: l.channel,
      message: l.message,
      createdAt: l.createdAt.toISOString(),
    })),
  }));

  return {
    plan,
    items: baseView.map((item) => ({ ...item, reactions: reactionsByItem.get(item.id) ?? [] })),
    pairs,
    duplicates,
    routine,
    reactions,
    reactionsLimited,
    reminders,
  };
}
