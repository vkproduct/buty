import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { AnalysisView } from '@/components/analysis-view';
import { Screen } from '@/components/screen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { errorMessage, shelfAddErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAddToShelf, useDictionaries, useProduct } from '@/lib/queries';
import { space } from '@/theme';

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useProduct(slug);
  const dict = useDictionaries().data;
  const { status } = useAuth();
  const add = useAddToShelf();
  const p = query.data;

  const addToShelf = () => {
    if (!p) return;
    if (status !== 'signedIn') {
      router.push('/sign-in');
      return;
    }
    add.mutate(
      { productId: p.id },
      {
        onSuccess: () =>
          Alert.alert('На полке', `«${p.name}» добавлено. Совместимость со средствами полки — во вкладке «Полка».`),
        onError: (e) => Alert.alert('Не добавилось', shelfAddErrorMessage(e, dict?.limits.freeShelf)),
      },
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: p?.brand ?? '',
          headerRight: p
            ? () => (
                <AppText
                  accessibilityRole="button"
                  color="brand"
                  onPress={() => Share.share({ message: `Состав ${p.brand} ${p.name} — разбор в Buty`, url: p.webUrl })}>
                  Поделиться
                </AppText>
              )
            : undefined,
        }}
      />
      {query.isPending ? (
        <Loading />
      ) : query.error || !p ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <Screen>
          <View style={{ gap: space.sm }}>
            <AppText variant="subhead" color="muted" weight="600">
              {p.brand}
            </AppText>
            <AppText variant="title" accessibilityRole="header">
              {p.name}
            </AppText>
            <View style={styles.badges}>
              <Badge label={dict?.productCategories[p.category] ?? p.category} />
              {p.coverage < 0.8 ? <Badge tone="amber" label="Состав распознан частично" /> : null}
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <Button
              title={add.isSuccess ? 'На полке' : 'Добавить на полку'}
              icon={add.isSuccess ? 'checkmark' : 'plus'}
              loading={add.isPending}
              disabled={add.isSuccess}
              onPress={addToShelf}
            />
            <Button
              title="Где купить"
              variant="secondary"
              icon="bag"
              onPress={() => WebBrowser.openBrowserAsync(p.buyUrl)}
            />
          </View>

          <AnalysisView result={p.analysis} />

          {p.rawIngredients ? (
            <View style={{ gap: space.xs }}>
              <AppText variant="footnote" color="muted" weight="600">
                СОСТАВ С УПАКОВКИ
              </AppText>
              <AppText variant="footnote" color="textSoft" selectable>
                {p.rawIngredients}
              </AppText>
            </View>
          ) : null}
        </Screen>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
});
