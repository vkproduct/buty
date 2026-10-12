import { prisma } from "@/lib/prisma";
import type { AnalysisResult } from "@/lib/analysis/types";

import { summaryKey } from "./fingerprint";
import { generateJson, geminiConfigFromEnv, GeminiError, type GeminiConfig } from "./gemini";
import {
  buildSummaryInput,
  isFullyRecognized,
  PROMPT_VERSION,
  RESPONSE_SCHEMA,
  SYSTEM_INSTRUCTION,
} from "./prompt";
import { takeAiQuota } from "./rate-limit";
import type { AiSummaryContent, AiSummaryResponse } from "./types";
import { bannedMatch, parseSummary } from "./validate";

/** Меньше 3 ингредиентов — резюмировать нечего. */
export const MIN_RECOGNIZED = 3;
/** Меньше половины состава распознано — резюме было бы неточным (правило 80/50 из «Видения»). */
export const MIN_COVERAGE = 0.5;

export type Eligibility = "ok" | "too-few" | "low-coverage";

export function summaryEligibility(summary: AnalysisResult["summary"]): Eligibility {
  if (summary.recognized < MIN_RECOGNIZED) return "too-few";
  if (summary.total > 0 && summary.recognized / summary.total < MIN_COVERAGE) return "low-coverage";
  return "ok";
}

// Одновременные запросы одного и того же состава ждут один ответ ИИ, а не плодят новые.
const inflight = new Map<string, Promise<AiSummaryContent | null>>();

async function generate(cfg: GeminiConfig, key: string, result: AnalysisResult): Promise<AiSummaryContent | null> {
  const started = Date.now();
  const response = await generateJson(cfg, {
    system: SYSTEM_INSTRUCTION,
    input: buildSummaryInput(result),
    schema: RESPONSE_SCHEMA,
  });
  const summary = parseSummary(response.text);
  if (!summary) {
    console.warn(
      `[ai-summary] ответ отклонён проверкой (${bannedMatch(response.text) ?? "формат или длина"}), ключ ${key.slice(0, 8)}`,
    );
    return null;
  }
  console.info(
    `[ai-summary] новое резюме ${key.slice(0, 8)}: ${response.inputTokens}+${response.outputTokens} токенов, ${Date.now() - started} мс`,
  );
  await prisma.aiSummary
    .upsert({
      where: { key },
      create: {
        key,
        model: cfg.model,
        promptVersion: PROMPT_VERSION,
        ...summary,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      },
      update: {},
    })
    .catch((e: unknown) => console.error("[ai-summary] не удалось сохранить в кэш:", e));
  return summary;
}

/** Резюме разбора: из кэша, иначе от Gemini. Ошибки ИИ не роняют страницу — блок просто скрывается. */
export async function getAiSummary(result: AnalysisResult, ip: string): Promise<AiSummaryResponse> {
  const cfg = geminiConfigFromEnv();
  if (!cfg) return { status: "disabled" };

  const eligibility = summaryEligibility(result.summary);
  if (eligibility !== "ok") return { status: "skipped", reason: eligibility };

  const key = summaryKey({
    ingredientIds: result.ingredients.map((i) => i.id),
    fullyRecognized: isFullyRecognized(result),
    model: cfg.model,
    promptVersion: PROMPT_VERSION,
  });

  const cached = await prisma.aiSummary.findUnique({ where: { key } });
  if (cached) {
    void prisma.aiSummary
      .update({ where: { key }, data: { hits: { increment: 1 }, lastUsedAt: new Date() } })
      .catch(() => undefined);
    return {
      status: "ok",
      cached: true,
      summary: {
        verdict: cached.verdict,
        inside: cached.inside,
        suits: cached.suits,
        caution: cached.caution,
      },
    };
  }

  let pending = inflight.get(key);
  if (!pending) {
    if (!takeAiQuota(ip)) return { status: "limited" };
    pending = generate(cfg, key, result).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }

  try {
    const summary = await pending;
    return summary ? { status: "ok", cached: false, summary } : { status: "unavailable" };
  } catch (e) {
    console.error("[ai-summary]", e instanceof GeminiError ? e.message : e);
    return { status: "unavailable" };
  }
}
