import { NextResponse } from "next/server";

import { analyzeText } from "@/lib/analysis/analyze";
import { getAiSummary } from "@/lib/ai-summary/service";

export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 10_000;

/**
 * POST /api/analyze/summary { text } → краткое резюме состава от ИИ.
 * Состав заново разбирается по базе на сервере (это быстро и без ИИ), поэтому
 * клиент не может подсунуть в промпт свои данные.
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
    return NextResponse.json({ error: "Передайте непустое поле text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Текст длиннее ${MAX_TEXT_LENGTH} символов` }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const result = await analyzeText(text);
  return NextResponse.json(await getAiSummary(result, ip));
}
