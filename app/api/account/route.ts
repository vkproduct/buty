import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account/delete";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/account — удалить аккаунт и все данные пользователя (сайт).
 * Логика общая с приложением — lib/account/delete.ts.
 */
export async function DELETE() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  await deleteUserAccount(session.user.id);
  return NextResponse.json({ ok: true });
}
