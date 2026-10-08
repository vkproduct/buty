import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { space, useColors } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Вход без пароля: email → 6-значный код из письма. */
export default function SignInScreen() {
  const c = useColors();
  const { requestCode, verifyCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError('Проверьте адрес почты');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestCode(value);
      setStep('code');
      setCooldown(60);
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifyCode(email.trim().toLowerCase(), value);
      // Экран входа закроется сам (защищённый маршрут для вошедших недоступен).
      // Новому пользователю сразу предлагаем анкету кожи — после смены навигации.
      if (!res.hasSkinProfile) setTimeout(() => router.push('/onboarding'), 400);
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'email' ? (
          <>
            <View style={{ gap: space.sm }}>
              <AppText variant="title2">Вход в Buty</AppText>
              <AppText variant="callout" color="muted">
                Пришлём код на почту — пароль не нужен. Если аккаунта ещё нет, создадим его. С тем же адресом вы
                увидите свою полку и на сайте buty.app.
              </AppText>
            </View>
            <TextField
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              error={error}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              placeholder="you@example.com"
            />
            <Button title="Получить код" loading={busy} onPress={sendCode} disabled={!email.trim()} />
          </>
        ) : (
          <>
            <View style={{ gap: space.sm }}>
              <AppText variant="title2">Введите код</AppText>
              <AppText variant="callout" color="muted">
                Отправили 6 цифр на {email.trim().toLowerCase()}. Письмо может попасть в «Спам».
              </AppText>
            </View>
            <TextField
              ref={codeRef}
              value={code}
              onChangeText={(t) => {
                const digits = t.replace(/\D/g, '').slice(0, 6);
                setCode(digits);
                setError(null);
                if (digits.length === 6) void submitCode(digits);
              }}
              error={error}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              style={styles.code}
              accessibilityLabel="Код из письма"
            />
            <Button title="Войти" loading={busy} onPress={() => submitCode()} disabled={code.length !== 6} />
            <Button
              title={cooldown > 0 ? `Отправить код ещё раз через ${cooldown} с` : 'Отправить код ещё раз'}
              variant="plain"
              disabled={cooldown > 0 || busy}
              onPress={sendCode}
            />
            <Button
              title="Изменить email"
              variant="plain"
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            />
          </>
        )}
        <AppText variant="caption" color="muted" center>
          Входя, вы соглашаетесь с обработкой email для входа и уведомлений.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg },
  code: { fontSize: 28, letterSpacing: 10, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
