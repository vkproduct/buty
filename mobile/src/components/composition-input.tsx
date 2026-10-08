import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/lib/api';
import { pickPhoto, recognizeComposition, type PhotoSource } from '@/lib/ocr';
import { space } from '@/theme';
import { Button } from './ui/button';
import { TextField } from './ui/text-field';

interface Props {
  value: string;
  onChange: (text: string) => void;
  label?: string;
  error?: string | null;
  /** Вызывается после успешного распознавания фото */
  onRecognized?: (text: string) => void;
}

/** Поле состава: вставить текст или снять фото упаковки (распознаёт сервер). */
export function CompositionInput({ value, onChange, label, error, onRecognized }: Props) {
  const [busy, setBusy] = useState(false);

  const run = async (source: PhotoSource) => {
    try {
      const uri = await pickPhoto(source);
      if (!uri) return;
      setBusy(true);
      const text = await recognizeComposition(uri);
      onChange(text);
      onRecognized?.(text);
    } catch (e) {
      Alert.alert('Не удалось распознать', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const choose = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Снять на камеру', 'Выбрать из фото', 'Отмена'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) void run('camera');
          if (i === 1) void run('library');
        },
      );
    } else {
      Alert.alert('Фото состава', undefined, [
        { text: 'Камера', onPress: () => void run('camera') },
        { text: 'Галерея', onPress: () => void run('library') },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={styles.wrap}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        error={error}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        placeholder="Aqua, Glycerin, Niacinamide, …"
        accessibilityLabel="Состав средства"
      />
      <Button
        title={busy ? 'Распознаём фото…' : 'Сфотографировать состав'}
        variant="secondary"
        icon="camera"
        loading={busy}
        onPress={choose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
});
