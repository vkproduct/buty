/**
 * Цены внешних ИИ-сервисов (для оценки расходов в админке).
 * Gemini (Interactions API), $ за 1M токенов: gemini-3.5-flash-lite.
 */
export const GEMINI_PRICE_INPUT_PER_M = 0.3;
export const GEMINI_PRICE_OUTPUT_PER_M = 2.5;

/** Примерная стоимость резюме в $ по фактически израсходованным токенам. */
export function geminiCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * GEMINI_PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * GEMINI_PRICE_OUTPUT_PER_M
  );
}
