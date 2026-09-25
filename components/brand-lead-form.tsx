"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Форма заявки бренда → POST /api/brand-leads. */
export function BrandLeadForm() {
  const [brandName, setBrandName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/brand-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName, contact, email, message }),
    });
    setPending(false);
    if (!res.ok) {
      try {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Не удалось отправить заявку.");
      } catch {
        setError("Не удалось отправить заявку.");
      }
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="rounded-2xl bg-lavender/10 px-5 py-4 text-sm font-semibold text-lavender-700">
        Заявка отправлена! Мы свяжемся с вами по email в течение пары дней.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Название бренда"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          aria-label="Название бренда"
          required
        />
        <Input
          placeholder="Контактное лицо"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          aria-label="Контактное лицо"
          required
        />
      </div>
      <Input
        type="email"
        placeholder="Email для связи"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email"
        required
      />
      <textarea
        className="min-h-28 w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-lavender/40"
        placeholder="Что вам интересно: размещение, разбор составов, аналитика?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Сообщение"
        required
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        Отправить заявку
      </Button>
    </form>
  );
}
