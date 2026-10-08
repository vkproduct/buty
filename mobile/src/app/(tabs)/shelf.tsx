import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { PairCard, ShelfItemCard } from '@/components/shelf-parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState, Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateShort, pluralRu } from '@/lib/format';
import { useDictionaries, useShelf } from '@/lib/queries';
import type { ShelfView } from '@/lib/types';
import { space, useColors } from '@/theme';

type Tab = 'items' | 'compat' | 'routine' | 'reactions' | 'reminders';

function Items({ shelf }: { shelf: ShelfView }) {
  const conflicts = shelf.pairs.filter((p) => p.status === 'conflict').length;
  if (shelf.items.length === 0) {
    return (
      <EmptyState
        icon="square.stack.3d.up"
        title="Полка пустая"
        text="Добавьте средства, которыми пользуетесь, — проверим, сочетаются ли они."
        action={{ title: 'Добавить средство', onPress: () => router.push('/add-to-shelf') }}
      />
    );
  }
  return (
    <View style={{ gap: space.md }}>
      {shelf.pairs.length > 0 ? (
        <AppText variant="subhead" color={conflicts ? 'coral' : 'success'} weight="600">
          {conflicts
            ? `Найдено конфликтов: ${conflicts} — подробности во вкладке «Совместимость»`
            : 'Конфликтов между средствами не нашли'}
        </AppText>
      ) : null}
      {shelf.items.map((item) => (
        <ShelfItemCard key={item.id} item={item} />
      ))}
    </View>
  );
}

function Compat({ shelf }: { shelf: ShelfView }) {
  if (shelf.pairs.length === 0) {
    return (
      <EmptyState
        icon="arrow.left.arrow.right"
        title="Нужно хотя бы два средства"
        text="Совместимость проверяется для средств со статусом «Использую»."
      />
    );
  }
  const order = { conflict: 0, spread: 1, ok: 2 } as const;
  const pairs = [...shelf.pairs].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <View style={{ gap: space.md }}>
      {pairs.map((p) => (
        <PairCard key={`${p.productAId}-${p.productBId}`} pair={p} />
      ))}
      {shelf.plan.isPro && shelf.duplicates.length > 0 ? (
        <>
          <AppText variant="title3" style={{ marginTop: space.md }}>
            Дубли
          </AppText>
          {shelf.duplicates.map((d) => (
            <Card key={d.productIds.join('-')}>
              <AppText variant="headline">{d.titles.join(' и ')}</AppText>
              <AppText variant="subhead" color="textSoft" style={{ marginTop: space.xs }}>
                Общие активы: {d.sharedActives.map((a) => a.displayName).join(', ')}
                {d.incomplete ? ' (состав распознан не полностью)' : ''}
              </AppText>
            </Card>
          ))}
        </>
      ) : null}
    </View>
  );
}

