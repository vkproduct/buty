import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { api } from './api';

export type PhotoSource = 'camera' | 'library';

/** Длинная сторона снимка: мелкий шрифт состава читается, а файл весит ~0,5 МБ. */
const MAX_SIDE = 2200;

async function ensurePermission(source: PhotoSource): Promise<boolean> {
  const res =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (res.granted) return true;
  Alert.alert(
    source === 'camera' ? 'Нет доступа к камере' : 'Нет доступа к фото',
    'Разрешите доступ в настройках, чтобы распознать состав с упаковки.',
    [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Открыть настройки', onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

/** Снять или выбрать фото состава. null — пользователь передумал. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  if (!(await ensurePermission(source))) return null;
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

/** Отправить фото на сервер (Google Vision) и получить текст состава. */
export async function recognizeComposition(uri: string): Promise<string> {
  const form = new FormData();
  // В React Native файл передаётся объектом { uri, name, type }
  form.append('image', { uri, name: 'composition.jpg', type: 'image/jpeg' } as unknown as Blob);
  const res = await api<{ text: string }>('/api/ocr', { method: 'POST', form });
  return res.text;
}
