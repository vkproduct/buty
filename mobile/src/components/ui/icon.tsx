import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

interface Props {
  name: SymbolViewProps['name'];
  size?: number;
  color: ColorValue;
  weight?: SymbolViewProps['weight'];
}

/** SF Symbol (iOS). */
export function Icon({ name, size = 20, color, weight = 'medium' }: Props) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
