/**
 * Честные просмотры карточек: не больше одного засчитывания на пару
 * (IP, продукт) в сутки по МСК. IP в БД и в голом виде в памяти не храним —
 * только sha256(ip + productId + день). Бренды платят за эту аналитику,
 * минутный лимит «60 с IP» цифры не защищал — их легко было накрутить
 * обходом по товарам.
 */
import { createHash } from "node:crypto";

import { mskDayStart } from "@/lib/budget/daily-limit";

/** Ключ — хэш, значение — начало суток (мс), в которые он выставлен. */
const seen = new Map<string, number>();

/** Число ключей, после которого чистим записи за прошлые сутки. */
const CLEANUP_THRESHOLD = 100_000;

/** Возвращает true, если просмотр новый и его нужно засчитать. */
export function countProductView(ip: string, productId: string, now = Date.now()): boolean {
  const dayStart = mskDayStart(now);
  const key = createHash("sha256")
    .update(`${ip}|${productId}|${dayStart}`)
    .digest("hex");
  if (seen.has(key)) return false;
  seen.set(key, dayStart);
  if (seen.size > CLEANUP_THRESHOLD) {
    for (const [k, day] of seen) {
      if (day < dayStart) seen.delete(k);
    }
  }
  return true;
}

/** Тесты: сброс состояния. */
export function resetProductViewDedupe(): void {
  seen.clear();
}
