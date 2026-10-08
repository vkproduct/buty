import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from './api';

// Уведомление, пришедшее при открытом приложении, тоже показываем баннером
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let lastToken: string | null = null;

/** Push-токен этого устройства (если уже получен). */
export function devicePushToken(): string | null {
  return lastToken;
}

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export async function pushPermission(): Promise<PushPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Получить push-токен и привязать устройство к аккаунту.
 * ask=false — только если разрешение уже дано (тихо, при запуске).
 * ask=true — показать системный запрос (в момент, когда пользователь ставит напоминание).
 */
export async function registerPush(ask: boolean): Promise<PushPermission> {
  if (!Device.isDevice) return 'denied'; // на симуляторе push не работает
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Напоминания',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let status = await pushPermission();
  if (status === 'undetermined' && ask) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return status;

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('[push] нет EAS projectId — выполните `eas init` в папке mobile');
    return status;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  lastToken = data;
  await api('/api/mobile/push-tokens', { body: { token: data, platform: Platform.OS } });
  return status;
}

/** buty://shelf/<id> → экран средства; buty://shelf → полка. */
function openFromNotification(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url !== 'string') return;
  const match = /^buty:\/\/shelf\/?([\w-]*)$/.exec(url);
  if (!match) return;
  const id = match[1];
  // Даём навигации смонтироваться (важно при запуске приложения из уведомления)
  setTimeout(() => {
    if (id) router.push({ pathname: '/shelf-item/[id]', params: { id } });
    else router.navigate('/shelf');
  }, 300);
}

/** Переход по нажатию на уведомление — и при запущенном, и при холодном старте. */
export function useNotificationRouting(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active) openFromNotification(response);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => {
      active = false;
      sub.remove();
    };
  }, [enabled]);
}
