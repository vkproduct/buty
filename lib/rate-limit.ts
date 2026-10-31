/**
 * Простой лимит запросов по ключу (IP, email, пара IP+ресурс) в памяти процесса —
 * достаточно для одного сервера. Окно скользящее, час.
 */
const WINDOW_MS = 60 * 60 * 1000;
const buckets = new Map<string, number[]>();

export function takeQuota(key: string, limit: number, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= WINDOW_MS)) buckets.delete(k);
    }
  }
  return true;
}

/** IP клиента за прокси (Caddy проставляет X-Forwarded-For). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function resetQuota(): void {
  buckets.clear();
}
