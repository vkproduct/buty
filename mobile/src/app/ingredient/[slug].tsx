import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { EvidenceMeter, FlagBadges } from '@/components/evidence';
import { Screen } from '@/components/screen';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { ErrorState, Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { errorMessage } from '@/lib/api';
import { inciTitle } from '@/lib/format';
import { useDictionaries, useIngredient } from '@/lib/queries';
import { SEVERITY_TONE, space, useColors } from '@/theme';

function TextBlock({ title, text }: { title: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <Section title={title}>
      <View style={{ padding: space.lg }}>
        <AppText variant="callout" style={{ lineHeight: 23 }}>
          {text}
        </AppText>
      </View>
    </Section>
  );
}

export default function IngredientScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useIngredient(slug);
  const dict = useDictionaries().data;
  const c = useColors();
  const ing = query.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: ing?.displayName ?? '',
          headerRight: ing
            ? () => (
                <AppText
                  accessibilityRole="button"
                  color="brand"
                  onPress={() => Share.share({ message: `${ing.displayName} — разбор в Buty`, url: ing.webUrl })}>
                  Поделиться
                </AppText>
              )
            : undefined,
        }}
      />
      {query.isPending ? (
        <Loading />
      ) : query.error || !ing ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <Screen>
          <View style={{ gap: space.sm }}>
            <AppText variant="title" accessibilityRole="header">
              {ing.displayName}
            </AppText>
            <AppText variant="subhead" color="muted">
              {inciTitle(ing.inciName)}
            </AppText>
            <View style={styles.badges}>
              <Badge label={dict?.ingredientCategories[ing.category] ?? ing.category} />
              {ing.typicalConc ? <Badge tone="teal" label={`Работает в ${ing.typicalConc}`} /> : null}
            </View>
            <EvidenceMeter level={ing.evidenceLevel} />
            <FlagBadges item={ing} />
          </View>

          <Card>
            <AppText variant="footnote" color="muted" weight="600">
              ФУНКЦИЯ В СОСТАВЕ
            </AppText>
            <AppText variant="callout" style={{ marginTop: space.xs }}>
              {ing.function}
            </AppText>
          </Card>

          <TextBlock title="Что это" text={ing.description} />
          <TextBlock title="Как работает" text={ing.howItWorks} />
          <TextBlock title="С чем сочетать" text={ing.combinations} />
          <TextBlock title="Риски и кому не подходит" text={ing.risks ?? ing.safetyNotes} />

          {ing.conflicts.length > 0 ? (
            <Section title="С чем конфликтует">
              {ing.conflicts.map((cf, i) => (
                <View
                  key={cf.slug}
                  style={[styles.conflict, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
                  <Badge tone={SEVERITY_TONE[cf.severity] ?? 'neutral'} label={dict?.severity[cf.severity] ?? cf.severity} />
                  <AppText
                    variant="headline"
                    color="brand"
                    accessibilityRole="link"
                    onPress={() => router.push({ pathname: '/ingredient/[slug]', params: { slug: cf.slug } })}>
                    {cf.displayName}
                  </AppText>
                  <AppText variant="subhead" color="textSoft">
                    {cf.reason}
                  </AppText>
                </View>
              ))}
            </Section>
          ) : null}

          {ing.otherNames.length > 0 ? (
            <Section title="Как ещё пишут в составе">
              <View style={{ padding: space.lg }}>
                <AppText variant="subhead" color="textSoft">
                  {ing.otherNames.join(', ')}
                </AppText>
              </View>
            </Section>
          ) : null}

          {ing.products.length > 0 ? (
            <Section title="Средства с этим ингредиентом">
              {ing.products.map((p, i) => (
                <ListRow
                  key={p.slug}
                  title={p.name}
                  subtitle={p.brand}
                  chevron
                  last={i === ing.products.length - 1}
                  onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: p.slug } })}
                />
              ))}
            </Section>
          ) : null}
        </Screen>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  conflict: { padding: space.lg, gap: space.xs + 2 },
});
