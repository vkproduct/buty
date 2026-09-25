import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suspectIngredientIds } from "@/lib/shelf/data";

export const dynamic = "force-dynamic";

const REACTION_TYPES = new Set([
  "redness",
  "itching",
  "burning",
  "breakouts",
  "dryness",
  "other",
]);

/** GET /api/reactions — таймлайн реакций текущего пользователя. */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const reactions = await prisma.skinReaction.findMany({
    where: { userId: session.user.id },
    include: {
      shelfItem: { include: { product: { select: { name: true, brand: true } } } },
    },
    orderBy: { occurredAt: "desc" },
  });
  return NextResponse.json({ reactions });
}

/**
 * POST /api/reactions — записать реакцию:
 * { shelfItemId, type, note?, photoUrl?, occurredAt? }.
 * Подозреваемые ингредиенты вычисляются из состава средства автоматически.
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
  const { shelfItemId, type, note, photoUrl, occurredAt } = body as {
    shelfItemId?: unknown;
    type?: unknown;
    note?: unknown;
    photoUrl?: unknown;
    occurredAt?: unknown;
  };

  if (typeof shelfItemId !== "string" || !shelfItemId) {
    return NextResponse.json({ error: "Передайте shelfItemId" }, { status: 400 });
  }
  if (typeof type !== "string" || !REACTION_TYPES.has(type)) {
    return NextResponse.json({ error: "Некорректный тип реакции" }, { status: 400 });
  }
  const item = await prisma.shelfItem.findUnique({ where: { id: shelfItemId } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Средство не найдено" }, { status: 404 });
  }

  let occurred = new Date();
  if (occurredAt !== undefined) {
    if (typeof occurredAt !== "string" || Number.isNaN(Date.parse(occurredAt))) {
      return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
    }
    occurred = new Date(occurredAt);
  }

  const suspectIds = (await suspectIngredientIds(shelfItemId, session.user.id)) ?? [];

  const reaction = await prisma.skinReaction.create({
    data: {
      userId: session.user.id,
      shelfItemId,
      type,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
      photoUrl: typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : null,
      occurredAt: occurred,
      suspectIngredientIds: JSON.stringify(suspectIds),
    },
  });
  // Реакция зафиксирована — статус средства «была реакция».
  if (item.status !== "reacted") {
    await prisma.shelfItem.update({
      where: { id: item.id },
      data: { status: "reacted" },
    });
  }
  return NextResponse.json({ reaction }, { status: 201 });
}
