import { NextResponse } from "next/server";

import { trackServerEvent } from "@/lib/analytics/mixpanel-server";
import { createWebSession } from "@/lib/auth-session";
import { isValidEmail, isWellFormedCode, normalizeEmail } from "@/lib/mobile/crypto";
import { jsonError, readJsonObject } from "@/lib/mobile/http";
import { verifyLoginCode } from "@/lib/mobile/login-code";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type CodeSignInSource = "analyze_gate" | "signin_page" | "header";

/**
 * POST /api/auth/code/verify { email, code, source? } →
 * { ok, isNewUser, hasSkinProfile }. Проверяет код из письма (общая логика
 * с мобильным приложением, review-вход выключен) и создаёт обычную сессию
 * NextAuth — полка, профиль и getServerSession работают без изменений.
 */
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body || typeof body.email !== "string" || typeof body.code !== "string") {
    return jsonError("Укажите email и код", 400);
  }
  const email = normalizeEmail(body.email);
  const code = body.code.replace(/\s+/g, "");
  if (!isValidEmail(email) || !isWellFormedCode(code)) {
    return jsonError("Код — 6 цифр из письма", 400);
  }
  const source: CodeSignInSource =
    body.source === "analyze_gate" || body.source === "header" ? body.source : "signin_page";

  const check = await verifyLoginCode(email, code, undefined, { allowReviewLogin: false });
  if (!check.ok) return jsonError(check.error, check.status);

  const now = new Date();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, emailVerified: now },
    update: {},
  });
  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: now } });
  }
  if (!existing) {
    // Регистрация на сайте кодом (как sign_up_completed у magic-link и в приложении).
    // В Mixpanel только анонимный id, без email.
    trackServerEvent(user.id, "sign_up_completed", {
      sign_up_method: "email_code",
      platform: "web",
      sign_up_source: source,
    });
  }

  await createWebSession(user.id);

  const profile = await prisma.skinProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, isNewUser: !existing, hasSkinProfile: Boolean(profile) });
}
