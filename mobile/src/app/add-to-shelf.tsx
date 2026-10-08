import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { CompositionInput } from '@/components/composition-input';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { shelfAddErrorMessage } from '@/lib/api';
import { useAddToShelf, useDictionaries, useProductSearch } from '@/lib/queries';
import { useDebounced } from '@/lib/use-debounced';
import { space } from '@/theme';

type Mode = 'catalog' | 'custom';

/** Добавить на полку: найти средство в базе или внести своё (название + состав). */
export default function AddToShelfScreen() {
  const params = useLocalSearchParams<{ inci?: string }>();
  const dict = useDictionaries().data;
  const [mode, setMode] = useState<Mode>(params.inci ? 'custom' : 'catalog');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [inci, setInci] = useState(params.inci ?? '');
  const q = useDebounced(query.trim());
  const search = useProductSearch(q);
  const add = useAddToShelf();

  const done = (title: string) => {
    router.back();
    setTimeout(() => Alert.alert('На полке', `«${title}» добавлено.`), 300);
  };
  const fail = (e: unknown) => Alert.alert('Не добавилось', shelfAddErrorMessage(e, dict?.limits.freeShelf));

  return (
    <Screen>
      <Segmented
        options={[
          { id: 'catalog', label: 'Из базы Buty' },
          { id: 'custom', label: 'Своё средство' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'catalog' ? (
        <View style={{ gap: space.lg }}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Бренд или название"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {q.length < 2 ? (
            <AppText variant="footnote" color="muted">
              Введите хотя бы две буквы. Не нашли средство — добавьте его как «своё» с составом.
            </AppText>
          ) : search.isPending ? (
            <Loading />
          ) : (search.data?.products.length ?? 0) === 0 ? (
            <View style={{ gap: space.md }}>
              <AppText variant="subhead" color="muted">
                В базе такого нет.
              </AppText>
              <Button
                title="Добавить как своё средство"
                variant="secondary"
                onPress={() => {
                  setName(query.trim());
                  setMode('custom');
                }}
              />
            </View>
          ) : (
            <Section>
              {search.data!.products.map((p, i, all) => (
                <ListRow
                  key={p.id}
                  title={p.name}
                  subtitle={`${p.brand} · ${dict?.productCategories[p.category] ?? p.category}`}
                  icon="plus.circle.fill"
                  last={i === all.length - 1}
                  onPress={() => add.mutate({ productId: p.id }, { onSuccess: () => done(p.name), onError: fail })}
                />
              ))}
            </Section>
          )}
        </View>
      ) : (
        <View style={{ gap: space.lg }}>
          <TextField
            label="Название"
            value={name}
            onChangeText={setName}
            placeholder="Например, крем с ретинолом"
            maxLength={200}
          />
          <CompositionInput label="Состав (INCI), необязательно" value={inci} onChange={setInci} />
          <AppText variant="footnote" color="muted">
            С составом проверим совместимость с остальными средствами полки.
          </AppText>
          <Button
            title="Добавить на полку"
            loading={add.isPending}
            disabled={!name.trim()}
            onPress={() =>
              add.mutate(
                { customName: name.trim(), customInci: inci.trim() || undefined },
                { onSuccess: () => done(name.trim()), onError: fail },
              )
            }
          />
        </View>
      )}
    </Screen>
  );
}
