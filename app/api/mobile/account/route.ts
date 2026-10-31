import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account/delete";
import { jsonError } from "@/lib/mobile/http";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/mobile/account — удалить аккаунт и все данные пользователя
 * (полка, профиль кожи, реакции, напоминания, сессии, push-токены — каскадом).
 * Общая логика — lib/account/delete.ts (сайт использует тот же путь).
 * Обязательно для App Store (правило 5.1.1(v)) и соответствует 152-ФЗ.
 */
export async function DELETE() {
  const session = await getSession();
  if (!session?.user) return jsonError("Требуется вход", 401);
  await deleteUserAccount(session.user.id);
  return NextResponse.json({ ok: true });
}
