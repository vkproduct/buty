"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

/**
 * Удаление аккаунта на сайте: подтверждение вводом слова «УДАЛИТЬ»,
 * затем DELETE /api/account → выход → на главную. Без системных диалогов.
 * Обещано в /privacy (152-ФЗ, требование Google Play/App Store).
 */
export function DeleteAccountButton() {
  const [armed, setArmed] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setPending(true);
    setError(false);
    const res = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setPending(false);
      setError(true);
      return;
    }
    // Аккаунт удалён: выход (сессия уже не существует) и на главную
    await signOut({ callbackUrl: "/" });
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="min-h-11 text-sm font-medium text-ink-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        Удалить аккаунт
      </button>
    );
  }

  return (
    <div className="space-y-3 text-sm" role="group" aria-label="Подтверждение удаления аккаунта">
      <p className="max-w-xl text-ink-soft">
        Удалятся аккаунт и все данные: полка, анкета кожи, реакции, напоминания и история.
        Восстановить будет нельзя. Чтобы подтвердить, введите слово «УДАЛИТЬ».
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="УДАЛИТЬ"
        aria-label="Введите УДАЛИТЬ для подтверждения"
        autoComplete="off"
        className="h-11 w-48 rounded-lg border border-input bg-white px-4 text-base uppercase tracking-wide focus-visible:border-foreground focus-visible:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={pending || confirmText.trim() !== "УДАЛИТЬ"}
          className="min-h-11 rounded-lg bg-coral-600 px-4 font-semibold text-white hover:bg-coral-700 disabled:opacity-50"
        >
          {pending ? "Удаляем…" : "Удалить навсегда"}
        </button>
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setConfirmText("");
          }}
          className="min-h-11 px-2 font-medium underline-offset-4 hover:underline"
        >
          Отмена
        </button>
        {error ? <span className="text-coral-700">Не получилось. Попробуйте ещё раз.</span> : null}
      </div>
    </div>
  );
}
