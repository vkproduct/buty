import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./provider";

export type {
  BillingPeriod,
  PaidPlan,
  PaymentLink,
  PaymentProvider,
  PaymentUser,
} from "./provider";
export { PLAN_PRICES } from "./provider";
export { decodeMockPaymentId } from "./mock";

/**
 * Фабрика платёжного провайдера. PAYMENTS_PROVIDER=mock (по умолчанию) —
 * MockPaymentProvider. Реальный провайдер — ЮKassa за тем же интерфейсом
 * (ключи YUKASSA_SHOP_ID / YUKASSA_SECRET_KEY в .env), подключается в проде.
 */
export function getPaymentProvider(): PaymentProvider {
  // Реальный адаптер ЮKassa будет выбран здесь по PAYMENTS_PROVIDER=yukassa.
  return new MockPaymentProvider();
}

/** Конец оплаченного периода от даты from. */
export function periodEndFor(
  period: "month" | "year",
  from: Date = new Date(),
): Date {
  const end = new Date(from);
  if (period === "month") end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}
