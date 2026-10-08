import type { SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { space, useColors } from '@/theme';
import { Button } from './button';
import { Icon } from './icon';
import { AppText } from './text';

export function Loading({ label }: { label?: string }) {
  const c = useColors();
  return (
    <View style={styles.center} accessibilityLabel={label ?? 'Загрузка'}>
      <ActivityIndicator color={c.muted} />
      {label ? (
        <AppText variant="footnote" color="muted">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View style={styles.center}>
      <Icon name="wifi.exclamationmark" color={c.faint} size={36} />
      <AppText variant="callout" color="muted" center>
        {message}
      </AppText>
      {onRetry ? <Button title="Повторить" variant="secondary" size="small" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  text?: string;
  action?: { title: string; onPress: () => void };
}) {
  const c = useColors();
  return (
    <View style={styles.center}>
      <Icon name={icon} color={c.faint} size={40} />
      <AppText variant="headline" center>
        {title}
      </AppText>
      {text ? (
        <AppText variant="subhead" color="muted" center>
          {text}
        </AppText>
      ) : null}
      {action ? <Button title={action.title} onPress={action.onPress} style={{ marginTop: space.sm, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md, flexGrow: 1 },
});
