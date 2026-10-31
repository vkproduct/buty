import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // как у NextAuth по умолчанию

/**
 * Создаёт обычную сессию NextAuth (стратегия database): строка в Session
 * + cookie сессии. Имя cookie и атрибуты совпадают с тем, что ставит
 * сам NextAuth v4 при входе по ссылке — см. next-auth/core/lib/cookie.
 * Используется для входа на сайте кодом из письма (вход на месте).
 */
export async function createWebSession(userId: string): Promise<void> {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({ data: { sessionToken, userId, expires } });

  const secure = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  cookies().set(
    secure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    sessionToken,
    { httpOnly: true, sameSite: "lax", path: "/", secure, expires },
  );
}
