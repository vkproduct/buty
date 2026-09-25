import type { Plan, Subscription } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Лимиты бесплатного тарифа. */
export const FREE_SHELF_LIMIT = 2;
export const FREE_REACTIONS_LIMIT = 5;

export interface PlanInfo {
  plan: Plan;
  isPro: boolean;
  currentPeriodEnd: Date | null;
}

/** Pro активен, пока подписка не отменена и период не истёк. */
export function isProActive(
  sub: Pick<Subscription, "plan" | "status" | "currentPeriodEnd"> | null,
  now: Date = new Date(),
): boolean {
  if (!sub || sub.plan !== "pro" || sub.status !== "active") return false;
  if (!sub.currentPeriodEnd) return false;
  return sub.currentPeriodEnd > now;
}

/** Можно ли добавить средство на полку при текущем плане и числе средств. */
export function canAddShelfItem(isPro: boolean, currentCount: number): boolean {
  return isPro || currentCount < FREE_SHELF_LIMIT;
}

/** План пользователя: Pro при активной подписке, иначе free. */
export async function getUserPlan(userId: string): Promise<PlanInfo> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const pro = isProActive(sub);
  return {
    plan: pro ? "pro" : "free",
    isPro: pro,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
  };
}
