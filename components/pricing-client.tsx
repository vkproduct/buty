"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Minus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PLAN_PRICES } from "@/lib/payments/provider";

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

  const featureList = (features: string[], off: string[] = []) => (
    <ul className="space-y-0">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-3 py-2 text-sm leading-normal text-ink-soft">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={2.5} /> {f}
        </li>
      ))}
      {off.map((f) => (
        <li key={f} className="flex items-start gap-3 py-2 text-sm leading-normal text-ink-faint line-through decoration-ink-line">
          <Minus className="mt-0.5 h-4 w-4 shrink-0 text-ink-line" /> {f}
        </li>
      ))}
    </ul>
  );

  const head = (kicker: string, name: string, format: string) => (
    <div className="px-6 pb-2 pt-7">
      <div className="mb-1 text-sm text-ink-muted">
        {kicker}
      </div>
      <h2 className="text-[22px] font-semibold">{name}</h2>
      <p className="mt-1 text-sm leading-normal text-ink-muted">{format}</p>
    </div>
  );

  const price = (num: string, per: string, note: string) => (
    <div className="mx-6 border-b border-ink-hair pb-5 pt-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[32px] font-semibold leading-none tracking-tight">{num}</span>
        <span className="text-base text-ink-muted">{per}</span>
      </div>
      <p className="mt-2 text-sm leading-normal text-ink-muted">{note}</p>
    </div>
  );

  const PRO_OFF_FOR_FREE = PRO_FEATURES.slice(1);

  return (
    <div className="mx-auto grid max-w-[1060px] items-stretch gap-6 md:grid-cols-3">
      {/* Free */}
      <GlassCard className="flex flex-col">
        {head("Тариф", "Free", "Разбор составов — всегда бесплатно")}
        {price("0 ₽", "", "Без оплаты и привязки карты")}
        <div className="flex-grow px-6 py-5">{featureList(FREE_FEATURES, PRO_OFF_FOR_FREE)}</div>
        <div className="px-6 pb-6">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/analyze">Разобрать состав</Link>
          </Button>
        </div>
      </GlassCard>

      {/* Pro — месяц */}
      <GlassCard className="relative flex flex-col">
        {head("Тариф", "Pro — месяц", "Вся «Моя полка» без ограничений")}
        {price(`${PLAN_PRICES.month.toLocaleString("ru-RU")} ₽`, "/мес", "Ежемесячная подписка")}
        <div className="flex-grow px-6 py-5">{featureList(PRO_FEATURES)}</div>
        <div className="px-6 pb-6">
          {isPro ? (
            <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm font-semibold text-brand">
              <Sparkles className="h-4 w-4" /> Pro активен
              {currentPeriodEnd
                ? ` до ${new Date(currentPeriodEnd).toLocaleDateString("ru-RU")}`
                : ""}
            </p>
          ) : mockPayment ? (
            <Button className="w-full" disabled={pending !== null} onClick={simulate}>
              Симулировать оплату (mock)
            </Button>
          ) : isLoggedIn ? (
            <Button className="w-full" disabled={pending !== null} onClick={() => pay("month")}>
              Оплатить месяц
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href="/auth/signin">Войти и оформить</Link>
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Pro — год */}
      <GlassCard className="relative flex flex-col border-2 border-foreground shadow-glass-lg">
        <span className="absolute -top-3.5 left-6 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold leading-none text-white">
          Выгоднее
        </span>
        {head("Тариф", "Pro — год", "2 месяца в подарок")}
        {price(
            `${PLAN_PRICES.year.toLocaleString("ru-RU")} ₽`,
            "/год",
            `≈ ${Math.floor(PLAN_PRICES.year / 12).toLocaleString("ru-RU")} ₽ в месяц`,
          )}
        <div className="flex-grow px-6 py-5">{featureList(PRO_FEATURES)}</div>
        <div className="px-6 pb-6">
          {!isPro && isLoggedIn && !mockPayment ? (
            <Button
              variant="secondary"
              className="w-full"
              disabled={pending !== null}
              onClick={() => pay("year")}
            >
              Оплатить год
            </Button>
          ) : (
            <p className="rounded-lg bg-ink-wash px-4 py-3 text-sm leading-normal text-ink-soft">
              {isPro
                ? "Подписка уже активна — продление добавит год к текущему периоду."
                : "Оплата по кнопке в тарифе «Pro — месяц»; в mock-режиме далее — «Симулировать оплату»."}
            </p>
          )}
          {isPro && isLoggedIn && !mockPayment ? (
            <Button
              variant="secondary"
              className="mt-3 w-full"
              disabled={pending !== null}
              onClick={() => pay("year")}
            >
              Продлить на год
            </Button>
          ) : null}
        </div>
      </GlassCard>

      {error ? (
        <p className="text-sm text-destructive md:col-span-3">{error}</p>
      ) : null}
    </div>
  );
}
