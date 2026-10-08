import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { inciTitle } from '@/lib/format';
import { useDictionaries } from '@/lib/queries';
import type { EvidenceLevel, FlagKey } from '@/lib/types';
import { space, useColors } from '@/theme';
import { EvidenceMeter, FlagBadges } from './evidence';
import { Icon } from './ui/icon';
import { AppText } from './ui/text';

interface Item extends Record<FlagKey, boolean> {
  slug: string;
  displayName: string;
  inciName: string;
  category: string;
  evidenceLevel: EvidenceLevel;
}

/** Строка ингредиента: название, INCI, категория, доказательность, флаги → карточка. */
export function IngredientRow({ item, last }: { item: Item; last?: boolean }) {
  const c = useColors();
  const dict = useDictionaries().data;
  const category = dict?.ingredientCategories[item.category] ?? item.category;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Открыть карточку ингредиента"
      onPress={() => router.push({ pathname: '/ingredient/[slug]', params: { slug: item.slug } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.fill }]}>
      <View style={[styles.inner, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="headline">{item.displayName}</AppText>
          <AppText variant="footnote" color="muted" numberOfLines={1}>
            {inciTitle(item.inciName)} · {category}
          </AppText>
          <View style={styles.meta}>
            <EvidenceMeter level={item.evidenceLevel} />
          </View>
          <FlagBadges item={item} />
        </View>
        <Icon name="chevron.right" color={c.faint} size={13} weight="semibold" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingLeft: space.lg },
  inner: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, paddingRight: space.lg, gap: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
