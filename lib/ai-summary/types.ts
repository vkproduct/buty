/** Резюме состава от ИИ: четыре коротких блока для пользователя. */
export interface AiSummaryContent {
  verdict: string; // одна фраза: что это за средство по составу
  inside: string; // на чём основан состав, главные активы
  suits: string; // кому по составу может подойти
  caution: string; // на что обратить внимание; пустая строка — не о чем предупреждать
}

/**
 * Ответ POST /api/analyze/summary. Всегда HTTP 200 (кроме неверного запроса),
 * чтобы интерфейс просто прятал блок, если резюме нет.
 */
export type AiSummaryResponse =
  | { status: "ok"; summary: AiSummaryContent; cached: boolean }
  | { status: "skipped"; reason: "too-few" | "low-coverage" }
  | { status: "limited" }
  | { status: "disabled" }
  | { status: "unavailable" };
