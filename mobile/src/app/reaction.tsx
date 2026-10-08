import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useAddReaction, useDictionaries, useShelf } from '@/lib/queries';
import { radius, space, useColors } from '@/theme';

const FALLBACK_TYPES: Record<string, string> = {
  redness: 'Покраснение',
  itching: 'Зуд',
  burning: 'Жжение',
  breakouts: 'Высыпания',
  dryness: 'Сухость/шелушение',
  other: 'Другое',
};
const MAX_DAYS_AGO = 90;

/** Запись реакции кожи на средство полки. */
export default function ReactionScreen() {
  const params = useLocalSearchParams<{ itemId?: string }>();
  const c = useColors();
  const dict = useDictionaries().data;
  const shelf = useShelf();
  const add = useAddReaction();
  const [itemId, setItemId] = useState<string | undefined>(params.itemId);
  const [type, setType] = useState<string | null>(null);
  const [daysAgo, setDaysAgo] = useState(0);
  const [note, setNote] = useState('');

  const types = dict?.reactions ?? FALLBACK_TYPES;
  const items = shelf.data?.items ?? [];
  const item = items.find((i) => i.id === itemId);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);

  const save = () => {
    if (!itemId || !type) return;
    add.mutate(
      { shelfItemId: itemId, type, note: note.trim() || undefined, occurredAt: date.toISOString() },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Не сохранилось', errorMessage(e)),
      },
    );
  };

  return (
    <Screen>
      {!params.itemId ? (
        <Section title="На какое средство">
          {items.map((i, idx) => (
            <ListRow
              key={i.id}
              title={i.title}
              subtitle={i.subtitle}
              last={idx === items.length - 1}
              onPress={() => setItemId(i.id)}
              right={itemId === i.id ? <Icon name="checkmark" color={c.brand} size={17} weight="semibold" /> : undefined}
            />
          ))}
        </Section>
      ) : item ? (
        <AppText variant="title3">{item.title}</AppText>
      ) : null}

      <View style={{ gap: space.sm }}>
        <AppText variant="footnote" color="muted" weight="600">
          ЧТО СЛУЧИЛОСЬ
        </AppText>
        <View style={styles.wrap}>
          {Object.entries(types).map(([id, label]) => (
            <Chip key={id} label={label} selected={type === id} onPress={() => setType(id)} />
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="footnote" color="muted" weight="600">
          КОГДА
        </AppText>
        <View style={[styles.date, { backgroundColor: c.card }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="На день раньше"
            disabled={daysAgo >= MAX_DAYS_AGO}
            onPress={() => setDaysAgo((d) => Math.min(MAX_DAYS_AGO, d + 1))}
            style={styles.step}>
            <Icon name="chevron.left" color={c.brand} size={18} />
          </Pressable>
          <AppText variant="headline" accessibilityLiveRegion="polite">
            {daysAgo === 0 ? 'Сегодня' : daysAgo === 1 ? 'Вчера' : formatDate(date.toISOString())}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="На день позже"
            disabled={daysAgo === 0}
            onPress={() => setDaysAgo((d) => Math.max(0, d - 1))}
            style={[styles.step, daysAgo === 0 && { opacity: 0.3 }]}>
            <Icon name="chevron.right" color={c.brand} size={18} />
          </Pressable>
        </View>
      </View>

      <TextField
        label="Комментарий, необязательно"
        value={note}
        onChangeText={setNote}
        placeholder="Где появилось, как долго держалось"
        multiline
        maxLength={1000}
        style={{ minHeight: 90 }}
      />

      <AppText variant="footnote" color="muted">
        Статус средства станет «Была реакция», а его ингредиенты попадут в подозреваемые — так проще найти общий
        раздражитель.
      </AppText>

      <Button title="Сохранить реакцию" loading={add.isPending} disabled={!itemId || !type} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  date: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    minHeight: 52,
  },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
