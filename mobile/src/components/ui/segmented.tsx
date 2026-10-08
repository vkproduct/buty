import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { radius, space, useColors } from '@/theme';
import { AppText } from './text';

interface Props<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  scrollable?: boolean;
}

/** Сегментированный переключатель в стиле iOS. */
export function Segmented<T extends string>({ options, value, onChange, scrollable }: Props<T>) {
  const c = useColors();
  const items = options.map((o) => {
    const active = o.id === value;
    return (
      <Pressable
        key={o.id}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => {
          if (!active) Haptics.selectionAsync().catch(() => undefined);
          onChange(o.id);
        }}
        style={[
          styles.item,
          scrollable && styles.scrollItem,
          active && [styles.active, { backgroundColor: c.card }],
        ]}>
        <AppText variant="footnote" weight={active ? '600' : '500'} color={active ? 'text' : 'muted'} numberOfLines={1}>
          {o.label}
        </AppText>
      </Pressable>
    );
  });
  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.track, { backgroundColor: c.fill }]}>
        {items}
      </ScrollView>
    );
  }
  return <View style={[styles.track, { backgroundColor: c.fill }]}>{items}</View>;
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 2, borderRadius: radius.sm + 1, gap: 2 },
  item: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm - 1, paddingHorizontal: space.sm },
  scrollItem: { flex: 0, paddingHorizontal: space.md },
  active: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});
