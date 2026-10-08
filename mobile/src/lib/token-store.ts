import * as SecureStore from 'expo-secure-store';

/** Токен сессии хранится в Keychain (доступен после первой разблокировки — для фоновых задач). */
const KEY = 'buty.session-token';
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let cached: string | null | undefined;

export async function loadToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    cached = await SecureStore.getItemAsync(KEY, OPTIONS);
  } catch {
    cached = null;
  }
  return cached;
}

export function currentToken(): string | null {
  return cached ?? null;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await SecureStore.setItemAsync(KEY, token, OPTIONS);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(KEY, OPTIONS).catch(() => undefined);
}
