/**
 * Полная модель «Моей полки» для отображения: средства, совместимость,
 * дубли и режим, реакции и напоминания. Все функции бесплатны
 * (с 24.10.2026), лимитов тарифа нет.
 * Общая для страницы /shelf и мобильного API /api/mobile/shelf.
 */
import type { SkinProfile } from "@prisma/client";

import { analyzeText } from "@/lib/analysis/analyze";
import { getUserPlan, type PlanInfo } from "@/lib/billing";
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
  /** Реакции на средство */
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

  // Совместимость, поиск дублей и режим считаются всегда: лимита полки нет,
  // все функции бесплатны (с 24.10.2026).
  const products = await loadShelfProducts(userId, true);
  const ingredientIds = [...new Set(products.flatMap((p) => p.actives.map((a) => a.id)))];
  const edges = await loadConflictEdges(ingredientIds);
  const pairs = buildCompatibilityMatrix(products, edges);
  const duplicates = findDuplicates(products);
  const routine = buildRoutine(products, profile);

  // История реакций без лимита.
  const reactionRows = await prisma.skinReaction.findMany({
    where: { userId },
    include: { shelfItem: { include: { product: { select: { name: true } } } } },
    orderBy: { occurredAt: "desc" },
  });
  const visibleReactions = reactionRows;
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
    reminders,
  };
}
