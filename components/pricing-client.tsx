"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Разбор состава по тексту",
  "Базовый подбор ухода",
  "Полка: до 2 средств",
  "Напоминания о введении и покупке",
  "История реакций: последние 5",
];

const PRO_FEATURES = [
  "Полка без лимита средств",
  "Матрица совместимости активов",
  "Порядок нанесения утро/вечер",
  "Поиск дублей средств",
  "История реакций без лимита",
  "Экспорт полки в PDF",
];

interface Props {
  isLoggedIn: boolean;
  isPro: boolean;
  currentPeriodEnd: string | null;
}

/** Тарифы Free/Pro + mock-оплата (кнопка «Симулировать оплату»). */
export function PricingClient({ isLoggedIn, isPro, currentPeriodEnd }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mockPayment = searchParams.get("mockPayment");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(period: "month" | "year") {
    setPending(period);
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    setPending(null);
    if (!res.ok) {
      setError("Не удалось создать платёж. Попробуйте ещё раз.");
      return;
    }
    const data = (await res.json()) as { payment: { url: string } };
    router.push(data.payment.url);
  }

  async function simulate() {
    if (!mockPayment) return;
    setPending("simulate");
    setError(null);
    const res = await fetch("/api/payments/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: mockPayment, status: "succeeded" }),
    });
    setPending(null);
    if (!res.ok) {
      setError("Платёж не прошёл. Попробуйте ещё раз.");
      return;
    }
    router.push("/shelf");
    router.refresh();
  }

  const featureList = (features: string[], dim = false) => (
    <ul className="mt-6 space-y-2.5">
      {features.map((f) => (
        <li
          key={f}
          className={cn(
            "flex items-start gap-2 text-sm",
            dim ? "text-muted-foreground" : "",
          )}
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-lavender" /> {f}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <GlassCard className="flex flex-col p-8">
        <h2 className="font-display text-xl font-bold">Free</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Разбор составов — всегда бесплатно
        </p>
        <p className="font-display mt-6 text-4xl font-bold">0 ₽</p>
        {featureList(FREE_FEATURES, true)}
        <Button asChild variant="outline" className="mt-8">
          <Link href="/analyze">Разобрать состав</Link>
        </Button>
      </GlassCard>

      <GlassCard className="relative flex flex-col border-lavender/40 p-8 shadow-glass">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lavender px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white">
          Pro
        </span>
        <h2 className="font-display text-xl font-bold">Pro — месяц</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Вся «Моя полка» без ограничений
        </p>
        <p className="font-display mt-6 text-4xl font-bold">
          299 ₽<span className="text-base font-normal text-muted-foreground">/мес</span>
        </p>
        {featureList(PRO_FEATURES)}
        {isPro ? (
          <p className="mt-8 flex items-center gap-2 rounded-2xl bg-lavender/10 px-4 py-3 text-sm font-semibold text-lavender-700">
            <Sparkles className="h-4 w-4" /> Pro активен
            {currentPeriodEnd
              ? ` до ${new Date(currentPeriodEnd).toLocaleDateString("ru-RU")}`
              : ""}
          </p>
        ) : mockPayment ? (
          <Button
            className="mt-8"
            disabled={pending !== null}
            onClick={simulate}
          >
            Симулировать оплату (mock)
          </Button>
        ) : isLoggedIn ? (
          <Button
            className="mt-8"
            disabled={pending !== null}
            onClick={() => pay("month")}
          >
            Оплатить месяц
          </Button>
        ) : (
          <Button asChild className="mt-8">
            <Link href="/auth/signin">Войти и оформить</Link>
          </Button>
        )}
      </GlassCard>

      <GlassCard className="flex flex-col p-8">
        <h2 className="font-display text-xl font-bold">Pro — год</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          2 месяца в подарок
        </p>
        <p className="font-display mt-6 text-4xl font-bold">
          2 990 ₽<span className="text-base font-normal text-muted-foreground">/год</span>
        </p>
        {featureList(PRO_FEATURES)}
        {!isPro && isLoggedIn && !mockPayment ? (
          <Button
            variant="secondary"
            className="mt-8"
            disabled={pending !== null}
            onClick={() => pay("year")}
          >
            Оплатить год
          </Button>
        ) : (
          <p className="mt-8 text-xs text-muted-foreground">
            {isPro
              ? "Подписка уже активна — продление добавит год к текущему периоду."
              : "Оплата по кнопке в тарифе «Pro — месяц»; в mock-режиме далее — «Симулировать оплату»."}
          </p>
        )}
        {isPro && isLoggedIn && !mockPayment ? (
          <Button
            variant="secondary"
            className="mt-4"
            disabled={pending !== null}
            onClick={() => pay("year")}
          >
            Продлить на год
          </Button>
        ) : null}
      </GlassCard>

      {error ? (
        <p className="text-sm text-destructive md:col-span-3">{error}</p>
      ) : null}
    </div>
  );
}
