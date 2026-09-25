import { NextResponse } from "next/server";

import { analyzeText } from "@/lib/analysis/analyze";

export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 10_000;

/** POST /api/analyze { text } → разбор состава. */
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

  const result = await analyzeText(text);
  return NextResponse.json(result);
}
