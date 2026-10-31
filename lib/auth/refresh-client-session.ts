/**
 * Обновить сессию next-auth в браузере после входа кодом.
 *
 * Почему не `update()` из useSession: в next-auth v4 `update()` ничего не делает,
 * пока сессии нет (`if (loading || !session) return`), а повторный запрос сессии
 * при возврате на вкладку тоже пропускается для гостя. Поэтому после входа кодом
 * шапка («Войти» → «Моя полка»), Mixpanel identify и остальные useSession() оставались
 * в состоянии гостя до перезагрузки страницы.
 *
 * SessionProvider перечитывает /api/auth/session по сообщению «nextauth.message»
 * (event: "session") из события storage. Браузер шлёт storage только в другие вкладки,
 * поэтому в текущую вкладку событие отправляем сами, а запись в localStorage обновляет
 * остальные открытые вкладки сайта.
 */
export const NEXTAUTH_MESSAGE_KEY = "nextauth.message";

export function refreshClientSession(): void {
  if (typeof window === "undefined") return;
  const message = JSON.stringify({
    event: "session",
    data: { trigger: "getSession" },
    timestamp: Math.floor(Date.now() / 1000),
  });
  try {
    window.localStorage.setItem(NEXTAUTH_MESSAGE_KEY, message);
  } catch {
    // приватный режим / запрет хранилища — другие вкладки обновятся при перезагрузке
  }
  window.dispatchEvent(
    new StorageEvent("storage", { key: NEXTAUTH_MESSAGE_KEY, newValue: message }),
  );
}
