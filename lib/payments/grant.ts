import { prisma } from "@/lib/prisma";

import { periodEndFor } from "./index";
import type { BillingPeriod } from "./provider";

/**
 * Выдать/продлить Pro-подписку пользователю после успешной оплаты.
 * Продление отсчитывается от текущего конца периода, если он в будущем.
 */
export async function grantPro(
  userId: string,
  period: BillingPeriod,
  now: Date = new Date(),
) {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  const base =
    existing?.currentPeriodEnd && existing.currentPeriodEnd > now
      ? existing.currentPeriodEnd
      : now;
  const currentPeriodEnd = periodEndFor(period, base);
  return prisma.subscription.upsert({
    where: { userId },
    create: { userId, plan: "pro", status: "active", currentPeriodEnd },
    update: { plan: "pro", status: "active", currentPeriodEnd },
  });
}
