import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { radius, space, useColors } from '@/theme';
import { Icon } from './icon';
import { AppText } from './text';

type Variant = 'primary' | 'secondary' | 'plain' | 'destructive';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: SymbolViewProps['name'];
  loading?: boolean;
  disabled?: boolean;
  size?: 'large' | 'small';
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  size = 'large',
  style,
  accessibilityHint,
}: Props) {
  const c = useColors();
  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.brand, fg: c.onBrand },
    secondary: { bg: c.fill, fg: c.text },
    plain: { bg: 'transparent', fg: c.brand },
    destructive: { bg: c.coralSoft, fg: c.coral },
  };
  const p = palette[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={() => {
        if (variant === 'primary') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.large,
        { backgroundColor: p.bg, opacity: inactive ? 0.5 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} color={p.fg} size={size === 'small' ? 15 : 18} /> : null}
          <AppText variant={size === 'small' ? 'subhead' : 'headline'} weight="600" style={{ color: p.fg }}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  large: { minHeight: 50, paddingHorizontal: space.lg },
  small: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
