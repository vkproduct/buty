import { NextResponse } from "next/server";
import { ReminderType } from "@prisma/client";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REMINDER_DELAYS_DAYS } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/** GET /api/reminders — напоминания текущего пользователя (+ логи). */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const reminders = await prisma.reminder.findMany({
    where: { userId: session.user.id },
    include: {
      shelfItem: { include: { product: { select: { name: true, brand: true } } } },
      logs: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { nextRunAt: "asc" },
  });
  return NextResponse.json({ reminders });
}

/**
 * POST /api/reminders — создать напоминание:
 * { shelfItemId, type: "introduce" | "restock" } (28 / 90 дней).
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
  const { shelfItemId, type } = body as { shelfItemId?: unknown; type?: unknown };

  if (typeof shelfItemId !== "string" || !shelfItemId) {
    return NextResponse.json({ error: "Передайте shelfItemId" }, { status: 400 });
  }
  if (
    typeof type !== "string" ||
    !Object.values(ReminderType).includes(type as ReminderType)
  ) {
    return NextResponse.json({ error: "Некорректный тип" }, { status: 400 });
  }
  const item = await prisma.shelfItem.findUnique({
    where: { id: shelfItemId },
    include: { product: true },
  });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Средство не найдено" }, { status: 404 });
  }

  const days = REMINDER_DELAYS_DAYS[type as ReminderType];
  const nextRunAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const reminder = await prisma.reminder.create({
    data: {
      userId: session.user.id,
      shelfItemId,
      type: type as ReminderType,
      payload: JSON.stringify({
        title: item.product?.name ?? item.customName ?? "Своё средство",
        days,
      }),
      nextRunAt,
    },
  });
  return NextResponse.json({ reminder }, { status: 201 });
}
