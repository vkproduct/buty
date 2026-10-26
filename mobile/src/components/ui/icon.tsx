import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Platform, type ColorValue } from 'react-native';

/**
 * Иконки приложения: SF Symbols на iOS, Material Symbols на Android.
 * Новая иконка добавляется сюда парой «SF-имя → Material-имя» — иначе TypeScript
 * не даст её использовать. Каталоги: SF Symbols (приложение Apple) и https://fonts.google.com/icons.
 */
const ICONS = {
  'arrow.left.arrow.right': 'compare_arrows',
  'bag': 'shopping_bag',
  'bell': 'notifications',
  'bell.badge': 'notifications_active',
  'bell.slash': 'notifications_off',
  'camera': 'photo_camera',
  'checkmark': 'check',
  'checkmark.circle.fill': 'radio_button_checked',
  'checkmark.seal': 'verified',
  'checkmark.square.fill': 'check_box',
  'chevron.left': 'chevron_left',
  'chevron.right': 'chevron_right',
  'circle': 'radio_button_unchecked',
  'envelope': 'mail',
  'face.smiling': 'sentiment_satisfied',
  'hand.raised': 'front_hand',
  'heart.text.square': 'monitor_heart',
  'lightbulb': 'lightbulb',
  'magnifyingglass': 'search',
  'paperplane': 'send',
  'pencil': 'edit',
  'person.crop.circle': 'account_circle',
  'person.crop.circle.badge.xmark': 'person_remove',
  'person.text.rectangle': 'badge',
  'plus': 'add',
  'plus.circle': 'add_circle',
  'plus.circle.fill': 'add_circle',
  'questionmark.square.dashed': 'help_center',
  'rectangle.portrait.and.arrow.right': 'logout',
  'sparkle.magnifyingglass': 'manage_search',
  'square': 'check_box_outline_blank',
  'square.stack.3d.up': 'inventory_2',
  'star': 'star',
  'sun.max': 'light_mode',
  'trash': 'delete',
  'wifi.exclamationmark': 'wifi_off',
} as const satisfies Record<string, AndroidSymbol>;

export type IconName = keyof typeof ICONS & SFSymbol;

interface Props {
  name: IconName;
  size?: number;
  color: ColorValue;
  /** Толщина линии — только iOS (на Android используется обычное начертание Material Symbols). */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

export function Icon({ name, size = 20, color, weight = 'medium' }: Props) {
  return (
    <SymbolView
      name={{ ios: name, android: ICONS[name], web: ICONS[name] }}
      size={size}
      tintColor={color}
      weight={Platform.OS === 'ios' ? weight : undefined}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
