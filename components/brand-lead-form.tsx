"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GOALS, trackGoal } from "@/lib/analytics/goals";
import { BRAND_TARIFF_EVENT, TARIFFS, tariffById, type TariffId } from "@/lib/brands/tariffs";

/**
 * Форма заявки бренда → POST /api/brand-leads.
 * Выбранный тариф и сайт бренда дописываются в начало сообщения,
 * поэтому API и схема BrandLead не меняются.
 */
export function BrandLeadForm() {
  const [brandName, setBrandName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const [tariff, setTariff] = useState<TariffId | "">("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Кнопка тарифа на странице сообщает, какой тариф выбран
  useEffect(() => {
    function onSelect(e: Event) {
      const id = (e as CustomEvent<TariffId>).detail;
      if (tariffById(id)) setTariff(id);
    }
    window.addEventListener(BRAND_TARIFF_EVENT, onSelect);
    return () => window.removeEventListener(BRAND_TARIFF_EVENT, onSelect);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const header = [
      `Тариф: ${tariffById(tariff)?.name ?? "пока не выбран"}`,
      site.trim() ? `Сайт: ${site.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const res = await fetch("/api/brand-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName,
        contact,
        email,
        message: `${header}\n\n${message.trim() || "—"}`,
      }),
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
    trackGoal(GOALS.brandLead, { tariff: tariff || "none" });
    setDone(true);
  }

  if (done) {
    return (
      <p className="rounded-2xl bg-brand/10 px-5 py-4 text-sm font-semibold text-brand-700">
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
          maxLength={200}
          required
        />
        <Input
          placeholder="Контактное лицо"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          aria-label="Контактное лицо"
          maxLength={200}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="email"
          placeholder="Email для связи"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          maxLength={200}
          required
        />
        <Input
          placeholder="Сайт бренда (необязательно)"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          aria-label="Сайт бренда"
          maxLength={200}
        />
      </div>
      <select
        className="flex h-14 w-full rounded-lg border border-input bg-white px-4 text-base text-foreground focus-visible:border-foreground focus-visible:shadow-[0_0_0_1px_#222] focus-visible:outline-none"
        value={tariff}
        onChange={(e) => setTariff(e.target.value as TariffId | "")}
        aria-label="Тариф"
      >
        <option value="">Тариф: пока не знаю</option>
        {TARIFFS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.products.toLowerCase()}
          </option>
        ))}
      </select>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        placeholder="Сколько у вас средств и что важнее: ссылки, промокоды, фото или аналитика?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Сообщение"
        maxLength={4500}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Отправляем…" : "Отправить заявку"}
      </Button>
      <p className="text-xs text-ink-muted">
        Нажимая кнопку, вы соглашаетесь с{" "}
        <a href="/privacy" className="underline underline-offset-2">
          политикой конфиденциальности
        </a>
        .
      </p>
    </form>
  );
}
