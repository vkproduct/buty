import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatDateShort } from '@/lib/format';
import { useDictionaries } from '@/lib/queries';
import type { PairResult, ShelfItem, ShelfStatus } from '@/lib/types';
import { space, useColors, type Tone } from '@/theme';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Icon } from './ui/icon';
import { AppText } from './ui/text';

export const STATUS_LABEL: Record<ShelfStatus, string> = {
  using: 'Использую',
  finished: 'Закончилось',
  reacted: 'Была реакция',
};
export const STATUS_TONE: Record<ShelfStatus, Tone> = {
  using: 'success',
  finished: 'neutral',
  reacted: 'coral',
};
export const STATUS_HINT: Record<ShelfStatus, string> = {
  using: 'Участвует в проверке совместимости и в режиме ухода.',
  finished: 'Хранится в истории, в совместимости не участвует.',
  reacted: 'Отмечено реакцией — ингредиенты попадут в подозреваемые.',
};

export const PAIR_META: Record<PairResult['status'], { label: string; tone: Tone }> = {
  ok: { label: 'Совместимы', tone: 'success' },
  conflict: { label: 'Конфликт', tone: 'coral' },
  spread: { label: 'Нужен состав', tone: 'amber' },
};

export function ShelfItemCard({ item }: { item: ShelfItem }) {
  const c = useColors();
  const dict = useDictionaries().data;
  return (
    <Card
      onPress={() => router.push({ pathname: '/shelf-item/[id]', params: { id: item.id } })}
      accessibilityHint="Открыть средство">
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="footnote" color="muted" weight="600">
            {item.subtitle}
          </AppText>
          <AppText variant="headline" numberOfLines={2}>
            {item.title}
          </AppText>
        </View>
        <Icon name="chevron.right" color={c.faint} size={13} weight="semibold" />
      </View>
      <View style={styles.meta}>
        <Badge tone={STATUS_TONE[item.status]} label={STATUS_LABEL[item.status]} />
        {item.reminders.map((r) => (
          <Badge
            key={r.id}
            tone="teal"
            label={`${dict?.reminders[r.type]?.short ?? 'Напомнить'} · ${formatDateShort(r.nextRunAt)}`}
          />
        ))}
      </View>
      {item.ingredientNames.length > 0 ? (
        <AppText variant="footnote" color="muted" numberOfLines={2} style={{ marginTop: space.sm }}>
          {item.ingredientNames.slice(0, 8).join(', ')}
          {item.ingredientNames.length > 8 ? '…' : ''}
        </AppText>
      ) : (
        <AppText variant="footnote" color="amber" style={{ marginTop: space.sm }}>
          Состав не указан — добавьте его, чтобы проверить совместимость.
        </AppText>
      )}
    </Card>
  );
}

export function PairCard({ pair }: { pair: PairResult }) {
  const meta = PAIR_META[pair.status];
  return (
    <Card>
      <Badge tone={meta.tone} label={meta.label} />
      <AppText variant="headline" style={{ marginTop: space.sm }}>
        {pair.aTitle} + {pair.bTitle}
      </AppText>
      {pair.conflicts.map((cf, i) => (
        <AppText key={i} variant="subhead" color="textSoft" style={{ marginTop: space.xs }}>
          {cf.aName} + {cf.bName}: {cf.reason}
        </AppText>
      ))}
      {pair.note ? (
        <AppText variant="subhead" color="muted" style={{ marginTop: space.xs }}>
          {pair.note}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, marginTop: space.sm },
});
