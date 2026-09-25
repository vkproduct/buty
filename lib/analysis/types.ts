import type { EvidenceLevel } from "@prisma/client";

/** DTO разбора состава — общий контраст API /api/analyze и клиента. */

export interface AnalyzedIngredient {
  id: string;
  inciName: string;
  slug: string;
  displayName: string;
  category: string;
  function: string;
  evidenceLevel: EvidenceLevel;
  typicalConc: string | null;
  description: string;
  safetyNotes: string | null;
  matchedVia: string; // токен из исходного текста
}

export interface ConflictInfo {
  severity: string; // "high" | "medium" | "low"
  reason: string;
  a: { slug: string; displayName: string };
  b: { slug: string; displayName: string };
}

export interface CompositionSummary {
  total: number; // всего уникальных токенов
  recognized: number; // распознано ингредиентов
  actives: number;
  fragrances: number;
  alcohols: number;
  spfFilters: number;
}

export interface AnalysisResult {
  ingredients: AnalyzedIngredient[];
  unmatched: string[];
  summary: CompositionSummary;
  conflicts: ConflictInfo[];
  advice: string[];
}
