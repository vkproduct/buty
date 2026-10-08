import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { jsonError, readJsonObject } from "@/lib/mobile/http";
import { isExpoPushToken } from "@/lib/reminders/expo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set(["ios", "android"]);

/** POST /api/mobile/push-tokens { token, platform } — привязать устройство к пользователю. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) return jsonError("Требуется вход", 401);

  const body = await readJsonObject(request);
  const token = body?.token;
  const platform = body?.platform;
  if (typeof token !== "string" || !isExpoPushToken(token)) {
    return jsonError("Некорректный push-токен", 400);
  }
  if (typeof platform !== "string" || !PLATFORMS.has(platform)) {
    return jsonError("Некорректная платформа", 400);
  }
  // Устройство могло перейти к другому аккаунту — токен всегда у последнего вошедшего
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, userId: session.user.id },
    update: { platform, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/mobile/push-tokens { token } — отключить уведомления на устройстве. */
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user) return jsonError("Требуется вход", 401);
  const body = await readJsonObject(request);
  if (typeof body?.token !== "string") return jsonError("Передайте token", 400);
  await prisma.pushToken.deleteMany({ where: { token: body.token, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
