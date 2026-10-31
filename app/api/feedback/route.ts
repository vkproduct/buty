import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { clientIp, takeQuota } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_TOKEN_LENGTH = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Обращений в час с одного IP — защита от спам-прогонов формы. */
const FEEDBACK_PER_IP_PER_HOUR = 30;

/** POST /api/feedback { token, email? } → «Сообщить об ингредиенте». */
export async function POST(request: Request) {
  if (!takeQuota(`feedback:${clientIp(request)}`, FEEDBACK_PER_IP_PER_HOUR)) {
    return NextResponse.json(
      { error: "Слишком много обращений. Попробуйте позже." },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { token, email } = (body ?? {}) as { token?: unknown; email?: unknown };
  if (typeof token !== "string" || token.trim().length === 0) {
    return NextResponse.json(
      { error: "Передайте непустое поле token" },
      { status: 400 },
    );
  }
  if (token.length > MAX_TOKEN_LENGTH) {
    return NextResponse.json({ error: "Слишком длинный токен" }, { status: 400 });
  }
  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 },
      );
    }
  }

  await prisma.feedback.create({
    data: {
      rawToken: token.trim(),
      email: typeof email === "string" && email.trim() ? email.trim() : null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
