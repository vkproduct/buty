import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** POST /api/payments — создать ссылку на оплату Pro: { period: "month" | "year" }. */
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
