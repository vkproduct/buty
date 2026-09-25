import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_TOKEN_LENGTH = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/feedback { token, email? } → «Сообщить об ингредиенте». */
export async function POST(request: Request) {
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
