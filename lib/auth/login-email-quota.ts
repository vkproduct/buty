/**
 * Лимит писем magic-link на один email: не больше 5 в час и не чаще 1 раза
 * в 60 секунд. Иначе любой может бомбить чужой ящик письмами от buty.app
 * и сжечь квоту Resend.
 *
 * NextAuth хранит токены в VerificationToken без даты создания — вычисляем
 * её из expires минус срок жизни токена (maxAge EmailProvider, см. lib/auth.ts;
 * константа должна совпадать с ним).
 */

/** Срок жизни токена magic-link — зеркало maxAge EmailProvider. */
export const LOGIN_EMAIL_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Писем с одного адреса в час. */
export const LOGIN_EMAIL_MAX_PER_HOUR = 5;
/** Минимальный интервал между письмами на один адрес. */
export const LOGIN_EMAIL_COOLDOWN_MS = 60 * 1000;

export type LoginEmailQuota =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "hourly"; retryAfterSec: number };

/** Проверяет лимит по списку expires токенов адреса (свежих, ~за последний час). */
export function checkLoginEmailQuota(expiresList: Date[], now = new Date()): LoginEmailQuota {
  const nowMs = now.getTime();
  const hourAgo = nowMs - 60 * 60 * 1000;
  const createdRecent = expiresList
    .map((e) => e.getTime() - LOGIN_EMAIL_TOKEN_MAX_AGE_MS)
    .filter((c) => c > hourAgo)
    .sort((a, b) => b - a);

  const last = createdRecent[0];
  if (last !== undefined && nowMs - last < LOGIN_EMAIL_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "cooldown",
      retryAfterSec: Math.ceil((LOGIN_EMAIL_COOLDOWN_MS - (nowMs - last)) / 1000),
    };
  }
  if (createdRecent.length >= LOGIN_EMAIL_MAX_PER_HOUR) {
    return {
      ok: false,
      reason: "hourly",
      retryAfterSec: Math.ceil((createdRecent[createdRecent.length - 1] + 60 * 60 * 1000 - nowMs) / 1000),
    };
  }
  return { ok: true };
}
