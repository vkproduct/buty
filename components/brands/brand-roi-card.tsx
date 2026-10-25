"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

import { TARIFFS, formatRub, type TariffId } from "@/lib/brands/tariffs";
import { cn, pluralRu } from "@/lib/utils";

const PAID: TariffId[] = ["basic", "vitrina", "pro"];

/**
 * «Математика окупаемости»: сколько заказов в месяц покрывают тариф
 * при среднем чеке бренда. Только арифметика, без обещаний конверсии.
 */
export function BrandRoiCard() {
  const [tariffId, setTariffId] = useState<TariffId>("vitrina");
  const [check, setCheck] = useState(1500);

  const tariff = TARIFFS.find((t) => t.id === tariffId)!;
  const safeCheck = Number.isFinite(check) && check >= 100 ? check : 100;
  const orders = Math.ceil(tariff.monthly / safeCheck);
  const perDay = orders / 30;

  return (
    <div className="flex h-full flex-col rounded-3xl bg-gradient-cta p-6 text-white shadow-glass-lg sm:p-7">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        <Calculator className="h-5 w-5" aria-hidden /> Математика окупаемости
      </h3>

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-full bg-white/15 p-1" role="group" aria-label="Тариф">
        {PAID.map((id) => {
          const t = TARIFFS.find((x) => x.id === id)!;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTariffId(id)}
              aria-pressed={tariffId === id}
              className={cn(
                "rounded-full px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
                tariffId === id ? "bg-white text-brand-700" : "text-white hover:bg-white/10",
              )}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block rounded-2xl border border-white/25 bg-white/10 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
          Ваш средний чек
        </span>
        <span className="mt-1 flex items-baseline gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={100}
            step={100}
            value={Number.isFinite(check) ? check : ""}
            onChange={(e) => setCheck(e.target.valueAsNumber)}
            style={{ width: `${Math.max(String(Number.isFinite(check) ? check : "").length, 2) + 0.2}ch` }}
            className="min-w-0 max-w-full bg-transparent tabular-nums text-[32px] font-semibold leading-none tracking-tight text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Средний чек, рублей"
          />
          <span className="text-2xl font-semibold">₽</span>
        </span>
      </label>

      <div className="my-3 text-center text-sm font-bold uppercase tracking-widest text-white/70">vs</div>

      <div className="rounded-2xl border border-white/25 bg-white/10 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
          Тариф «{tariff.name}» в месяц
        </span>
        <div className="mt-1 text-[32px] font-semibold leading-none tracking-tight">
          {formatRub(tariff.monthly)}
        </div>
        <p className="mt-1.5 text-xs text-white/80">Фиксированно, без комиссии с продаж</p>
      </div>

      <div className="mt-auto pt-5">
        <p className="text-base font-semibold">Итог:</p>
        <p className="mt-1 text-lg leading-snug">
          Тариф окупается выручкой с <span className="font-bold underline underline-offset-4">{orders}{" "}
          {pluralRu(orders, "заказа", "заказов", "заказов")}</span> в месяц —{" "}
          {perDay < 1 ? "меньше одного заказа в день" : `около ${Math.round(perDay)} в день`}.
        </p>
      </div>
    </div>
  );
}
