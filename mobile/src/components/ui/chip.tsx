import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { radius, space, useColors } from '@/theme';
import { AppText } from './text';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
}

/** Выбираемая «таблетка» для фильтров и вариантов анкеты. */
export function Chip({ label, selected, onPress, count }: Props) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.text : c.fill,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <AppText variant="subhead" weight="500" style={{ color: selected ? c.background : c.text }}>
        {label}
        {count !== undefined ? <AppText variant="subhead" color={selected ? 'faint' : 'muted'}>{`  ${count}`}</AppText> : null}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: space.md + 2,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
