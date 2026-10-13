/**
 * Единая отправка целей маркетинговой аналитики: Яндекс Метрика (reachGoal) + Google tag (GA4).
 * Вызывать из клиентских компонентов вместо прямого reachGoal — GA4 получает событие автоматически.
 *
 * GA4-события: рекомендуемые имена (sign_up, begin_checkout, generate_lead) плюс кастомные.
 * Чтобы событие считалось конверсией в GA4, его нужно отметить как ключевое
 * (Admin → Key events → New key event) — код на это не влияет.
 */

import { gaEvent } from "@/lib/analytics/gtag";
import { GOALS, reachGoal, type Goal } from "@/lib/analytics/metrika";

export { GOALS };
export type { Goal };

/** Соответствие целей Метрики (значения GOALS) событиям GA4. */
export const GA_GOAL_EVENTS: Record<Goal, string> = {
  analyze_submit: "analyze_submit",
  analyze_photo: "analyze_photo",
  signup_submit: "sign_up",
  where_to_buy: "where_to_buy",
  payment_start: "begin_checkout",
  brand_lead: "generate_lead",
};

/** Отправить цель в оба счётчика; без счётчиков или до их загрузки — тихо ничего не делает. */
export function trackGoal(goal: Goal, params?: Record<string, unknown>): void {
  reachGoal(goal, params);
  gaEvent(GA_GOAL_EVENTS[goal], params);
}
