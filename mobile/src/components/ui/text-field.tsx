import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, space, type, useColors } from '@/theme';
import { AppText } from './text';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, style, multiline, ...rest },
  ref,
) {
  const c = useColors();
  return (
    <View style={{ gap: space.xs + 2 }}>
      {label ? (
        <AppText variant="footnote" color="muted" weight="500">
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={c.faint}
        selectionColor={c.brand}
        multiline={multiline}
        {...rest}
        style={[
          type.body,
          styles.input,
          { backgroundColor: c.fill, color: c.text, borderColor: error ? c.coral : 'transparent' },
          multiline && styles.multiline,
          style,
        ]}
      />
      {error ? (
        <AppText variant="footnote" color="coral" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
    borderWidth: 1.5,
  },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
});
