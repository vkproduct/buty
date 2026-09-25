import type { CompositionSummary, ConflictInfo } from "./types";

interface AdviceInput {
  summary: CompositionSummary;
  conflicts: ConflictInfo[];
  categories: string[];
  hasRetinoid: boolean; // ретинол/адапален в составе
}

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Базовый подбор ухода: 2–3 совета по порядку и совместимости,
 * выведенные из категорий и конфликтов распознанных активов.
 */
export function buildAdvice(input: AdviceInput): string[] {
  const advice: string[] = [];

  if (input.conflicts.length > 0) {
    const top = [...input.conflicts].sort(
      (x, y) => (SEVERITY_RANK[x.severity] ?? 3) - (SEVERITY_RANK[y.severity] ?? 3),
    )[0];
    advice.push(
      `Самая рискованная пара: ${top.a.displayName} + ${top.b.displayName}. ` +
        `Разносите их по времени суток или по дням — ${top.reason.toLowerCase()}`,
    );
  }

  const hasAcidsOrRetinoid =
    input.hasRetinoid || input.categories.includes("active");
  if (input.summary.actives > 0 && input.summary.spfFilters === 0 && hasAcidsOrRetinoid) {
    advice.push(
      "В составе есть активы, повышающие чувствительность кожи, — утром обязателен отдельный SPF.",
    );
  }
  if (input.summary.spfFilters > 0 && input.summary.actives > 0) {
    advice.push(
      "UV-фильтры здесь уместны: активы повышают фоточувствительность, защита утром обязательна.",
    );
  }

  if (input.categories.includes("humectant")) {
    advice.push(
      "Увлажнители (гиалуроновая кислота, глицерин) наносите на слегка влажную кожу, поверх — крем для «запечатывания».",
    );
  }

  return advice.slice(0, 3);
}
