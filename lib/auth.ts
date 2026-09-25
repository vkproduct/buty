import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { getServerSession } from "next-auth";

import { getEmailProvider } from "@/lib/email";
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
      from: process.env.EMAIL_FROM ?? "Buty.ru <noreply@buty.ru>",
      async sendVerificationRequest({ identifier, url }) {
        await getEmailProvider().send({
          to: identifier,
          subject: "Вход в Buty.ru",
          text: `Ссылка для входа в Buty.ru:\n${url}\n\nСсылка действует 24 часа.`,
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

/** Серверная сессия текущего пользователя (или null). */
export function getSession() {
  return getServerSession(authOptions);
}
