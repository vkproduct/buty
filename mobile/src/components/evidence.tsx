import { StyleSheet, View } from 'react-native';

import { useDictionaries } from '@/lib/queries';
import type { EvidenceLevel, FlagKey } from '@/lib/types';
import { EVIDENCE_TONE, space, toneColors, useColors } from '@/theme';
import { Badge } from './ui/badge';
import { AppText } from './ui/text';

const BARS: Record<EvidenceLevel, number> = { STRONG: 4, MODERATE: 3, LIMITED: 2, ANECDOTAL: 1 };
const SHORT: Record<EvidenceLevel, string> = {
  STRONG: 'Сильная',
  MODERATE: 'Умеренная',
  LIMITED: 'Ограниченная',
  ANECDOTAL: 'Без данных',
};

/** Индикатор доказательности: 4 столбика + подпись. */
export function EvidenceMeter({ level, showLabel = true }: { level: EvidenceLevel; showLabel?: boolean }) {
  const c = useColors();
  const dict = useDictionaries().data;
  const { fg } = toneColors(c, EVIDENCE_TONE[level] ?? 'neutral');
  const filled = BARS[level];
  const label = dict?.evidence.find((e) => e.id === level)?.short ?? SHORT[level];
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Доказательная база: ${label.toLowerCase()}`}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.bar, { height: 4 + i * 2.5, backgroundColor: i <= filled ? fg : c.hair }]}
          />
        ))}
      </View>
      {showLabel ? (
        <AppText variant="caption" weight="600" style={{ color: fg }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const FLAG_FALLBACK: Record<FlagKey, string> = {
  comedogenic: 'Комедогенно',
  feedsMalassezia: 'Кормит малассезию',
  fragranceAllergen: 'Аллерген-отдушка',
};

/** Бейджи безопасностных флагов ингредиента. */
export function FlagBadges({ item }: { item: Record<FlagKey, boolean> }) {
  const dict = useDictionaries().data;
  const keys = (Object.keys(FLAG_FALLBACK) as FlagKey[]).filter((k) => item[k]);
  if (!keys.length) return null;
  return (
    <View style={styles.flags}>
      {keys.map((k) => (
        <Badge key={k} tone={k === 'comedogenic' ? 'coral' : 'amber'} label={dict?.flags[k]?.label ?? FLAG_FALLBACK[k]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1.5 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
});
