import { describe, expect, it } from "vitest";

import { buildBasicSummary } from "./basic-summary";
import type { AnalysisResult, AnalyzedIngredient, CompositionSummary } from "./types";

function ing(slug: string, displayName: string, category: string, extra: Partial<AnalyzedIngredient> = {}): AnalyzedIngredient {
  return {
    id: slug,
    inciName: slug,
    slug,
    displayName,
    category,
    function: "",
    evidenceLevel: "MODERATE",
    typicalConc: null,
    description: "",
    safetyNotes: null,
    matchedVia: slug,
    comedogenic: false,
    feedsMalassezia: false,
    fragranceAllergen: false,
    ...extra,
  } as AnalyzedIngredient;
}

function result(
  ingredients: AnalyzedIngredient[],
  summary: Partial<CompositionSummary> = {},
  conflicts: AnalysisResult["conflicts"] = [],
): AnalysisResult {
  return {
    ingredients,
    unmatched: [],
    conflicts,
    advice: [],
    summary: {
      total: ingredients.length,
      recognized: ingredients.length,
      actives: 0,
      fragrances: 0,
      alcohols: 0,
      spfFilters: 0,
      comedogenic: 0,
      malassezia: 0,
      fragranceAllergens: 0,
      ...summary,
    },
  };
}

describe("buildBasicSummary", () => {
  it("увлажняющий состав: акцент, основа, активы, чистый caution", () => {
    const s = buildBasicSummary(
      result([
        ing("water", "Вода", "texture"),
        ing("glycerin", "Глицерин", "humectant"),
        ing("niacinamide", "Ниацинамид", "active"),
        ing("sodium-hyaluronate", "Гиалуронат натрия", "humectant"),
        ing("ceramide-np", "Церамид NP", "barrier"),
        ing("phenoxyethanol", "Феноксиэтанол", "preservative"),
      ]),
    );
    expect(s.verdict).toBe("Состав с акцентом на увлажнение и восстановление защитного барьера");
    expect(s.inside).toContain("Основа состава — вода, глицерин и ниацинамид.");
    expect(s.inside).toContain("Главные активы: ниацинамид.");
    expect(s.suits).toContain("увлажнение");
    expect(s.caution).toBe("Конфликтов активов, отдушек и компонентов с данными о комедогенности не нашли.");
  });

  it("SPF и активы после консерванта", () => {
    const s = buildBasicSummary(
      result(
        [
          ing("water", "Вода", "texture"),
          ing("octocrylene", "Октокрилен", "uv-filter"),
          ing("phenoxyethanol", "Феноксиэтанол", "preservative"),
          ing("tocopherol", "Токоферол", "antioxidant"),
        ],
        { spfFilters: 1 },
      ),
    );
    expect(s.verdict.startsWith("Солнцезащитный состав")).toBe(true);
    expect(s.inside).toContain("Часть из них стоит после консерванта");
  });

  it("частичное распознавание, отдушки и конфликты попадают в caution", () => {
    const s = buildBasicSummary(
      result(
        [ing("water", "Вода", "texture"), ing("retinol", "Ретинол", "active"), ing("limonene", "Лимонен", "fragrance")],
        { total: 6, recognized: 3, fragranceAllergens: 1, fragrances: 1 },
        [{ severity: "high", reason: "x", a: { slug: "a", displayName: "A" }, b: { slug: "b", displayName: "B" } }],
      ),
    );
    expect(s.caution).toContain("1 конфликт активов");
    expect(s.caution).toContain("SPF");
    expect(s.caution).toContain("1 отдушка-аллерген");
    expect(s.caution).toContain("Распознано 3 из 6");
  });

  it("аббревиатуры не переводятся в нижний регистр", () => {
    const s = buildBasicSummary(result([ing("peg-40", "PEG-40 гидрогенизированное касторовое масло", "emulsifier")]));
    expect(s.inside).toContain("PEG-40");
  });
});
