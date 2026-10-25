import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { USER_FEATURES_FREE } from "@/lib/billing";
import { getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments — создать ссылку на оплату Pro: { period: "month" | "year" }.
 * С 24.10.2026 все функции для пользователей бесплатны (USER_FEATURES_FREE),
 * создание платежей отключено: 410 Gone. Колбэк /api/payments/callback не тронут.
 */
export async function POST(request: Request) {
  if (USER_FEATURES_FREE) {
    return NextResponse.json(
      { error: "Все функции Buty бесплатны" },
      { status: 410 },
    );
  }

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { period } = body as { period?: unknown };
  if (period !== "month" && period !== "year") {
    return NextResponse.json(
      { error: "Передайте period: month или year" },
      { status: 400 },
    );
  }

  const payment = await getPaymentProvider().createPayment(
    { id: session.user.id, email: session.user.email ?? "" },
    { tier: "pro", period },
  );
  return NextResponse.json({ payment }, { status: 201 });
}
