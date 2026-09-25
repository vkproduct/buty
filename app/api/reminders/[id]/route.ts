import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

/** DELETE /api/reminders/[id] — отменить напоминание. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const reminder = await prisma.reminder.findUnique({ where: { id: params.id } });
  if (!reminder || reminder.userId !== session.user.id) {
    return NextResponse.json({ error: "Напоминание не найдено" }, { status: 404 });
  }
  await prisma.reminder.delete({ where: { id: reminder.id } });
  return NextResponse.json({ ok: true });
}
