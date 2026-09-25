import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { decodeMockPaymentId } from "@/lib/payments";
import { grantPro } from "@/lib/payments/grant";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/callback — коллбэк оплаты: { paymentId, status }.
 * В mock-режиме paymentId валидируется по формату MockPaymentProvider
 * и должен принадлежать текущему пользователю. Реальный провайдер (ЮKassa)
 * будет присылать подписанный webhook за тем же интерфейсом.
 */
export async function POST(request: Request) {
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
  return NextResponse.json({
    ok: true,
    plan: subscription.plan,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}
