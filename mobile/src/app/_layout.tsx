import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Pressable, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppText } from '@/components/ui/text';
import { AuthProvider, useAuth } from '@/lib/auth';
import { registerPush, useNotificationRouting } from '@/lib/push';
import { useDictionaries } from '@/lib/queries';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// react-query: обновлять данные при возвращении в приложение
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
onlineManager.setOnline(true);

/** Кнопка «Закрыть» для модальных экранов (жест смахивания тоже работает). */
function CloseButton() {
  return (
    <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
      <AppText color="brand">Закрыть</AppText>
    </Pressable>
  );
}

const modal = (title: string) => ({ presentation: 'modal' as const, title, headerLeft: () => <CloseButton /> });

function RootNavigator() {
  const { status } = useAuth();
  const c = useColors();
  useDictionaries(); // прогреваем справочники подписей

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
    // Разрешение уже дано раньше — тихо обновляем push-токен устройства
    if (status === 'signedIn') registerPush(false).catch(() => undefined);
  }, [status]);

  useNotificationRouting(status === 'signedIn');

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';
  return (
    <Stack
      screenOptions={{
        headerTintColor: c.brand,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.grouped },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="ingredient/[slug]" options={{ title: '' }} />
      <Stack.Screen name="product/[slug]" options={{ title: '' }} />

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={modal('Вход')} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="shelf-item/[id]" options={{ title: '' }} />
        <Stack.Screen name="onboarding" options={modal('Профиль кожи')} />
        <Stack.Screen name="add-to-shelf" options={modal('Добавить на полку')} />
        <Stack.Screen name="reaction" options={modal('Реакция кожи')} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
