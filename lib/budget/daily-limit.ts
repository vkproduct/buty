/**
 * Общие суточные лимиты в памяти процесса (у Buty один сервер).
 * Сутки считаются по московскому времени: сброс в 00:00 МСК,
 * а не «24 часа от первого запроса». В РФ нет перехода на летнее время,
 * поэтому смещение от UTC постоянное — 3 часа.
 */

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Момент начала текущих суток по МСК (мс от epoch). */
export function mskDayStart(now = Date.now()): number {
  return Math.floor((now + MSK_OFFSET_MS) / DAY_MS) * DAY_MS - MSK_OFFSET_MS;
}

interface Counter {
  dayStart: number;
  used: number;
  limit: number;
}

const counters = new Map<string, Counter>();

function counterFor(key: string, limit: number, now: number): Counter {
  const start = mskDayStart(now);
  let c = counters.get(key);
  if (!c || c.dayStart !== start) {
    c = { dayStart: start, used: 0, limit };
    counters.set(key, c);
  } else {
    // Лимит из env мог измениться между запросами — держим актуальным.
    c.limit = limit;
  }
  return c;
}

/** true — лимит пока не исчерпан (без увеличения счётчика). */
export function peekDaily(key: string, limit: number, now = Date.now()): boolean {
  return counterFor(key, limit, now).used < limit;
}

export function peekPerIpDaily(key: string, ip: string, limit: number, now = Date.now()): boolean {
  return peekDaily(`${key}:${ip}`, limit, now);
}

/** true — запрос прошёл, счётчик увеличен на 1. false — лимит исчерпан, счётчик не растёт. */
export function takeDaily(key: string, limit: number, now = Date.now()): boolean {
  const c = counterFor(key, limit, now);
  if (c.used >= c.limit) return false;
  c.used += 1;
  cleanup(now);
  return true;
}

export function takePerIpDaily(key: string, ip: string, limit: number, now = Date.now()): boolean {
  return takeDaily(`${key}:${ip}`, limit, now);
}

/** Текущее значение счётчика (для админки). limit — последний использованный. */
export function getDailyUsage(key: string): { used: number; limit: number; resetsAt: Date } {
  const c = counters.get(key);
  const start = c?.dayStart ?? mskDayStart();
  return {
    used: c?.used ?? 0,
    limit: c?.limit ?? 0,
    resetsAt: new Date(start + DAY_MS),
  };
}

/** Секунды до сброса суточных счётчиков (для заголовка Retry-After). */
export function dailyRetryAfter(now = Date.now()): number {
  return Math.max(1, Math.ceil((mskDayStart(now) + DAY_MS - now) / 1000));
}

function cleanup(now: number): void {
  if (counters.size <= 10_000) return;
  const start = mskDayStart(now);
  for (const [key, c] of counters) {
    if (c.dayStart < start) counters.delete(key);
  }
}

/** Сбрасывает все счётчики (для тестов). */
export function resetDailyLimits(): void {
  counters.clear();
}
