import Constants from 'expo-constants';

/**
 * Адрес сервера Buty. По умолчанию — прод (app.json → extra.apiUrl).
 * Для локальной разработки: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npx expo start
 */
export const API_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'https://buty.app'
).replace(/\/+$/, '');

export const SUPPORT_EMAIL = 'support@buty.app';
