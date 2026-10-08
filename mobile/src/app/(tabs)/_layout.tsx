import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useColors } from '@/theme';

export default function TabLayout() {
  const c = useColors();
  return (
    <NativeTabs tintColor={c.brand}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Разбор</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'text.viewfinder', selected: 'text.viewfinder' }} md="document_scanner" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="catalog">
        <NativeTabs.Trigger.Label>Каталог</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shelf">
        <NativeTabs.Trigger.Label>Полка</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Профиль</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
