import { createHash } from "node:crypto";

import { takeDaily } from "@/lib/budget/daily-limit";
import { prisma } from "@/lib/prisma";

/** Лимит гостевых записей в журнале (на весь сервис, в сутки). */
export const ANALYSIS_GUEST_LOG_DAILY_LIMIT = 3000;
const GUEST_LOG_COUNTER_KEY = "analysis_guest_log";

export const ANALYSIS_RAW_TEXT_MAX = 10_000;
const UNMATCHED_MAX = 100;

export interface LogAnalysisInput {
  userId: string | null;
  status: "shown" | "teaser" | "blocked";
  inputMethod: "text" | "photo" | "product";
  platform: "web" | "mobile_app";
  productId: string | null;
  rawText: string;
  ingredientIds: string[];
  unmatched: string[];
  total: number;
  recognized: number;
  conflicts: number;
}

/**
 * Хэш состава: sha256 от отсортированных id распознанных ингредиентов.
 * Одинаковые составы в разном порядке дают один хэш — так считаем
 * «один и тот же состав» в обезличенной B2B-аналитике.
 */
export function analysisTextHash(ingredientIds: string[]): string {
  return createHash("sha256").update([...ingredientIds].sort().join(",")).digest("hex");
}

/**
 * Записывает разбор в журнал Analysis. Никогда не роняет ответ:
 * ошибки пишем в лог и продолжаем. Гостевые записи ограничены
 * ANALYSIS_GUEST_LOG_DAILY_LIMIT в сутки — сверх лимита просто не пишем.
 */
export async function logAnalysis(input: LogAnalysisInput): Promise<void> {
  try {
    if (input.userId === null) {
      if (!takeDaily(GUEST_LOG_COUNTER_KEY, ANALYSIS_GUEST_LOG_DAILY_LIMIT)) return;
    }
    await prisma.analysis.create({
      data: {
        userId: input.userId,
        status: input.status,
        inputMethod: input.inputMethod,
        platform: input.platform,
        productId: input.productId,
        rawText: input.rawText.slice(0, ANALYSIS_RAW_TEXT_MAX),
        textHash: analysisTextHash(input.ingredientIds),
        ingredientIds: input.ingredientIds,
        unmatched: input.unmatched.slice(0, UNMATCHED_MAX),
        total: input.total,
        recognized: input.recognized,
        conflicts: input.conflicts,
      },
    });
  } catch (err) {
    console.error("[analysis/log]", err instanceof Error ? err.message : err);
  }
}
