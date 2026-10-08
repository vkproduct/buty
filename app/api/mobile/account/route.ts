import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/mobile/account — удалить аккаунт и все данные пользователя
 * (полка, профиль кожи, реакции, напоминания, сессии, push-токены — каскадом).
 * Обязательно для App Store (правило 5.1.1(v)) и соответствует 152-ФЗ.
 */
export async function DELETE() {
  const session = await getSession();
  if (!session?.user) return jsonError("Требуется вход", 401);
  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ ok: true });
}
