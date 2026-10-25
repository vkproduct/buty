import type { Plan, Subscription } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * С 24.10.2026 все функции для пользователей бесплатны, монетизация — B2B
 * (бренды, дистрибьюторы). Платёжный код не удалён, а отключён этим флагом:
 * при USER_FEATURES_FREE = true getUserPlan не обращается к БД и отдаёт
 * полный доступ всем. Лимиты FREE_SHELF_LIMIT / FREE_REACTIONS_LIMIT и
 * canAddShelfItem удалены вместе с paywall в POST /api/shelf.
 */
export const USER_FEATURES_FREE = true;

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

/**
 * План пользователя: Pro при активной подписке, иначе free.
 *
 * С 24.10.2026 поле isPro означает «полный доступ», а не платную подписку:
 * при USER_FEATURES_FREE все получают isPro: true — старые клиенты
 * (iOS-сборки, mobile/) сразу видят все функции без правки приложения.
 */
export async function getUserPlan(userId: string): Promise<PlanInfo> {
  if (USER_FEATURES_FREE) {
    return { plan: "free", isPro: true, currentPeriodEnd: null };
  }
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const pro = isProActive(sub);
  return {
    plan: pro ? "pro" : "free",
    isPro: pro,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
  };
}
