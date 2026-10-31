import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { clientIp, takeQuota } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

type NextAuthRouteContext = { params: { nextauth: string[] } };

/** Запросов magic-link с одного IP в час — защита квоты Resend от перебора адресов. */
const SIGNIN_EMAIL_IP_LIMIT = 20;

/**
 * POST /api/auth/signin/email — запрос письма со ссылкой входа. Остальные POST
 * NextAuth (csrf, callback) лимиту не подвержены. При превышении отвечаем 429
 * с JSON { url } — клиент next-auth читает его и показывает error, как при
 * штатной ошибке отправки.
 *
 * Второй аргумент context ({ params: { nextauth } }) обязательно передаём в handler:
 * по нему next-auth v4 понимает, что это App Router. Без него он уходит в обработчик
 * Pages Router (res.status у undefined) → 500 на всех POST: выход, запрос ссылки,
 * колбэки. Так сломался «Выйти» после коммита 2d59c6a (31.10.2026).
 */
export async function POST(request: Request, context: NextAuthRouteContext) {
  const { pathname, origin } = new URL(request.url);
  const segments = pathname.split("/").filter(Boolean);
  if (segments[2] === "signin" && segments[3] === "email") {
    if (!takeQuota(`auth-signin-email:${clientIp(request)}`, SIGNIN_EMAIL_IP_LIMIT)) {
      return NextResponse.json(
        { url: `${origin}/auth/signin?error=RateLimited` },
        { status: 429 },
      );
    }
  }
  return handler(request, context);
}

export { handler as GET };
