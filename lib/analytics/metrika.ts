/**
 * Яндекс Метрика: номер счётчика и отправка целей.
 * Счётчик выключен, пока не задан NEXT_PUBLIC_YM_ID.
 */

export const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID) || 0;

/** Идентификаторы целей — те же строки нужно завести в Метрике (тип «JavaScript-событие»). */
export const GOALS = {
  analyzeSubmit: "analyze_submit",
  signupSubmit: "signup_submit",
  whereToBuy: "where_to_buy",
  paymentStart: "payment_start",
  brandLead: "brand_lead",
} as const;

export type Goal = (typeof GOALS)[keyof typeof GOALS];

type Ym = (id: number, method: string, ...args: unknown[]) => void;

/** Отправить цель; без счётчика или до его загрузки — тихо ничего не делает. */
export function reachGoal(goal: Goal, params?: Record<string, unknown>): void {
  if (!YM_ID || typeof window === "undefined") return;
  const ym = (window as unknown as { ym?: Ym }).ym;
  ym?.(YM_ID, "reachGoal", goal, params);
}
