/**
 * Защита бюджета: лимиты считают только новые обращения к ИИ (ответы из кэша бесплатны).
 * Хранится в памяти процесса — у Buty один сервер.
 *
 * Порядок проверок: часовой лимит IP → суточный лимит IP → общий суточный.
 * Счётчик увеличивается только если все проверки прошли.
 */
import {
  peekDaily,
  peekPerIpDaily,
  resetDailyLimits,
  takeDaily,
  takePerIpDaily,
} from "@/lib/budget/daily-limit";

const HOUR_MS = 60 * 60 * 1000;

export const AI_LIMIT_PER_IP_PER_HOUR = 30;
export const DEFAULT_AI_DAILY_LIMIT = 200;
export const DEFAULT_AI_PER_IP_DAILY_LIMIT = 60;

/** Ключ общего суточного счётчика в lib/budget/daily-limit (админка читает по нему). */
export const AI_DAILY_COUNTER_KEY = "ai-summary";

const perIp = new Map<string, number[]>();

export function aiDailyLimit(): number {
  const n = Number(process.env.AI_SUMMARY_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_AI_DAILY_LIMIT;
}

export function aiPerIpDailyLimit(): number {
  const n = Number(process.env.AI_SUMMARY_PER_IP_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_AI_PER_IP_DAILY_LIMIT;
}

/** true — можно обратиться к ИИ; false — исчерпан лимит IP за час или за сутки, или общий за сутки. */
export function takeAiQuota(ip: string, now = Date.now()): boolean {
  const recent = (perIp.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= AI_LIMIT_PER_IP_PER_HOUR) {
    perIp.set(ip, recent);
    return false;
  }

  // Сначала проверяем все лимиты без увеличения счётчиков…
  if (!peekPerIpDaily(AI_DAILY_COUNTER_KEY, ip, aiPerIpDailyLimit(), now)) {
    perIp.set(ip, recent);
    return false;
  }
  if (!peekDaily(AI_DAILY_COUNTER_KEY, aiDailyLimit(), now)) {
    perIp.set(ip, recent);
    return false;
  }
  // …и только теперь увеличиваем: отказ не должен тратить квоту.
  takePerIpDaily(AI_DAILY_COUNTER_KEY, ip, aiPerIpDailyLimit(), now);
  takeDaily(AI_DAILY_COUNTER_KEY, aiDailyLimit(), now);

  recent.push(now);
  perIp.set(ip, recent);

  if (perIp.size > 10_000) {
    for (const [key, times] of perIp) {
      if (times.every((t) => now - t >= HOUR_MS)) perIp.delete(key);
    }
  }
  return true;
}

/** Сбрасывает счётчики (для тестов). */
export function resetAiQuota(): void {
  perIp.clear();
  resetDailyLimits();
}
