/** Контракт платёжного провайдера: создание ссылки на оплату Pro-подписки. */

export type BillingPeriod = "month" | "year";

export interface PaidPlan {
  tier: "pro";
  period: BillingPeriod;
}

export interface PaymentUser {
  id: string;
  email: string;
}

export interface PaymentLink {
  paymentId: string;
  url: string; // куда отправить пользователя оплачивать
  amount: number; // в рублях
  currency: "RUB";
}

export interface PaymentProvider {
  createPayment(user: PaymentUser, plan: PaidPlan): Promise<PaymentLink>;
}

export const PLAN_PRICES: Record<BillingPeriod, number> = {
  month: 299,
  year: 2990,
};
