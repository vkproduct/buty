/**
 * Криптография мобильного входа — чистые функции без БД (тестируются отдельно).
 * Коды и токены в базе не хранятся в открытом виде: код — HMAC, токен — SHA-256.
 */
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Длина одноразового кода из письма. */
export const CODE_LENGTH = 6;
/** Сколько живёт код. */
export const CODE_TTL_MS = 10 * 60 * 1000;
/** Сколько неверных попыток можно сделать для одного кода. */
export const CODE_MAX_ATTEMPTS = 5;
/** Пауза перед повторной отправкой кода на тот же адрес. */
export const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
/** Сколько кодов можно запросить на один адрес за час. */
export const CODE_MAX_PER_HOUR = 5;
/** Срок жизни мобильной сессии (продлевается при использовании). */
export const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
/** Как часто продлевать сессию и обновлять lastUsedAt (не на каждый запрос). */
export const SESSION_TOUCH_MS = 24 * 60 * 60 * 1000;

/** Префикс токена: по нему видно, что это токен Buty (удобно при утечке в логи). */
export const TOKEN_PREFIX = "bt_";

/** Нормализованный email: без пробелов по краям, в нижнем регистре. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Простая проверка формата email (строгая проверка — сам факт доставки кода). */
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Случайный код из CODE_LENGTH цифр (с ведущими нулями). */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** Код состоит ровно из CODE_LENGTH цифр. */
export function isWellFormedCode(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
}

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET не задан — мобильный вход невозможен");
  return value;
}

/** HMAC кода, привязанный к адресу: одинаковый код для разных адресов даёт разный хэш. */
export function hashCode(email: string, code: string, key: string = secret()): string {
  return createHmac("sha256", key).update(`${email}:${code}`).digest("hex");
}

/** Сравнение хэшей за постоянное время. */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && bufA.length > 0 && timingSafeEqual(bufA, bufB);
}

/** Новый токен сессии: 32 случайных байта. */
export function generateSessionToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

/** SHA-256 токена — то, что лежит в MobileSession.tokenHash. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Токен из заголовка «Authorization: Bearer bt_…» или null. */
export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1];
  return token.startsWith(TOKEN_PREFIX) && token.length <= 200 ? token : null;
}

/**
 * Демо-доступ для проверки приложения в App Review: Apple должен войти без
 * доступа к почте. Работает, только если заданы обе переменные окружения.
 */
export function isReviewLogin(email: string, code: string): boolean {
  const reviewEmail = process.env.APP_REVIEW_EMAIL;
  const reviewCode = process.env.APP_REVIEW_CODE;
  if (!reviewEmail || !reviewCode || !isWellFormedCode(reviewCode)) return false;
  return normalizeEmail(reviewEmail) === email && reviewCode === code;
}
