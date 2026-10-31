import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { getServerSession, type Session } from "next-auth";
import { headers } from "next/headers";

import { getEmailProvider } from "@/lib/email";
import { parseBearer } from "@/lib/mobile/crypto";
import { getMobileSession } from "@/lib/mobile/session";
import { prisma } from "@/lib/prisma";
import { trackServerEvent } from "@/lib/analytics/mixpanel-server";
import {
  checkLoginEmailQuota,
  LOGIN_EMAIL_COOLDOWN_MS,
  LOGIN_EMAIL_TOKEN_MAX_AGE_MS,
} from "@/lib/auth/login-email-quota";

/** Конфиг NextAuth: email magic-link + Prisma-сессии в БД. */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    newUser: "/onboarding?signup=1",
  },
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "Buty.app <noreply@buty.app>",
      // Срок жизни токена — в одну константу с лимитом писем (login-email-quota).
      maxAge: LOGIN_EMAIL_TOKEN_MAX_AGE_MS / 1000,
      async sendVerificationRequest({ identifier, url }) {
        // Лимит писем на адрес: ≤ 5 в час и не чаще раза в минуту (иначе бомбёжка
        // чужого ящика и сгоревшая квота Resend). Дата создания токена =
        // expires − срок жизни. Превышение → ошибка → NextAuth вернёт error=EmailSignin.
        const now = new Date();
        const tokens = await prisma.verificationToken.findMany({
          where: {
            identifier,
            expires: { gt: new Date(now.getTime() - LOGIN_EMAIL_COOLDOWN_MS - LOGIN_EMAIL_TOKEN_MAX_AGE_MS) },
          },
          select: { expires: true },
        });
        const quota = checkLoginEmailQuota(
          tokens.map((t) => t.expires),
          now,
        );
        if (!quota.ok) {
          throw new Error(`Login email rate limit (${quota.reason})`);
        }
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
  events: {
    // Первое создание пользователя (email magic-link) — регистрация, не вход.
    // В Mixpanel уходит только анонимный id, email не передаётся (152-ФЗ).
    createUser({ user }) {
      trackServerEvent(user.id, "sign_up_completed", {
        sign_up_method: "email",
        platform: "web",
      });
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
