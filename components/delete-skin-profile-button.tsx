"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Удаление профиля кожи (отзыв согласия) — с подтверждением в два нажатия, без системных диалогов. */
export function DeleteSkinProfileButton() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setPending(true);
    setError(false);
    const res = await fetch("/api/skin-profile", { method: "DELETE" }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      setError(true);
      return;
    }
    setArmed(false);
    router.refresh();
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="min-h-11 text-sm font-medium text-ink-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        Удалить данные о коже
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm" role="group" aria-label="Подтверждение удаления">
      <span>Удалить профиль кожи? Полка попросит заполнить его заново.</span>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="min-h-11 rounded-lg bg-coral-600 px-4 font-semibold text-white hover:bg-coral-700 disabled:opacity-50"
      >
        {pending ? "Удаляем…" : "Удалить"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="min-h-11 px-2 font-medium underline-offset-4 hover:underline"
      >
        Отмена
      </button>
      {error ? <span className="text-coral-700">Не получилось. Попробуйте ещё раз.</span> : null}
    </div>
  );
}
