import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics/mixpanel-server";
import { USER_FEATURES_FREE } from "@/lib/billing";
import { decodeMockPaymentId } from "@/lib/payments";
import { grantPro } from "@/lib/payments/grant";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/callback — коллбэк оплаты: { paymentId, status }.
 * С 24.10.2026 все функции для пользователей бесплатны (USER_FEATURES_FREE):
 * колбэк закрыт, 410 Gone — иначе любой мог выдать себе Pro самодельным
 * mock-paymentId. B2B-оплата брендов будет отдельным путём с проверкой
 * подписи провайдера.
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
  const { paymentId, status } = body as {
    paymentId?: unknown;
    status?: unknown;
  };
  if (typeof paymentId !== "string" || typeof status !== "string") {
    return NextResponse.json(
      { error: "Передайте paymentId и status" },
      { status: 400 },
    );
  }
  if (status !== "succeeded") {
    return NextResponse.json(
      { error: "Платёж не завершён" },
      { status: 402 },
    );
  }

  const mock = decodeMockPaymentId(paymentId);
  if (!mock) {
    return NextResponse.json(
      { error: "Неизвестный платёж" },
      { status: 400 },
    );
  }
  if (mock.userId !== session.user.id) {
    return NextResponse.json({ error: "Чужой платёж" }, { status: 403 });
  }

  const subscription = await grantPro(session.user.id, mock.period);
  // Оплата прошла — пара клиентского payment_started (полная воронка цели payment_start)
  trackServerEvent(session.user.id, "payment_completed", {
    period: mock.period,
    plan: subscription.plan,
  });
  return NextResponse.json({
    ok: true,
    plan: subscription.plan,
    period: mock.period,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}
