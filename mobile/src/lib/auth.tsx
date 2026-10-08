import { useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, onUnauthorized } from './api';
import { clearToken, loadToken, saveToken } from './token-store';
import type { VerifyCodeResponse } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  /** Шаг 1: отправить код на почту */
  requestCode(email: string): Promise<void>;
  /** Шаг 2: проверить код и войти */
  verifyCode(email: string, code: string): Promise<VerifyCodeResponse>;
  signOut(options?: { pushToken?: string | null }): Promise<void>;
  /** Удаление аккаунта и всех данных (требование App Store) */
  deleteAccount(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    loadToken().then((token) => setStatus(token ? 'signedIn' : 'signedOut'));
  }, []);

  const resetLocal = useCallback(async () => {
    await clearToken();
    queryClient.removeQueries({ queryKey: ['me'] });
    queryClient.removeQueries({ queryKey: ['shelf'] });
    setStatus('signedOut');
  }, [queryClient]);

  // Токен отозван на сервере (вышли на другом устройстве, удалили аккаунт) — выходим
  useEffect(() => onUnauthorized(() => void resetLocal()), [resetLocal]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      async requestCode(email) {
        await api('/api/mobile/auth/request-code', { body: { email } });
      },
      async verifyCode(email, code) {
        const res = await api<VerifyCodeResponse>('/api/mobile/auth/verify-code', {
          body: { email, code, deviceName: Device.modelName ?? Device.deviceName ?? null },
        });
        await saveToken(res.token);
        await queryClient.invalidateQueries();
        setStatus('signedIn');
        return res;
      },
      async signOut(options) {
        await api('/api/mobile/auth/logout', {
          body: { pushToken: options?.pushToken ?? undefined },
        }).catch(() => undefined);
        await resetLocal();
      },
      async deleteAccount() {
        await api('/api/mobile/account', { method: 'DELETE' });
        await resetLocal();
      },
    }),
    [status, queryClient, resetLocal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
