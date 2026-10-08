import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, space, useColors } from '@/theme';
import { AppText } from './text';

/** Сгруппированная секция (заголовок + карточка-список + подпись), как в «Настройках». */
export function Section({
  title,
  footer,
  children,
  inset = true,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  inset?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.wrap}>
      {title ? (
        <AppText variant="footnote" color="muted" style={styles.title}>
          {title.toUpperCase()}
        </AppText>
      ) : null}
      <View style={[inset && styles.box, inset && { backgroundColor: c.card }]}>{children}</View>
      {footer ? (
        <AppText variant="footnote" color="muted" style={styles.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  title: { paddingHorizontal: space.lg, letterSpacing: 0.2 },
  box: { borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  footer: { paddingHorizontal: space.lg },
});
