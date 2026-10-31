import { NextResponse } from "next/server";

import { analyzeText } from "@/lib/analysis/analyze";
import { getAnalyzeGate } from "@/lib/analysis/gate";
import { ANALYSIS_RAW_TEXT_MAX, logAnalysis } from "@/lib/analysis/log";
import type { AnalysisTeaser } from "@/lib/analysis/types";
import { getSession } from "@/lib/auth";
import { requestPlatform } from "@/lib/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 10_000;

const INPUT_METHODS = new Set(["text", "photo", "product"]);

/**
 * POST /api/analyze { text, inputMethod?, productId? } → разбор состава.
 * Гостю отдаётся полный разбор только при ANALYZE_GATE=off; teaser — сводка без карточек;
 * hard (по умолчанию) — 401 auth_required. Журнал Analysis пишется всегда (см. lib/analysis/log).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Передайте непустое поле text" },
      { status: 400 },
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Текст длиннее ${MAX_TEXT_LENGTH} символов` },
      { status: 400 },
    );
  }

  const inputMethodRaw = (body as { inputMethod?: unknown })?.inputMethod;
  const inputMethod =
    typeof inputMethodRaw === "string" && INPUT_METHODS.has(inputMethodRaw)
      ? (inputMethodRaw as "text" | "photo" | "product")
      : "text";

  // productId принимаем, только если такой продукт существует (переход со страницы продукта)
  let productId: string | null = null;
  const productIdRaw = (body as { productId?: unknown })?.productId;
  if (typeof productIdRaw === "string" && productIdRaw.length > 0) {
    const product = await prisma.product.findUnique({
      where: { id: productIdRaw },
      select: { id: true },
    });
    productId = product?.id ?? null;
  }

  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const gate = getAnalyzeGate();
  const platform = requestPlatform();

  // Разбор выполняется всегда (быстро, без внешних сервисов) — журнал собирается и у гостей
  const result = await analyzeText(text);

  const status: "shown" | "teaser" | "blocked" =
    userId !== null || gate === "off" ? "shown" : gate === "teaser" ? "teaser" : "blocked";
  await logAnalysis({
    userId,
    status,
    inputMethod,
    platform,
    productId,
    rawText: text.slice(0, ANALYSIS_RAW_TEXT_MAX),
    ingredientIds: result.ingredients.map((i) => i.id),
    unmatched: result.unmatched,
    total: result.summary.total,
    recognized: result.summary.recognized,
    conflicts: result.conflicts.length,
  });

  if (userId !== null || gate === "off") {
    let hasSkinProfile: boolean | undefined;
    if (userId !== null) {
      hasSkinProfile = Boolean(
        await prisma.skinProfile.findUnique({ where: { userId }, select: { id: true } }),
      );
    }
    return NextResponse.json({ ...result, gate: "none", ...(hasSkinProfile !== undefined ? { hasSkinProfile } : {}) });
  }

  if (gate === "teaser") {
    const teaser: AnalysisTeaser = {
      gate: "teaser",
      summary: result.summary,
      conflictsCount: result.conflicts.length,
      ingredientsCount: result.ingredients.length,
      unmatchedCount: result.unmatched.length,
    };
    return NextResponse.json(teaser);
  }

  return NextResponse.json(
    { error: "Войдите, чтобы увидеть разбор — это бесплатно", gate: "hard", code: "auth_required" },
    { status: 401 },
  );
}
