import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { FREE_REACTIONS_LIMIT, FREE_SHELF_LIMIT, getUserPlan } from "@/lib/billing";
import { jsonError } from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/mobile/me — пользователь, тариф и наличие профиля кожи. */
export async function GET() {
  const session = await getSession();
  if (!session?.user) return jsonError("Требуется вход", 401);

  const [plan, profile, shelfCount] = await Promise.all([
    getUserPlan(session.user.id),
    prisma.skinProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.shelfItem.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    user: { id: session.user.id, email: session.user.email },
    plan: { isPro: plan.isPro, currentPeriodEnd: plan.currentPeriodEnd?.toISOString() ?? null },
    limits: { freeShelf: FREE_SHELF_LIMIT, freeReactions: FREE_REACTIONS_LIMIT },
    shelfCount,
    profile,
  });
}
