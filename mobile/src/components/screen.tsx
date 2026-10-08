import { forwardRef, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

import { space, useColors } from '@/theme';
import { AppText } from './ui/text';

interface Props extends ScrollViewProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /**
   * Экран вкладки: свой крупный заголовок вместо навигационной шапки.
   * Отступ под статус-бар и таб-бар добавляет iOS (contentInsetAdjustmentBehavior).
   */
  tab?: boolean;
}

/** Прокручиваемый экран с крупным заголовком в стиле iOS. */
export const Screen = forwardRef<ScrollView, Props>(function Screen(
  { title, subtitle, children, refreshing, onRefresh, tab, contentContainerStyle, ...rest },
  ref,
) {
  const c = useColors();
  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1, backgroundColor: c.grouped }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
      contentContainerStyle={[
        styles.content,
        tab && { paddingTop: space.sm },
        contentContainerStyle,
      ]}
      {...rest}>
      {title ? (
        <View style={styles.header}>
          <AppText variant="largeTitle" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="subhead" color="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.xl },
  header: { gap: space.xs },
});
