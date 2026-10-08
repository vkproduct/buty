import { Alert, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/lib/api';
import { pluralRu } from '@/lib/format';
import { useDictionaries, useReportToken } from '@/lib/queries';
import type { AnalysisResult } from '@/lib/types';
import { SEVERITY_TONE, radius, space, toneColors, useColors } from '@/theme';
import { IngredientRow } from './ingredient-row';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Icon } from './ui/icon';
import { Section } from './ui/section';
import { AppText } from './ui/text';

function Stat({ value, label, tone }: { value: number; label: string; tone?: 'coral' | 'amber' | 'brand' }) {
  const c = useColors();
  const color = value > 0 && tone ? toneColors(c, tone).fg : c.text;
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title2" style={{ color }}>
        {value}
      </AppText>
      <AppText variant="caption" color="muted" numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

/** Результат разбора состава: сводка, конфликты, советы, ингредиенты, нераспознанное. */
export function AnalysisView({
  result,
  onAddToShelf,
}: {
  result: AnalysisResult;
  /** Показать кнопку «Добавить на полку» (для разбора своего текста) */
  onAddToShelf?: () => void;
}) {
  const c = useColors();
  const dict = useDictionaries().data;
  const report = useReportToken();
  const { summary } = result;
  const coverage = summary.total > 0 ? Math.round((summary.recognized / summary.total) * 100) : 0;

  const reportUnmatched = async () => {
    try {
      await Promise.all(result.unmatched.slice(0, 20).map((t) => report.mutateAsync(t)));
      Alert.alert('Спасибо!', 'Мы добавим эти ингредиенты в базу.');
    } catch (e) {
      Alert.alert('Не отправилось', errorMessage(e));
    }
  };

  return (
    <View style={{ gap: space.xl }}>
      <Card>
        <AppText variant="headline">
          Распознано {summary.recognized} из {summary.total}{' '}
          {pluralRu(summary.total, 'компонента', 'компонентов', 'компонентов')}
        </AppText>
        <View style={[styles.progress, { backgroundColor: c.hair }]}>
          <View style={[styles.progressFill, { width: `${coverage}%`, backgroundColor: c.success }]} />
        </View>
        <View style={styles.stats}>
          <Stat value={summary.actives} label="Активы" tone="brand" />
          <Stat value={summary.comedogenic} label="Комедогенные" tone="coral" />
          <Stat value={summary.fragranceAllergens} label="Аллергены-отдушки" tone="amber" />
          <Stat value={summary.alcohols} label="Спирты" tone="amber" />
        </View>
      </Card>

      {result.conflicts.length > 0 ? (
        <Section title="Конфликты в составе">
          {result.conflicts.map((cf, i) => (
            <View
              key={`${cf.a.slug}-${cf.b.slug}`}
              style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
              <Badge tone={SEVERITY_TONE[cf.severity] ?? 'neutral'} label={dict?.severity[cf.severity] ?? cf.severity} />
              <AppText variant="headline">
                {cf.a.displayName} + {cf.b.displayName}
              </AppText>
              <AppText variant="subhead" color="textSoft">
                {cf.reason}
              </AppText>
            </View>
          ))}
        </Section>
      ) : null}

      {result.advice.length > 0 ? (
        <Section title="Что важно знать">
          {result.advice.map((a, i) => (
            <View
              key={i}
              style={[styles.advice, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
              <Icon name="lightbulb" color={c.amber} size={18} />
              <AppText variant="subhead" style={{ flex: 1 }}>
                {a}
              </AppText>
            </View>
          ))}
        </Section>
      ) : null}

      {result.ingredients.length > 0 ? (
        <Section title={`Ингредиенты · ${result.ingredients.length}`} footer="Порядок — как в составе: от большей концентрации к меньшей.">
          {result.ingredients.map((ing, i) => (
            <IngredientRow key={ing.id} item={ing} last={i === result.ingredients.length - 1} />
          ))}
        </Section>
      ) : null}

      {result.unmatched.length > 0 ? (
        <Section title="Не нашли в базе" footer="Сообщите нам — проверим и добавим в базу.">
          <View style={[styles.item, { gap: space.md }]}>
            <View style={styles.tokens}>
              {result.unmatched.map((t) => (
                <View key={t} style={[styles.token, { backgroundColor: c.fill }]}>
                  <AppText variant="footnote" color="textSoft">
                    {t}
                  </AppText>
                </View>
              ))}
            </View>
            <Button
              title={report.isSuccess ? 'Отправлено' : 'Сообщить о нераспознанных'}
              variant="secondary"
              size="small"
              icon="paperplane"
              loading={report.isPending}
              disabled={report.isSuccess}
              onPress={reportUnmatched}
            />
          </View>
        </Section>
      ) : null}

      {onAddToShelf ? (
        <Button title="Добавить средство на полку" variant="plain" icon="plus.circle" onPress={onAddToShelf} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { height: 6, borderRadius: radius.pill, marginTop: space.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.lg, rowGap: space.md },
  stat: { width: '50%', gap: 2, paddingRight: space.sm },
  item: { padding: space.lg, gap: space.xs + 2 },
  advice: { flexDirection: 'row', gap: space.md, padding: space.lg, alignItems: 'flex-start' },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  token: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.sm },
});