function Routine({ shelf }: { shelf: ShelfView }) {
  const { morning, evening, notes } = shelf.routine;
  if (!morning.length && !evening.length) {
    return <EmptyState icon="sun.max" title="Режим появится, когда на полке будут средства" />;
  }
  const block = (title: string, steps: typeof morning) => (
    <Card>
      <AppText variant="title3">{title}</AppText>
      {steps.map((s) => (
        <View key={s.productId + s.order} style={styles.step}>
          <AppText variant="headline" color="brand" style={{ width: 22 }}>
            {s.order}
          </AppText>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="headline">{s.title}</AppText>
            <AppText variant="footnote" color="muted">
              {s.why}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
  return (
    <View style={{ gap: space.md }}>
      {morning.length ? block('Утро', morning) : null}
      {evening.length ? block('Вечер', evening) : null}
      {notes.map((n, i) => (
        <AppText key={i} variant="subhead" color="textSoft">
          {n}
        </AppText>
      ))}
    </View>
  );
}

function Reactions({ shelf }: { shelf: ShelfView }) {
  const dict = useDictionaries().data;
  return (
    <View style={{ gap: space.md }}>
      <Button
        title="Записать реакцию"
        variant="secondary"
        icon="plus"
        disabled={shelf.items.length === 0}
        onPress={() => router.push('/reaction')}
      />
      {shelf.reactions.length === 0 ? (
        <EmptyState icon="heart.text.square" title="Реакций нет" text="Если кожа отреагировала, запишите — найдём общие ингредиенты." />
      ) : (
        shelf.reactions.map((r) => (
          <Card key={r.id}>
            <View style={styles.row}>
              <Badge tone="coral" label={dict?.reactions[r.type] ?? r.type} />
              <AppText variant="footnote" color="muted">
                {formatDate(r.occurredAt)}
              </AppText>
            </View>
            <AppText variant="headline" style={{ marginTop: space.sm }}>
              {r.itemTitle}
            </AppText>
            {r.note ? (
              <AppText variant="subhead" color="textSoft">
                {r.note}
              </AppText>
            ) : null}
            {r.suspects.length ? (
              <AppText variant="footnote" color="muted" style={{ marginTop: space.xs }}>
                Подозреваемые: {r.suspects.slice(0, 10).join(', ')}
                {r.suspects.length > 10 ? '…' : ''}
              </AppText>
            ) : null}
          </Card>
        ))
      )}
      {shelf.reactionsLimited ? (
        <AppText variant="footnote" color="muted" center>
          Показаны последние {shelf.limits.freeReactions}{' '}
          {pluralRu(shelf.limits.freeReactions, 'реакция', 'реакции', 'реакций')}.
        </AppText>
      ) : null}
    </View>
  );
}

function Reminders({ shelf }: { shelf: ShelfView }) {
  const dict = useDictionaries().data;
  const pending = shelf.reminders.filter((r) => !r.doneAt);
  const done = shelf.reminders.filter((r) => r.doneAt);
  if (!shelf.reminders.length) {
    return (
      <EmptyState
        icon="bell"
        title="Напоминаний нет"
        text="Откройте средство на полке и включите «Оценить результат» или «Пора докупить» — пришлём уведомление."
      />
    );
  }
  return (
    <View style={{ gap: space.md }}>
      {pending.map((r) => (
        <Card key={r.id}>
          <View style={styles.row}>
            <Badge tone="teal" label={dict?.reminders[r.type]?.title ?? r.type} />
            <AppText variant="footnote" color="muted">
              {formatDateShort(r.nextRunAt)}
            </AppText>
          </View>
          <AppText variant="headline" style={{ marginTop: space.sm }}>
            {r.itemTitle}
          </AppText>
        </Card>
      ))}
      {done.length ? (
        <AppText variant="footnote" color="muted">
          Отработало: {done.length}
        </AppText>
      ) : null}
    </View>
  );
}

/** Вкладка «Полка». */
export default function ShelfScreen() {
  const { status } = useAuth();
  const shelf = useShelf();
  const c = useColors();
  const [tab, setTab] = useState<Tab>('items');

  if (status !== 'signedIn') {
    return (
      <Screen tab title="Моя полка">
        <EmptyState
          icon="square.stack.3d.up"
          title="Все ваши средства в одном месте"
          text="Проверка совместимости, дневник реакций и напоминания. Войдите по коду из письма — пароль не нужен."
          action={{ title: 'Войти', onPress: () => router.push('/sign-in') }}
        />
      </Screen>
    );
  }

  if (shelf.error instanceof ApiError && shelf.error.code === 'NEED_PROFILE') {
    return (
      <Screen tab title="Моя полка">
        <EmptyState
          icon="person.text.rectangle"
          title="Расскажите о своей коже"
          text="Пять коротких вопросов: тип кожи, задачи, особые периоды и реакции. Учтём их при проверке средств."
          action={{ title: 'Заполнить профиль', onPress: () => router.push('/onboarding') }}
        />
      </Screen>
    );
  }

  const data = shelf.data;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'items', label: 'Средства' },
    { id: 'compat', label: 'Совместимость' },
    ...(data?.plan.isPro ? [{ id: 'routine' as const, label: 'Режим' }] : []),
    { id: 'reactions', label: 'Реакции' },
    { id: 'reminders', label: 'Напоминания' },
  ];

  return (
    <Screen tab title="Моя полка" refreshing={shelf.isRefetching} onRefresh={() => shelf.refetch()}>
      {shelf.isPending ? (
        <Loading />
      ) : shelf.error || !data ? (
        <ErrorState message={errorMessage(shelf.error)} onRetry={() => shelf.refetch()} />
      ) : (
        <>
          <View style={styles.row}>
            {data.plan.isPro ? (
              <Badge
                tone="brand"
                label={data.plan.currentPeriodEnd ? `Pro до ${formatDateShort(data.plan.currentPeriodEnd)}` : 'Pro'}
              />
            ) : (
              <AppText variant="footnote" color="muted">
                {data.items.length} из {data.limits.freeShelf} средств на бесплатном тарифе
              </AppText>
            )}
            <Button title="Добавить" size="small" icon="plus" onPress={() => router.push('/add-to-shelf')} />
          </View>
          <Segmented scrollable options={tabs} value={tabs.some((t) => t.id === tab) ? tab : 'items'} onChange={setTab} />
          <View style={{ backgroundColor: c.grouped }}>
            {tab === 'items' && <Items shelf={data} />}
            {tab === 'compat' && <Compat shelf={data} />}
            {tab === 'routine' && data.plan.isPro && <Routine shelf={data} />}
            {tab === 'reactions' && <Reactions shelf={data} />}
            {tab === 'reminders' && <Reminders shelf={data} />}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  step: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
});
