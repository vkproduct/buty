import * as Application from 'expo-application';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { API_URL, SUPPORT_EMAIL } from '@/lib/config';
import { formatDate } from '@/lib/format';
import { devicePushToken, pushPermission, registerPush, type PushPermission } from '@/lib/push';
import { useDeleteSkinProfile, useDictionaries, useMe } from '@/lib/queries';
import { space, useColors } from '@/theme';

function AboutSection() {
  const dict = useDictionaries().data;
  const site = dict?.links.site ?? API_URL;
  return (
    <Section title="О приложении" footer={`Buty ${Application.nativeApplicationVersion ?? ''} (${Application.nativeBuildVersion ?? ''})`}>
      <ListRow
        title="Как мы оцениваем ингредиенты"
        icon="checkmark.seal"
        chevron
        onPress={() => WebBrowser.openBrowserAsync(`${site}/ingredients`)}
      />
      <ListRow
        title="Политика конфиденциальности"
        icon="hand.raised"
        chevron
        onPress={() => WebBrowser.openBrowserAsync(`${site}${dict?.links.privacy ?? '/privacy'}`)}
      />
      <ListRow
        title="Написать в поддержку"
        icon="envelope"
        chevron
        last
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
      />
    </Section>
  );
}

/** Вкладка «Профиль»: аккаунт, профиль кожи, уведомления, выход и удаление аккаунта. */
export default function ProfileScreen() {
  const c = useColors();
  const { status, signOut, deleteAccount } = useAuth();
  const me = useMe();
  const dict = useDictionaries().data;
  const deleteProfile = useDeleteSkinProfile();
  const [push, setPush] = useState<PushPermission | null>(null);

  useFocusEffect(
    useCallback(() => {
      pushPermission().then(setPush).catch(() => undefined);
    }, []),
  );

  if (status !== 'signedIn') {
    return (
      <Screen tab title="Профиль">
        <View style={{ gap: space.md }}>
          <AppText variant="callout" color="muted">
            Войдите, чтобы собрать свою полку, проверять совместимость средств и получать напоминания.
          </AppText>
          <Button title="Войти по email" onPress={() => router.push('/sign-in')} />
        </View>
        <AboutSection />
      </Screen>
    );
  }

  if (me.isPending) return <Loading />;
  const data = me.data;
  const profile = data?.profile;
  const skinLabel = (id: string) =>
    dict?.skinProfile.skinTypes.find((t) => t.id === id)?.label ?? (id === 'sensitive' ? 'Чувствительная' : id);

  const confirmSignOut = () =>
    Alert.alert('Выйти из аккаунта?', 'Полка сохранится — войдите снова с тем же email.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => void signOut({ pushToken: devicePushToken() }) },
    ]);

  const confirmDeleteAccount = () =>
    Alert.alert(
      'Удалить аккаунт?',
      'Удалим аккаунт и все данные: полку, профиль кожи, реакции и напоминания. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить навсегда',
          style: 'destructive',
          onPress: () =>
            deleteAccount().catch((e) => Alert.alert('Не удалось удалить', errorMessage(e))),
        },
      ],
    );

  const confirmDeleteProfile = () =>
    Alert.alert('Удалить профиль кожи?', 'Это отзыв согласия на обработку данных о коже. Полка останется.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteProfile.mutate(undefined, { onError: (e) => Alert.alert('Ошибка', errorMessage(e)) }),
      },
    ]);

  const enablePush = async () => {
    if (push === 'denied') {
      await Linking.openSettings();
      return;
    }
    setPush(await registerPush(true));
  };

  return (
    <Screen tab title="Профиль" refreshing={me.isRefetching} onRefresh={() => me.refetch()}>
      <Section title="Аккаунт">
        <ListRow title={data?.user.email ?? ''} icon="person.crop.circle" />
        <ListRow
          title="Тариф"
          icon="star"
          last
          right={
            data?.plan.isPro ? (
              <Badge
                tone="brand"
                label={data.plan.currentPeriodEnd ? `Pro до ${formatDate(data.plan.currentPeriodEnd)}` : 'Pro'}
              />
            ) : (
              <AppText variant="subhead" color="muted">
                Бесплатный
              </AppText>
            )
          }
        />
      </Section>

      <Section title="Профиль кожи">
        {profile ? (
          <>
            <ListRow
              title={`${skinLabel(profile.skinType)}${profile.sensitive ? ', чувствительная' : ''}`}
              subtitle={`Обновлён ${formatDate(profile.updatedAt)}`}
              icon="face.smiling"
              chevron
              onPress={() => router.push('/onboarding')}
            />
            <ListRow title="Удалить профиль кожи" icon="trash" destructive last onPress={confirmDeleteProfile} />
          </>
        ) : (
          <ListRow title="Заполнить профиль кожи" icon="plus.circle" chevron last onPress={() => router.push('/onboarding')} />
        )}
      </Section>

      <Section
        title="Уведомления"
        footer="Напоминания «Оценить результат» и «Пора докупить» приходят push-уведомлением.">
        <ListRow
          title={push === 'granted' ? 'Включены' : push === 'denied' ? 'Выключены в настройках iPhone' : 'Не включены'}
          icon={push === 'granted' ? 'bell.badge' : 'bell.slash'}
          iconColor={push === 'granted' ? c.success : c.muted}
          last
          right={
            push === 'granted' ? undefined : (
              <Button title={push === 'denied' ? 'Настройки' : 'Включить'} size="small" variant="secondary" onPress={enablePush} />
            )
          }
        />
      </Section>

      <AboutSection />

      <Section>
        <ListRow title="Выйти" icon="rectangle.portrait.and.arrow.right" chevron onPress={confirmSignOut} />
        <ListRow title="Удалить аккаунт" icon="person.crop.circle.badge.xmark" destructive last onPress={confirmDeleteAccount} />
      </Section>
    </Screen>
  );
}
