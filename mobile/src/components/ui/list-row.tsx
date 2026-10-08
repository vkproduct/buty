import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { space, useColors } from '@/theme';
import { Icon } from './icon';
import { AppText } from './text';

interface Props {
  title: string;
  subtitle?: string | null;
  icon?: SymbolViewProps['name'];
  iconColor?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  last?: boolean;
}

/** Строка списка в стиле iOS «Настроек». */
export function ListRow({ title, subtitle, icon, iconColor, right, onPress, chevron, destructive, last }: Props) {
  const c = useColors();
  const content = (
    <View style={styles.row}>
      {icon ? <Icon name={icon} color={iconColor ?? (destructive ? c.coral : c.brand)} size={20} /> : null}
      <View style={[styles.body, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" style={destructive ? { color: c.coral } : undefined}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="footnote" color="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
        {chevron ? <Icon name="chevron.right" color={c.faint} size={13} weight="semibold" /> : null}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: c.fill }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, gap: space.md },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingRight: space.lg,
    minHeight: 48,
  },
});
