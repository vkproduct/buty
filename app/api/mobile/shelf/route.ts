import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";
import { loadShelfView } from "@/lib/shelf/view";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/shelf — вся «Моя полка» одним запросом: средства,
 * совместимость, дубли и режим, реакции, напоминания.
 * Без профиля кожи — 409 NEED_PROFILE (приложение откроет анкету).
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) return jsonError("Требуется вход", 401);

  const profile = await prisma.skinProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return jsonError("Заполните профиль кожи", 409, "NEED_PROFILE");

  const view = await loadShelfView(session.user.id, profile);
  return NextResponse.json({
    ...view,
    plan: {
      isPro: view.plan.isPro,
      currentPeriodEnd: view.plan.currentPeriodEnd?.toISOString() ?? null,
    },
    // Лимитов нет (все функции бесплатны с 24.10.2026); поле оставлено
    // для совместимости со старыми версиями приложения — null вместо чисел.
    limits: { freeShelf: null, freeReactions: null },
  });
}
