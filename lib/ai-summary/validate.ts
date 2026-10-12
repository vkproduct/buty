import type { AiSummaryContent } from "./types";

// Лимиты с запасом над тем, что просим в промпте: модель иногда немного превышает.
const LIMITS: Record<keyof AiSummaryContent, { min: number; max: number }> = {
  verdict: { min: 10, max: 200 },
  inside: { min: 20, max: 700 },
  suits: { min: 10, max: 450 },
  caution: { min: 0, max: 450 },
};

/**
 * Запрещённые формулировки: лечебные обещания, запугивание, выводы о беременности
 * и детях, ссылки. Такое резюме не показываем, остаются обычные советы разбора.
 */
const BANNED: RegExp[] = [
  /(?<![\p{L}])(вы)?леч(ит|ат|ение|ебн)/iu,
  /излеч/iu,
  /избав(ит|ят|ляет|ляют)/iu,
  /гарантир/iu,
  /токсичн/iu,
  /ядовит/iu,
  /канцероген/iu,
  /(?<![\p{L}])опасн/iu,
  /вредн(ый|ое|ая|ые|о)(?![\p{L}])/iu,
  /беременн/iu,
  /кормящ/iu,
  /грудн(ого|ым|ое) вскармлив/iu,
  /(?<![\p{L}])дет(ей|ям|ск)/iu,
  /диагноз/iu,
  /https?:\/\//iu,
];

/** Разбирает ответ модели и проверяет его. null — резюме показывать нельзя. */
export function parseSummary(raw: string): AiSummaryContent | null {
  const json = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const result = {} as AiSummaryContent;
  for (const field of Object.keys(LIMITS) as (keyof AiSummaryContent)[]) {
    const value = (data as Record<string, unknown>)[field];
    if (typeof value !== "string") return null;
    const clean = value.replace(/\s+/g, " ").trim();
    const { min, max } = LIMITS[field];
    if (clean.length < min || clean.length > max) return null;
    result[field] = clean;
  }

  const all = Object.values(result).join(" ");
  if (BANNED.some((re) => re.test(all))) return null;
  return result;
}

/** Причина отказа для логов (без текста ответа, чтобы не засорять логи). */
export function bannedMatch(text: string): string | null {
  const hit = BANNED.find((re) => re.test(text));
  return hit ? hit.source : null;
}
