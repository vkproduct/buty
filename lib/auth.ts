import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { getServerSession, type Session } from "next-auth";
import { headers } from "next/headers";

import { getEmailProvider } from "@/lib/email";
import { parseBearer } from "@/lib/mobile/crypto";
import { getMobileSession } from "@/lib/mobile/session";
import { prisma } from "@/lib/prisma";

/** Конфиг NextAuth: email magic-link + Prisma-сессии в БД. */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "Buty.app <noreply@buty.app>",
      async sendVerificationRequest({ identifier, url }) {
        await getEmailProvider().send({
          to: identifier,
          subject: "Вход в Buty.app",
          text: `Ссылка для входа в Buty.app:\n${url}\n\nСсылка действует 24 часа.`,
        });
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
};

/** Bearer-токен мобильного приложения из заголовков текущего запроса. */
function bearerFromRequest(): string | null {
  try {
    return parseBearer(headers().get("authorization"));
  } catch {
    // вне контекста запроса (скрипты, сборка) заголовков нет
    return null;
  }
}

/**
 * Сессия текущего пользователя (или null).
 * Сайт — cookie NextAuth; приложение — заголовок «Authorization: Bearer bt_…».
 * Формат сессии одинаковый, поэтому API-роуты обслуживают оба клиента.
 */
export async function getSession(): Promise<Session | null> {
  const bearer = bearerFromRequest();
  if (bearer) return getMobileSession(bearer);
  return getServerSession(authOptions);
}
