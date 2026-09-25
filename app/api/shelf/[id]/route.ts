import { NextResponse } from "next/server";
import { ShelfStatus } from "@prisma/client";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

async function findOwnedItem(id: string, userId: string) {
  const item = await prisma.shelfItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) return null;
  return item;
}

/** PATCH /api/shelf/[id] { status } — сменить статус средства. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const item = await findOwnedItem(params.id, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Средство не найдено" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const status = (body as { status?: unknown })?.status;
  if (
    typeof status !== "string" ||
    !Object.values(ShelfStatus).includes(status as ShelfStatus)
  ) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const updated = await prisma.shelfItem.update({
    where: { id: item.id },
    data: { status: status as ShelfStatus },
  });
  return NextResponse.json({ item: updated });
}

/** DELETE /api/shelf/[id] — убрать средство с полки. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const item = await findOwnedItem(params.id, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Средство не найдено" }, { status: 404 });
  }
  await prisma.shelfItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
