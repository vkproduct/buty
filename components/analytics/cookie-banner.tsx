"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  CONSENT_OPEN_EVENT,
  readConsent,
  saveConsent,
  type Consent,
} from "@/lib/analytics/consent";

/** Баннер согласия на cookie: показывается, пока посетитель не сделал выбор. */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (value: Consent) => {
    saveConsent(value);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Согласие на использование cookie"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-ink-hair bg-white p-5 shadow-pop sm:inset-x-6 sm:bottom-6 sm:p-6 print:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <p className="text-sm leading-relaxed text-ink-soft">
          Мы используем cookie: необходимые — чтобы работал вход и «Моя полка»,
          аналитические (Яндекс Метрика) — чтобы понимать, как улучшить сервис.
          Нажимая «Принять», вы соглашаетесь на обработку данных Яндекс Метрикой.{" "}
          <Link href="/cookies" className="font-medium text-foreground underline">
            Подробнее
          </Link>
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:w-44">
          <Button onClick={() => choose("all")}>Принять</Button>
          <Button variant="secondary" onClick={() => choose("necessary")}>
            Только необходимые
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Ссылка в подвале: снова открыть баннер и изменить выбор. */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
      className="text-left hover:underline"
    >
      Настройки cookie
    </button>
  );
}
