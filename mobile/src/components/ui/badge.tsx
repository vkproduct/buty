import { StyleSheet, View } from 'react-native';

import { radius, toneColors, useColors, type Tone } from '@/theme';
import { AppText } from './text';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const c = useColors();
  const { fg, bg } = toneColors(c, tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="caption" weight="600" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
