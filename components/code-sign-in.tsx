"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GOALS, trackGoal } from "@/lib/analytics/goals";
import { refreshClientSession } from "@/lib/auth/refresh-client-session";

export interface CodeSignInSuccess {
  isNewUser: boolean;
  hasSkinProfile: boolean;
}

interface CodeSignInProps {
  /** Откуда вход — уходит в Mixpanel как sign_up_source при регистрации. */
  source: "analyze_gate" | "signin_page" | "header";
  onSuccess: (result: CodeSignInSuccess) => void;
  /** Текст кнопки на первом шаге. */
  cta?: string;
}

const RESEND_COOLDOWN_SEC = 60;

/**
 * Вход по коду из письма, без ухода со страницы: email → код (6 цифр, автоотправка
 * при вводе). После успеха обновляет сессию next-auth во всех вкладках и зовёт onSuccess.
 */
export function CodeSignIn({ source, onSuccess, cta = "Получить код" }: CodeSignInProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  async function requestCode(targetEmail: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/code/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось отправить письмо. Попробуйте ещё раз.");
      }
      trackGoal(GOALS.signupSubmit);
      setStep("code");
      setResendIn(RESEND_COOLDOWN_SEC);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить письмо");
    } finally {
      setPending(false);
    }
  }

  async function verify(targetCode: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/code/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: targetCode, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось войти. Попробуйте ещё раз.");
      }
      trackGoal(GOALS.signupComplete);
      // Шапка («Моя полка» вместо «Войти»), Mixpanel identify и все useSession() на странице
      refreshClientSession();
      onSuccess({ isNewUser: Boolean(data?.isNewUser), hasSkinProfile: Boolean(data?.hasSkinProfile) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти");
      setCode("");
    } finally {
      setPending(false);
    }
  }

  if (step === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void requestCode(email.trim());
        }}
        className="space-y-4"
      >
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        {error ? <p className="text-sm text-coral-700">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Отправляем…" : cta}
        </Button>
        <p className="text-xs text-muted-foreground">
          Нажимая «{cta}», вы соглашаетесь с{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            политикой конфиденциальности
          </Link>
          .
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        ref={codeInputRef}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="Код из письма"
        value={code}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
          setCode(value);
          if (value.length === 6) void verify(value);
        }}
        aria-label="Код из письма"
      />
      <p className="text-xs text-muted-foreground">
        Код отправили на {email} ·{" "}
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Изменить email
        </button>
      </p>
      {error ? <p className="text-sm text-coral-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={resendIn > 0 || pending}
          onClick={() => {
            setCode("");
            void requestCode(email);
          }}
        >
          {resendIn > 0 ? `Отправить ещё раз (${resendIn})` : "Отправить ещё раз"}
        </Button>
      </div>
    </div>
  );
}
