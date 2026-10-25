"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ANNUAL_MONTHS_PAID,
  BRAND_TARIFF_EVENT,
  FOUNDING_OFFER,
  TARIFFS,
  annualMonthly,
  formatRub,
  type TariffId,
} from "@/lib/brands/tariffs";
import { cn } from "@/lib/utils";

/** Сообщить форме заявки, какой тариф выбран (форма слушает событие окна). */
export function selectBrandTariff(id: TariffId) {
  window.dispatchEvent(new CustomEvent<TariffId>(BRAND_TARIFF_EVENT, { detail: id }));
}

/** Что нужно бренду → какой тариф рекомендуем. */
const NEEDS: { id: TariffId; label: string; tag: string }[] = [
  { id: "basic", label: "Ссылки на покупку", tag: "для ссылок" },
  { id: "vitrina", label: "Ссылки, фото и промокоды", tag: "для промо в карточке" },
  { id: "pro", label: "Промо по датам и аналитика", tag: "для линеек и аналитики" },
  { id: "network", label: "Несколько брендов", tag: "для сетей и дистрибьюторов" },
];

const FREE_LIST: { text: string; ok: boolean }[] = [
  { text: "Подтверждённый профиль бренда", ok: true },
  { text: "Исправление ошибок в составах", ok: true },
  { text: "Счётчик разборов ваших средств", ok: true },
  { text: "Без ссылок на покупку", ok: false },
  { text: "Без фото, промокодов и описания", ok: false },
];

/**
 * Блок цен в духе «слева выбор — справа две карточки»:
 * бесплатный бренд-аккаунт и тариф, рекомендованный под задачу бренда.
 */
export function BrandPricing() {
  const [need, setNeed] = useState<TariffId>("vitrina");
  const [annual, setAnnual] = useState(true);

  const rec = TARIFFS.find((t) => t.id === need)!;
  const needTag = NEEDS.find((n) => n.id === need)!.tag;
  const perMonth = annual ? annualMonthly(rec.monthly) : rec.monthly;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Левая колонка: заголовок и выбор */}
      <div className="lg:col-span-4">
        <h2 className="text-[28px] font-semibold leading-[1.15] sm:text-[34px]">
          Прозрачные цены без скрытых платежей
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Выберите, что вам нужно, — покажем подходящий тариф и точную цену.
        </p>

        <label className="mt-6 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Что вам нужно</span>
          <span className="relative mt-2 block">
            <select
              value={need}
              onChange={(e) => setNeed(e.target.value as TariffId)}
              className="h-14 w-full appearance-none rounded-xl border border-ink-line bg-white pl-4 pr-10 text-base font-semibold text-foreground shadow-glass focus-visible:border-foreground focus-visible:outline-none"
            >
              {NEEDS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
          </span>
        </label>

        <div className="mt-4 rounded-xl border border-ink-hair bg-white p-4 shadow-glass">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Способ оплаты</span>
            <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
              {12 - ANNUAL_MONTHS_PAID} месяца в подарок
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((v) => !v)}
            className="mt-3 flex items-center gap-3 text-[15px] font-medium"
          >
            <span
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
                annual ? "bg-brand" : "bg-ink-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  annual ? "translate-x-6" : "translate-x-1",
                )}
              />
            </span>
            Годовая подписка
          </button>
        </div>
      </div>

      {/* Правая колонка: две карточки */}
      <div className="grid gap-5 md:grid-cols-2 lg:col-span-8">
        <div className="flex flex-col rounded-2xl border border-ink-hair bg-white p-6 shadow-glass sm:p-7">
          <h3 className="text-lg font-semibold">Бренд-аккаунт</h3>
          <div className="mt-2">
            <span className="text-[36px] font-semibold leading-none tracking-tight">0 ₽</span>
            <span className="ml-1 text-sm text-ink-muted">/ навсегда</span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">Для знакомства: подтвердите бренд и следите за разборами.</p>
          <hr className="my-5 border-ink-hair" />
          <ul className="flex-1 space-y-3">
            {FREE_LIST.map((f) => (
              <li key={f.text} className={cn("flex gap-2.5 text-sm", !f.ok && "text-ink-faint")}>
                {f.ok ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                )}
                {f.text}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-6 w-full">
            <a href="#zayavka" onClick={() => selectBrandTariff("free")}>
              Начать бесплатно
            </a>
          </Button>
        </div>

        <div className="relative flex flex-col rounded-2xl border-2 border-brand bg-white p-6 shadow-glass-lg sm:p-7">
          <span className="absolute -top-3 left-1/2 max-w-[92%] -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-cta px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Рекомендуем {needTag}
          </span>
          <h3 className="text-lg font-semibold">{rec.name}</h3>
          <div className="mt-2">
            <span className="text-[36px] font-semibold leading-none tracking-tight text-brand">
              {rec.priceFrom ? "от " : ""}
              {formatRub(perMonth)}
            </span>
            <span className="ml-1 text-sm text-ink-muted">/ мес</span>
          </div>
          <p className="mt-2">
            <span className="rounded-md bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
              {annual
                ? `${rec.priceFrom ? "от " : ""}${formatRub(rec.monthly * ANNUAL_MONTHS_PAID)} за год`
                : "Помесячно, без минимального срока"}
            </span>
          </p>
          <p className="mt-2 text-sm text-ink-muted">{rec.products}</p>
          <hr className="my-5 border-ink-hair" />
          <ul className="flex-1 space-y-3">
            {[...rec.features].reverse().map((f, i) => (
              <li key={f} className={cn("flex gap-2.5 text-sm", i === 0 && "font-semibold")}>
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6 w-full">
            <a href="#zayavka" onClick={() => selectBrandTariff(rec.id)}>
              {rec.cta}
            </a>
          </Button>
        </div>

        <p className="text-sm text-ink-muted md:col-span-2">
          Первые {FOUNDING_OFFER.brands} брендов получают −{FOUNDING_OFFER.discountPercent}% на{" "}
          {FOUNDING_OFFER.months} месяцев к любому платному тарифу.
        </p>
      </div>
    </div>
  );
}
