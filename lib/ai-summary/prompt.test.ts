import { describe, expect, it } from "vitest";

import type { AnalysisResult, AnalyzedIngredient } from "@/lib/analysis/types";
import { buildSummaryInput, isFullyRecognized } from "./prompt";
import { summaryKey } from "./fingerprint";

function ing(slug: string, over: Partial<AnalyzedIngredient> = {}): AnalyzedIngredient {
  return {
    id: `id-${slug}`,
    inciName: slug.toUpperCase(),
    slug,
    displayName: `Рус ${slug}`,
    category: "active",
    function: "Функция",
    evidenceLevel: "STRONG",
    typicalConc: null,
    description: "Описание",
    safetyNotes: null,
    matchedVia: slug,
    comedogenic: false,
    feedsMalassezia: false,
    fragranceAllergen: false,
    ...over,
  };
}

function result(ingredients: AnalyzedIngredient[], total = ingredients.length): AnalysisResult {
  return {
    ingredients,
    unmatched: [],
    conflicts: [],
    advice: [],
    summary: {
      total,
      recognized: ingredients.length,
      actives: 0,
      fragrances: 0,
      alcohols: 0,
      spfFilters: 0,
      comedogenic: 0,
      malassezia: 0,
      fragranceAllergens: 0,
    },
  };
}

describe("buildSummaryInput", () => {
  it("передаёт ингредиенты по порядку с категорией, доказательностью и флагами", () => {
    const text = buildSummaryInput(
      result([
        ing("niacinamide", { typicalConc: "2–5%" }),
        ing("linalool", { category: "fragrance", fragranceAllergen: true, evidenceLevel: "ANECDOTAL" }),
      ]),
    );
    expect(text).toContain("Весь состав распознан: да");
    expect(text).toContain("1. Рус niacinamide (NIACINAMIDE) — категория: актив");
    expect(text).toContain("обычная рабочая концентрация: 2–5%");
    expect(text).toContain("2. Рус linalool (LINALOOL) — категория: отдушка");
    expect(text).toContain("флаги: аллерген-отдушка ЕС");
    expect(text).toContain("Конфликтов активов внутри состава нет.");
  });

  it("отмечает неполное распознавание и фоточувствительность", () => {
    const r = result([ing("retinol"), ing("glycerin")], 4);
    expect(isFullyRecognized(r)).toBe(false);
    const text = buildSummaryInput(r);
    expect(text).toContain("Распознано ингредиентов: 2 из 4. Весь состав распознан: нет");
    expect(text).toContain("в рабочей концентрации): да");
  });
});

describe("summaryKey", () => {
  const base = { ingredientIds: ["a", "b", "c"], fullyRecognized: true, model: "m", promptVersion: 1 };

  it("одинаковый состав — одинаковый ключ", () => {
    expect(summaryKey(base)).toBe(summaryKey({ ...base }));
  });

  it("порядок, полнота, модель и версия промпта меняют ключ", () => {
    const k = summaryKey(base);
    expect(summaryKey({ ...base, ingredientIds: ["b", "a", "c"] })).not.toBe(k);
    expect(summaryKey({ ...base, fullyRecognized: false })).not.toBe(k);
    expect(summaryKey({ ...base, model: "other" })).not.toBe(k);
    expect(summaryKey({ ...base, promptVersion: 2 })).not.toBe(k);
  });
});
