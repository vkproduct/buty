/**
 * Яндекс Метрика: номер счётчика и отправка целей.
 * Боевой счётчик включён в production-сборке (кроме превью Vercel);
 * NEXT_PUBLIC_YM_ID переопределяет номер, пустое значение выключает счётчик.
 */

const DEFAULT_YM_ID = "113224497";

const isProdBuild =
  process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview";

export const YM_ID =
  Number(process.env.NEXT_PUBLIC_YM_ID ?? (isProdBuild ? DEFAULT_YM_ID : "")) || 0;

/** Идентификаторы целей — те же строки нужно завести в Метрике (тип «JavaScript-событие»). */
export const GOALS = {
  analyzeSubmit: "analyze_submit",
  analyzePhoto: "analyze_photo",
  analyzeSuccess: "analyze_success",
  signupSubmit: "signup_submit",
  signupComplete: "signup_complete",
  skinProfileComplete: "skin_profile_complete",
  shelfAdd: "shelf_add",
  shelfLimit: "shelf_limit",
  whereToBuy: "where_to_buy",
  paymentStart: "payment_start",
  paymentSuccess: "payment_success",
  brandLead: "brand_lead",
} as const;

export type Goal = (typeof GOALS)[keyof typeof GOALS];

type Ym = (id: number, method: string, ...args: unknown[]) => void;
type PendingGoal = [Goal, Record<string, unknown> | undefined];
type MetrikaWindow = Window & { ym?: Ym; __ymPendingGoals?: PendingGoal[] };

/** Отправить цель. Если счётчик ещё не создан — положить в очередь, её разберёт flushPendingGoals(). */
export function reachGoal(goal: Goal, params?: Record<string, unknown>): void {
  if (!YM_ID || typeof window === "undefined") return;
  const w = window as MetrikaWindow;
  if (w.ym) {
    w.ym(YM_ID, "reachGoal", goal, params);
    return;
  }
  (w.__ymPendingGoals ??= []).push([goal, params]);
}

/** Вызывается сразу после init счётчика. Цели без согласия на cookie сюда не попадут: счётчик без согласия не создаётся. */
export function flushPendingGoals(): void {
  if (!YM_ID || typeof window === "undefined") return;
  const w = window as MetrikaWindow;
  const pending = w.__ymPendingGoals ?? [];
  w.__ymPendingGoals = [];
  for (const [goal, params] of pending) w.ym?.(YM_ID, "reachGoal", goal, params);
}
