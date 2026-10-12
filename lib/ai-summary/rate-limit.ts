/**
 * Защита бюджета: лимиты считают только новые обращения к ИИ (ответы из кэша бесплатны).
 * Хранится в памяти процесса — у Buty один сервер.
 */
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const AI_LIMIT_PER_IP_PER_HOUR = 30;
export const DEFAULT_AI_DAILY_LIMIT = 2000;

const perIp = new Map<string, number[]>();
let day = { start: 0, count: 0 };

function dailyLimit(): number {
  const n = Number(process.env.AI_SUMMARY_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_AI_DAILY_LIMIT;
}

/** true — можно обратиться к ИИ; false — исчерпан лимит IP за час или общий за сутки. */
export function takeAiQuota(ip: string, now = Date.now()): boolean {
  if (now - day.start >= DAY_MS) day = { start: now, count: 0 };
  if (day.count >= dailyLimit()) return false;

  const recent = (perIp.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= AI_LIMIT_PER_IP_PER_HOUR) {
    perIp.set(ip, recent);
    return false;
  }
  recent.push(now);
  perIp.set(ip, recent);
  day.count += 1;

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
  day = { start: 0, count: 0 };
}
