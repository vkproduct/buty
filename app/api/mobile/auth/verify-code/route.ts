import { NextResponse } from "next/server";

import { getUserPlan } from "@/lib/billing";
import { isValidEmail, isWellFormedCode, normalizeEmail } from "@/lib/mobile/crypto";
import { jsonError, readJsonObject } from "@/lib/mobile/http";
import { verifyLoginCode } from "@/lib/mobile/login-code";
import { createMobileSession } from "@/lib/mobile/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/auth/verify-code { email, code, deviceName? } →
 * { token, expiresAt, user } — токен для заголовка «Authorization: Bearer …».
 * Нового пользователя создаёт так же, как вход на сайте по ссылке.
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

  const check = await verifyLoginCode(email, code);
  if (!check.ok) return jsonError(check.error, check.status);

  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, emailVerified: now },
    update: {},
  });
  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: now } });
  }

  const deviceName = typeof body.deviceName === "string" ? body.deviceName : null;
  const { token, expiresAt } = await createMobileSession(user.id, deviceName);
  const [plan, profile] = await Promise.all([
    getUserPlan(user.id),
    prisma.skinProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: { id: user.id, email: user.email },
    plan: { isPro: plan.isPro, currentPeriodEnd: plan.currentPeriodEnd?.toISOString() ?? null },
    hasSkinProfile: Boolean(profile),
  });
}
