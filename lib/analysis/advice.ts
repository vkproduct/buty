import type { CompositionSummary, ConflictInfo } from "./types";

interface AdviceInput {
  summary: CompositionSummary;
  conflicts: ConflictInfo[];
  categories: string[];
  hasRetinoid: boolean; // ретинол/адапален в составе
}

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Базовый подбор ухода: 2–4 совета по порядку и совместимости,
 * выведенные из категорий, конфликтов и безопасностных флагов
 * распознанных активов.
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

  if (input.summary.malassezia > 0) {
    advice.push(
      "В составе есть субстраты для Malassezia — масла и эфиры, которыми питаются дрожжи, провоцирующие себорейный дерматит и фолликулит. При склонности к этим состояниям такой уход лучше пропустить.",
    );
  }
  if (input.summary.comedogenic > 0) {
    advice.push(
      "Есть ингредиенты с опубликованными данными о комедогенности (классика — тесты на кроличьем ухе; на человеческой коже риск ниже, но у склонной к комедонам — повод выбрать другое средство).",
    );
  }
  if (input.summary.fragranceAllergens > 0) {
    advice.push(
      "В составе декларируемые отдушечные аллергены ЕС. Для чувствительной или реактивной кожи такие компоненты — частая причина контактного дерматита.",
    );
  }

  if (input.categories.includes("humectant")) {
    advice.push(
      "Увлажнители (гиалуроновая кислота, глицерин) наносите на слегка влажную кожу, поверх — крем для «запечатывания».",
    );
  }

  return advice.slice(0, 4);
}
