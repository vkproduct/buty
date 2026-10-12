/**
 * Mixpanel (серверный трекинг): события, которые надёжнее фиксировать на бэкенде.
 *
 * distinct_id = id пользователя в БД — совпадает с identify() на клиенте
 * (Simplified ID Merge свяжет анонимную и авторизованную историю).
 * Токен: NEXT_PUBLIC_MIXPANEL_TOKEN (тот же, что у клиента).
 * Ошибки трекинга не должны ронять запрос — все вызовы оборачиваются в try/catch.
 */

import Mixpanel from "mixpanel";

const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? "";
/** Проект с хранением в ЕС: NEXT_PUBLIC_MIXPANEL_API_HOST="https://api-eu.mixpanel.com". */
const apiHost = (process.env.NEXT_PUBLIC_MIXPANEL_API_HOST ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

let client: Mixpanel.Mixpanel | null = null;

function getClient(): Mixpanel.Mixpanel | null {
  if (!token) return null;
  if (!client) client = Mixpanel.init(token, apiHost ? { host: apiHost } : {});
  return client;
}

/** Трекинг события от имени пользователя. Без токена или при ошибке — тихий no-op. */
export function trackServerEvent(
  userId: string,
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  try {
    getClient()?.track(name, { distinct_id: userId, ...properties });
  } catch {
    // аналитика не должна ломать бизнес-логику
  }
}

/** Свойства профиля пользователя (people.set). */
export function setServerProfile(
  userId: string,
  properties: Record<string, string | number | boolean>,
): void {
  try {
    getClient()?.people.set(userId, properties);
  } catch {
    // аналитика не должна ломать бизнес-логику
  }
}
