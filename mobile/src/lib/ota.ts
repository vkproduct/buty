import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Не чаще раза в минуту, чтобы не дёргать сервер при частом переключении приложений. */
const MIN_INTERVAL_MS = 60_000;

/**
 * Обновления по воздуху (EAS Update).
 * 1. При холодном старте expo-updates сам ждёт новую версию до 3 секунд (app.json → updates).
 * 2. Когда пользователь возвращается в приложение, проверяем новую версию,
 *    скачиваем и сразу перезапускаем JS. Так правки доходят до телефона без магазинов.
 * В режиме разработки и в Expo Go ничего не делает.
 */
export function useOtaUpdates() {
  const lastCheck = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    const run = async () => {
      const now = Date.now();
      if (busy.current || now - lastCheck.current < MIN_INTERVAL_MS) return;
      busy.current = true;
      lastCheck.current = now;
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) await Updates.reloadAsync();
      } catch {
        // нет сети или сервер обновлений недоступен — работаем на текущей версии
      } finally {
        busy.current = false;
      }
    };

    run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
    });
    return () => sub.remove();
  }, []);
}
