import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/** DELETE /api/analyses/[id] — удалить свою запись из истории разборов (чужая → 404). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите" }, { status: 401 });
  }
  const row = await prisma.analysis.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }
  await prisma.analysis.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
