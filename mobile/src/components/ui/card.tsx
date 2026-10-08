import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { radius, space, useColors } from '@/theme';

interface Props extends ViewProps {
  padded?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

/** Карточка: белая на сером фоне (светлая тема), тёмно-серая в тёмной. */
export function Card({ padded = true, onPress, style, children, ...rest }: Props) {
  const c = useColors();
  const base = [styles.card, { backgroundColor: c.card }, padded && styles.padded, style];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.7 }]}
        {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  padded: { padding: space.lg },
});
