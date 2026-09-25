import { prisma } from "@/lib/prisma";
import { matchInciString } from "@/lib/ingredients/match";
import { normalizeInci } from "@/lib/ingredients/normalize";
import { summarizeCategories } from "./summary";
import { buildAdvice } from "./advice";
import type {
  AnalysisResult,
  AnalyzedIngredient,
  ConflictInfo,
} from "./types";

/** Полный цикл анализа: сырая строка состава → разбор, сводка, конфликты, советы. */
export async function analyzeText(raw: string): Promise<AnalysisResult> {
  const { matched, unmatched } = await matchInciString(raw);
  const totalTokens = normalizeInci(raw).length;

  const ids = matched.map((m) => m.ingredient.id);
  const details = ids.length
    ? await prisma.ingredient.findMany({ where: { id: { in: ids } } })
    : [];
  const byId = new Map(details.map((d) => [d.id, d]));

  const ingredients: AnalyzedIngredient[] = matched.flatMap((m) => {
    const d = byId.get(m.ingredient.id);
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
