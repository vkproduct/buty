/**
 * Лимиты распознавания фото (Google Vision, платный API).
 * Порядок проверок: часовой лимит IP → суточный лимит IP → общий суточный.
 * Счётчик увеличивается только если все проверки прошли.
 */
import {
  dailyRetryAfter,
  peekDaily,
  peekPerIpDaily,
  resetDailyLimits,
  takeDaily,
  takePerIpDaily,
} from "@/lib/budget/daily-limit";

const WINDOW_MS = 60 * 60 * 1000;
export const OCR_LIMIT_PER_HOUR = 20;
export const DEFAULT_OCR_DAILY_LIMIT = 150;
export const DEFAULT_OCR_PER_IP_DAILY_LIMIT = 60;
export const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

/** Ключ общего суточного счётчика в lib/budget/daily-limit (админка читает по нему). */
export const OCR_DAILY_COUNTER_KEY = "ocr";

const hits = new Map<string, number[]>();

export function ocrDailyLimit(): number {
  const n = Number(process.env.OCR_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_OCR_DAILY_LIMIT;
}

export function ocrPerIpDailyLimit(): number {
  const n = Number(process.env.OCR_PER_IP_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_OCR_PER_IP_DAILY_LIMIT;
}

export type OcrQuota = "ok" | "hour" | "day";

/**
 * Лимиты на IP в час и в сутки плюс общий суточный (память процесса, один сервер).
 * Возвращает, какой именно лимит исчерпан, — роут различает тексты ошибок.
 */
export function takeOcrQuota(ip: string, now = Date.now()): OcrQuota {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= OCR_LIMIT_PER_HOUR) {
    hits.set(ip, recent);
    return "hour";
  }
  if (!peekPerIpDaily(OCR_DAILY_COUNTER_KEY, ip, ocrPerIpDailyLimit(), now)) {
    hits.set(ip, recent);
    return "day";
  }
  if (!peekDaily(OCR_DAILY_COUNTER_KEY, ocrDailyLimit(), now)) {
    hits.set(ip, recent);
    return "day";
  }
  takePerIpDaily(OCR_DAILY_COUNTER_KEY, ip, ocrPerIpDailyLimit(), now);
  takeDaily(OCR_DAILY_COUNTER_KEY, ocrDailyLimit(), now);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return "ok";
}

/** Секунды до освобождения часового окна IP (для заголовка Retry-After). */
export function ocrHourRetryAfter(ip: string, now = Date.now()): number {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length === 0) return Math.ceil(WINDOW_MS / 1000);
  return Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
}

/** Секунды до сброса суточных лимитов (00:00 МСК). */
export function ocrDayRetryAfter(now = Date.now()): number {
  return dailyRetryAfter(now);
}

/** Сбрасывает счётчики (для тестов). */
export function resetOcrQuota(): void {
  hits.clear();
  resetDailyLimits();
}
