import { randomBytes } from "crypto";

import {
  PLAN_PRICES,
  type BillingPeriod,
  type PaymentLink,
  type PaymentProvider,
  type PaymentUser,
  type PaidPlan,
} from "./provider";

/**
 * Mock-провайдер: вместо платёжной страницы отдаёт ссылку на /pricing
 * с параметром mockPayment — там кнопка «Симулировать оплату».
 * paymentId кодирует период и пользователя: mock_<period>_<userId>_<rand>.
 */
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(user: PaymentUser, plan: PaidPlan): Promise<PaymentLink> {
    const rand = randomBytes(6).toString("hex");
    const paymentId = `mock_${plan.period}_${user.id}_${rand}`;
    return {
      paymentId,
      url: `/pricing?mockPayment=${encodeURIComponent(paymentId)}`,
      amount: PLAN_PRICES[plan.period],
      currency: "RUB",
    };
  }
}

export interface MockPayment {
  period: BillingPeriod;
  userId: string;
}

/** Разобрать mock-paymentId; null — если формат чужой. */
export function decodeMockPaymentId(paymentId: string): MockPayment | null {
  const m = /^mock_(month|year)_([A-Za-z0-9]+)_([0-9a-f]{12})$/.exec(paymentId);
  if (!m) return null;
  return { period: m[1] as BillingPeriod, userId: m[2] };
}
