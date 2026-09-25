"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Форма входа по email magic-link. */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("email", {
      email,
      callbackUrl: "/shelf",
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("Не удалось отправить ссылку. Проверьте email и попробуйте ещё раз.");
      return;
    }
    window.location.href = "/auth/verify";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Отправляем…" : "Получить ссылку для входа"}
      </Button>
    </form>
  );
}
