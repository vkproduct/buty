/**
 * Мобильные сессии: Bearer-токен ↔ MobileSession.
 * Возвращаемый объект совместим с сессией NextAuth, поэтому все существующие
 * API-роуты (через getSession в lib/auth.ts) работают для приложения без правок.
 */
import type { Session } from "next-auth";

import { prisma } from "@/lib/prisma";
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_TOUCH_MS,
  SESSION_TTL_MS,
} from "./crypto";

/** Создаёт сессию и возвращает токен (в открытом виде — только здесь, один раз). */
export async function createMobileSession(userId: string, deviceName?: string | null) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.mobileSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      deviceName: deviceName?.slice(0, 100) || null,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

/** Сессия NextAuth-формата по Bearer-токену или null (нет, истекла). */
export async function getMobileSession(token: string, now = new Date()): Promise<Session | null> {
  const row = await prisma.mobileSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!row) return null;
  if (row.expiresAt <= now) {
    await prisma.mobileSession.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }
  // Скользящий срок: раз в сутки продлеваем сессию активного пользователя
  let expiresAt = row.expiresAt;
  if (now.getTime() - row.lastUsedAt.getTime() > SESSION_TOUCH_MS) {
    expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await prisma.mobileSession
      .update({ where: { id: row.id }, data: { lastUsedAt: now, expiresAt } })
      .catch(() => undefined);
  }
  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      image: row.user.image,
    },
    expires: expiresAt.toISOString(),
  };
}

/** Удаляет сессию по токену (выход). */
export async function deleteMobileSession(token: string): Promise<void> {
  await prisma.mobileSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}
