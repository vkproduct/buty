import { API_URL } from './config';
import { currentToken } from './token-store';

/** Ошибка API с текстом для пользователя (сервер отдаёт { error, code? }). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Подписка на 401 — сессия истекла или отозвана: приложение выходит из аккаунта. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

const NETWORK_ERROR = 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';

/** Запрос к API Buty: JSON или multipart, Bearer-токен, понятные ошибки. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = currentToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(NETWORK_ERROR, 0);
  }

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; code?: string };
    if (response.status === 401 && token) {
      unauthorizedListeners.forEach((l) => l());
    }
    throw new ApiError(
      payload.error ?? (response.status >= 500 ? 'Сервер временно недоступен. Попробуйте позже.' : 'Что-то пошло не так'),
      response.status,
      payload.code,
    );
  }
  return data as T;
}

/** Текст ошибки для показа пользователю. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Что-то пошло не так';
}

/**
 * Текст ошибки добавления на полку. Лимит бесплатного тарифа объясняем
 * без призыва купить: оплата в приложении не предусмотрена (правила App Store 3.1.1).
 */
export function shelfAddErrorMessage(error: unknown, freeLimit = 2): string {
  if (error instanceof ApiError && error.code === 'PAYWALL') {
    return `На бесплатном тарифе на полке до ${freeLimit} средств. Уберите одно из них, чтобы добавить новое.`;
  }
  return errorMessage(error);
}
