/**
 * Загрузка данных полки из БД для логики части 6:
 * средства с активами, конфликты, подозреваемые ингредиенты.
 */
import { analyzeText } from "@/lib/analysis/analyze";
import { prisma } from "@/lib/prisma";
import type { ConflictEdge, ShelfProductInput } from "./compatibility";

/** Категории ингредиентов, считающиеся «ключевыми активами» для полки. */
const ACTIVE_CATEGORIES = new Set(["active", "uv-filter"]);

type ItemWithProduct = Awaited<ReturnType<typeof loadItems>>[number];

async function loadItems(userId: string, status?: "using") {
  return prisma.shelfItem.findMany({
    where: { userId, ...(status ? { status } : {}) },
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
}

interface RawIngredient {
  id: string;
  slug: string;
  displayName: string;
  category: string;
}

function pickActives(ingredients: RawIngredient[]) {
  return ingredients
    .filter((ing) => ACTIVE_CATEGORIES.has(ing.category))
    .map((ing) => ({
      id: ing.id,
      slug: ing.slug,
      displayName: ing.displayName,
      category: ing.category,
    }));
}

/** Активы средства + известен ли его состав вообще и насколько он полон. */
async function itemComposition(item: ItemWithProduct) {
  if (item.product) {
    const ingredients = item.product.ingredients.map((pi) => pi.ingredient);
    const { ingredientsTotal, ingredientsRecognized } = item.product;
    return {
      actives: pickActives(ingredients),
      hasComposition: ingredients.length > 0,
      // полнота по INCIDB; 0 = курируемая карточка вне INCIDB — считаем полной
      compositionComplete:
        ingredientsTotal === 0 || ingredientsRecognized / ingredientsTotal >= 0.8,
    };
  }
  if (!item.customInci)
    return { actives: [], hasComposition: false, compositionComplete: false };
  const analysis = await analyzeText(item.customInci);
  return {
    actives: pickActives(analysis.ingredients),
    hasComposition: analysis.ingredients.length > 0,
    compositionComplete: analysis.ingredients.length > 0,
  };
}

/** Средства полки пользователя в формате для compatibility/buildRoutine. */
export async function loadShelfProducts(
  userId: string,
  onlyUsing = true,
): Promise<ShelfProductInput[]> {
  const items = await loadItems(userId, onlyUsing ? "using" : undefined);
  return Promise.all(
    items.map(async (item) => ({
      id: item.id,
      title: item.product ? item.product.name : (item.customName ?? "Своё средство"),
      category: item.product ? item.product.category : "custom",
      ...(await itemComposition(item)),
    })),
  );
}

/** Все конфликты IngredientConflict, затрагивающие переданные ингредиенты. */
export async function loadConflictEdges(
  ingredientIds: string[],
): Promise<ConflictEdge[]> {
  if (ingredientIds.length === 0) return [];
  const rows = await prisma.ingredientConflict.findMany({
    where: {
      ingredientAId: { in: ingredientIds },
      ingredientBId: { in: ingredientIds },
    },
    include: { ingredientA: true, ingredientB: true },
  });
  return rows.map((r) => ({
    ingredientAId: r.ingredientAId,
    ingredientBId: r.ingredientBId,
    severity: r.severity,
    reason: r.reason,
    aName: r.ingredientA.displayName,
    bName: r.ingredientB.displayName,
  }));
}

/** Подозреваемые ингредиенты средства (все распознанные — не только активы). */
export async function suspectIngredientIds(shelfItemId: string, userId: string) {
  const item = await prisma.shelfItem.findUnique({
    where: { id: shelfItemId },
    include: { product: { include: { ingredients: true } } },
  });
  if (!item || item.userId !== userId) return null;
  if (item.product) {
    return item.product.ingredients.map((pi) => pi.ingredientId);
  }
  if (!item.customInci) return [];
  const analysis = await analyzeText(item.customInci);
  return analysis.ingredients.map((i) => i.id);
}
