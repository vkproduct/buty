import { prisma } from "@/lib/prisma";
import { matchInciString } from "@/lib/ingredients/match";
import { normalizeInci } from "@/lib/ingredients/normalize";
import { summarizeCategories, summarizeFlags } from "./summary";
import { buildAdvice } from "./advice";
import type {
  AnalysisResult,
  AnalyzedIngredient,
  ConflictInfo,
} from "./types";

/** Полный цикл анализа: сырая строка состава → разбор, сводка, конфликты, советы. */
export async function analyzeText(raw: string): Promise<AnalysisResult> {
  const { matched, unmatched } = await matchInciString(raw);
  return analyzeMatched(
    matched.map((m) => ({ id: m.ingredient.id, matchedVia: m.matchedVia })),
    unmatched,
    normalizeInci(raw).length,
  );
}

/**
 * Разбор уже известного списка ингредиентов (например, состава продукта из базы):
 * карточки, сводка, конфликты, советы. Порядок списка сохраняется.
 */
export async function analyzeMatched(
  matched: { id: string; matchedVia: string }[],
  unmatched: string[],
  totalTokens: number,
): Promise<AnalysisResult> {
  const ids = matched.map((m) => m.id);
  const details = ids.length
    ? await prisma.ingredient.findMany({ where: { id: { in: ids } } })
    : [];
  const byId = new Map(details.map((d) => [d.id, d]));

  const ingredients: AnalyzedIngredient[] = matched.flatMap((m) => {
    const d = byId.get(m.id);
    if (!d) return [];
    return [
      {
        id: d.id,
        inciName: d.inciName,
        slug: d.slug,
        displayName: d.displayName,
        category: d.category,
        function: d.function,
        evidenceLevel: d.evidenceLevel,
        typicalConc: d.typicalConc,
        description: d.description,
        safetyNotes: d.safetyNotes,
        matchedVia: m.matchedVia,
        comedogenic: d.comedogenic,
        feedsMalassezia: d.feedsMalassezia,
        fragranceAllergen: d.fragranceAllergen,
      },
    ];
  });

  const conflictRows = ids.length
    ? await prisma.ingredientConflict.findMany({
        where: { ingredientAId: { in: ids }, ingredientBId: { in: ids } },
        include: {
          ingredientA: { select: { slug: true, displayName: true } },
          ingredientB: { select: { slug: true, displayName: true } },
        },
      })
    : [];

  const conflicts: ConflictInfo[] = conflictRows.map((c) => ({
    severity: c.severity,
    reason: c.reason,
    a: c.ingredientA,
    b: c.ingredientB,
  }));

  const summary = {
    total: totalTokens,
    recognized: ingredients.length,
    ...summarizeCategories(ingredients.map((i) => i.category)),
    ...summarizeFlags(ingredients),
  };

  const advice = buildAdvice({
    summary,
    conflicts,
    categories: ingredients.map((i) => i.category),
    hasRetinoid: ingredients.some((i) =>
      ["retinol", "adapalene"].includes(i.slug),
    ),
  });

  return { ingredients, unmatched, summary, conflicts, advice };
}
