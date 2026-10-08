import { Text, type TextProps } from 'react-native';

import { type, useColors, type Colors, type TypeVariant } from '@/theme';

interface Props extends TextProps {
  variant?: TypeVariant;
  color?: keyof Colors;
  weight?: '400' | '500' | '600' | '700';
  center?: boolean;
}

/** Текст с типографикой iOS и цветом из палитры. */
export function AppText({ variant = 'body', color = 'text', weight, center, style, ...rest }: Props) {
  const c = useColors();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        type[variant],
        { color: c[color] },
        weight ? { fontWeight: weight } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
