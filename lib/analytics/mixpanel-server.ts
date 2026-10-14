/**
 * Mixpanel (серверный трекинг): события, которые надёжнее фиксировать на бэкенде.
 *
 * distinct_id = id пользователя в БД — совпадает с identify() на клиенте
 * (Simplified ID Merge свяжет анонимную и авторизованную историю).
 * Токен: NEXT_PUBLIC_MIXPANEL_TOKEN (тот же, что у клиента).
 *
 * Персональные данные (152-ФЗ): в Mixpanel уходит только анонимный id.
 * Email, имя, телефон, IP не отправляются никогда — stripPii() вырезает их из свойств,
 * гео по IP выключено (geolocate: false → ip=0).
 *
 * Согласие:
 * - сайт (cookie-сессия) — событие уходит только при cookie buty_cookie_consent=all,
 *   как и клиентский трекинг (lib/analytics/consent.ts);
 * - мобильное приложение (Authorization: Bearer bt_…) — баннера нет, событие уходит
 *   (анонимный id, раскрыто в App Privacy и политике конфиденциальности);
 * - вне HTTP-запроса (скрипты, cron, вебхуки) — согласие неизвестно, событие не уходит.
 *
 * Ошибки трекинга не должны ронять запрос — все вызовы обёрнуты в try/catch.
 */

import { cookies, headers } from "next/headers";
import Mixpanel from "mixpanel";

import { parseBearer } from "@/lib/mobile/crypto";

type Props = Record<string, string | number | boolean>;

const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? "";
/** Проект с хранением в ЕС: NEXT_PUBLIC_MIXPANEL_API_HOST="https://api-eu.mixpanel.com". */
const apiHost = (process.env.NEXT_PUBLIC_MIXPANEL_API_HOST ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

/** Имя cookie согласия — то же, что в lib/analytics/consent.ts. */
const CONSENT_COOKIE = "buty_cookie_consent";

/** Ключи с персональными данными: в Mixpanel не уходят ни в событиях, ни в профиле. */
const PII_KEYS = new Set([
  "$email",
  "email",
  "$phone",
  "phone",
  "$name",
  "name",
  "$first_name",
  "first_name",
  "$last_name",
  "last_name",
  "$ip",
  "ip",
]);

let client: Mixpanel.Mixpanel | null = null;

function getClient(): Mixpanel.Mixpanel | null {
  if (!token) return null;
  if (!client) {
    client = Mixpanel.init(token, {
      geolocate: false,
      ...(apiHost ? { host: apiHost } : {}),
    });
  }
  return client;
}

/** Убирает из свойств email, имя, телефон и IP. */
export function stripPii(properties: Props = {}): Props {
  const clean: Props = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!PII_KEYS.has(key.toLowerCase())) clean[key] = value;
  }
  return clean;
}

/** Можно ли отправлять серверное событие для текущего запроса. */
export function hasServerAnalyticsConsent(): boolean {
  try {
    // Мобильное приложение: Bearer-токен, cookie-баннера нет.
    if (parseBearer(headers().get("authorization"))) return true;
    // Сайт: то же согласие, что и для клиентского Mixpanel.
    return cookies().get(CONSENT_COOKIE)?.value === "all";
  } catch {
    // Вне контекста запроса согласие неизвестно — не отправляем.
    return false;
  }
}

/** Трекинг события от имени пользователя. Без токена, без согласия или при ошибке — тихий no-op. */
export function trackServerEvent(userId: string, name: string, properties?: Props): void {
  try {
    if (!hasServerAnalyticsConsent()) return;
    getClient()?.track(name, { ...stripPii(properties), distinct_id: userId });
  } catch {
    // аналитика не должна ломать бизнес-логику
  }
}

/**
 * Свойства профиля пользователя (people.set). Сейчас нигде не вызывается:
 * профили в Mixpanel не создаём, email туда не пишем. PII отфильтровывается.
 */
export function setServerProfile(userId: string, properties: Props): void {
  try {
    if (!hasServerAnalyticsConsent()) return;
    const clean = stripPii(properties);
    if (Object.keys(clean).length === 0) return;
    getClient()?.people.set(userId, clean);
  } catch {
    // аналитика не должна ломать бизнес-логику
  }
}
