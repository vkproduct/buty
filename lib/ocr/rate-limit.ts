const WINDOW_MS = 60 * 60 * 1000;
export const OCR_LIMIT_PER_HOUR = 20;
export const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

const hits = new Map<string, number[]>();

/** Лимит распознаваний на IP в час (память процесса, один сервер); false — лимит исчерпан. */
export function takeOcrQuota(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= OCR_LIMIT_PER_HOUR) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return true;
}

/** Сбрасывает счётчики (для тестов). */
export function resetOcrQuota(): void {
  hits.clear();
}
