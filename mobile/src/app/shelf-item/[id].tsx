import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, View } from 'react-native';

import { CompositionInput } from '@/components/composition-input';
import { Screen } from '@/components/screen';
import { STATUS_HINT, STATUS_LABEL } from '@/components/shelf-parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/api';
import { formatDate, formatDateShort } from '@/lib/format';
import { registerPush } from '@/lib/push';
import {
  useAddReminder,
  useDeleteReminder,
  useDeleteShelfItem,
  useDictionaries,
  useShelf,
  useUpdateShelfItem,
} from '@/lib/queries';
import type { ReminderKind, ShelfStatus } from '@/lib/types';
import { space, useColors } from '@/theme';

const KINDS: ReminderKind[] = ['introduce', 'restock'];

export default function ShelfItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shelf = useShelf();
  const dict = useDictionaries().data;
  const c = useColors();
  const update = useUpdateShelfItem();
  const remove = useDeleteShelfItem();
  const addReminder = useAddReminder();
  const deleteReminder = useDeleteReminder();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [inci, setInci] = useState('');

  const item = shelf.data?.items.find((i) => i.id === id);

  if (shelf.isPending) return <Loading />;
  if (!item) {
    return <EmptyState icon="questionmark.square.dashed" title="Средство не найдено" text="Возможно, его уже убрали с полки." />;
  }

  const setStatus = (status: ShelfStatus) => {
    if (status === item.status) return;
    if (status === 'reacted') {
      // Реакцию записываем сразу — статус сменится автоматически
      router.push({ pathname: '/reaction', params: { itemId: item.id } });
      return;
    }
    update.mutate({ id: item.id, status }, { onError: (e) => Alert.alert('Не сохранилось', errorMessage(e)) });
  };

  const toggleReminder = async (kind: ReminderKind, on: boolean) => {
    const existing = item.reminders.find((r) => r.type === kind);
    try {
      if (!on && existing) {
        await deleteReminder.mutateAsync(existing.id);
        return;
      }
      if (on && !existing) {
        await addReminder.mutateAsync({ shelfItemId: item.id, type: kind });
        // Разрешение на уведомления спрашиваем в момент, когда оно понятно зачем
        const permission = await registerPush(true).catch(() => 'denied' as const);
        if (permission === 'denied') {
          Alert.alert(
            'Уведомления выключены',
            'Напоминание сохранено, но прийти не сможет. Включите уведомления для Buty в настройках.',
            [
              { text: 'Позже', style: 'cancel' },
              { text: 'Настройки', onPress: () => Linking.openSettings() },
            ],
          );
        }
      }
    } catch (e) {
      Alert.alert('Не сохранилось', errorMessage(e));
    }
  };

  const saveEdit = () => {
    if (!name.trim()) {
      Alert.alert('Укажите название');
      return;
    }
    update.mutate(
      { id: item.id, customName: name.trim(), customInci: inci.trim() || null },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => Alert.alert('Не сохранилось', errorMessage(e)),
      },
    );
  };

  const confirmDelete = () =>
    Alert.alert('Убрать с полки?', `«${item.title}» исчезнет с полки вместе с реакциями и напоминаниями.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Убрать',
        style: 'destructive',
        onPress: () =>
          remove.mutate(item.id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Не удалилось', errorMessage(e)),
          }),
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: item.title }} />
      <Screen>
        <View style={{ gap: space.xs }}>
          <AppText variant="subhead" color="muted" weight="600">
            {item.subtitle}
          </AppText>
          <AppText variant="title2" accessibilityRole="header">
            {item.title}
          </AppText>
          <AppText variant="footnote" color="muted">
            На полке с {formatDate(item.addedAt)}
          </AppText>
        </View>

        <Section title="Статус" footer={STATUS_HINT[item.status]}>
          <View style={{ padding: space.md }}>
            <Segmented
              options={(Object.keys(STATUS_LABEL) as ShelfStatus[]).map((s) => ({ id: s, label: STATUS_LABEL[s] }))}
              value={item.status}
              onChange={setStatus}
            />
          </View>
        </Section>

        <Section title="Напомнить мне">
          {KINDS.map((kind, i) => {
            const copy = dict?.reminders[kind];
            const existing = item.reminders.find((r) => r.type === kind);
            return (
              <ListRow
                key={kind}
                title={copy?.title ?? kind}
                subtitle={existing ? `Напомним ${formatDateShort(existing.nextRunAt)}` : copy?.why}
                last={i === KINDS.length - 1}
                right={
                  <Switch
                    value={Boolean(existing)}
                    onValueChange={(on) => void toggleReminder(kind, on)}
                    trackColor={{ true: c.brand }}
                    accessibilityLabel={copy?.title}
                  />
                }
              />
            );
          })}
        </Section>

        <Section
          title={`Состав${item.ingredientNames.length ? ` · ${item.ingredientNames.length}` : ''}`}
          footer={item.unrecognizedCount > 0 ? `Не распознали компонентов: ${item.unrecognizedCount}.` : undefined}>
          <View style={{ padding: space.lg, gap: space.md }}>
            {item.ingredientNames.length ? (
              <AppText variant="subhead" color="textSoft">
                {item.ingredientNames.join(', ')}
              </AppText>
            ) : (
              <AppText variant="subhead" color="amber">
                Состав не указан — без него совместимость не проверить.
              </AppText>
            )}
            {item.slug ? (
              <Button
                title="Полный разбор состава"
                variant="secondary"
                size="small"
                onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: item.slug! } })}
              />
            ) : null}
          </View>
        </Section>

        {item.kind === 'custom' ? (
          editing ? (
            <Card style={{ gap: space.md }}>
              <TextField label="Название" value={name} onChangeText={setName} />
              <CompositionInput label="Состав (INCI)" value={inci} onChange={setInci} />
              <Button title="Сохранить" loading={update.isPending} onPress={saveEdit} />
              <Button title="Отмена" variant="plain" onPress={() => setEditing(false)} />
            </Card>
          ) : (
            <Button
              title="Изменить название и состав"
              variant="secondary"
              icon="pencil"
              onPress={() => {
                setName(item.title);
                setInci(item.customInci ?? '');
                setEditing(true);
              }}
            />
          )
        ) : null}

        <Section title="Реакции на это средство">
          <View style={{ padding: space.lg, gap: space.md }}>
            {item.reactions.length === 0 ? (
              <AppText variant="subhead" color="muted">
                Реакций не было.
              </AppText>
            ) : (
              item.reactions.map((r) => (
                <View key={r.id} style={{ gap: 2 }}>
                  <View style={styles.row}>
                    <Badge tone="coral" label={dict?.reactions[r.type] ?? r.type} />
                    <AppText variant="footnote" color="muted">
                      {formatDate(r.occurredAt)}
                    </AppText>
                  </View>
                  {r.note ? <AppText variant="subhead">{r.note}</AppText> : null}
                  {r.suspects.length ? (
                    <AppText variant="footnote" color="muted">
                      Подозреваемые: {r.suspects.slice(0, 8).join(', ')}
                    </AppText>
                  ) : null}
                </View>
              ))
            )}
            <Button
              title="Записать реакцию"
              variant="secondary"
              size="small"
              icon="plus"
              onPress={() => router.push({ pathname: '/reaction', params: { itemId: item.id } })}
            />
          </View>
        </Section>

        <Button title="Убрать с полки" variant="destructive" icon="trash" loading={remove.isPending} onPress={confirmDelete} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
});
