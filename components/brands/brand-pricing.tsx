"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ANNUAL_MONTHS_PAID,
  BRAND_TARIFF_EVENT,
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

/** Карточки тарифов с переключателем «помесячно / за год». */
export function BrandPricing() {
  const [annual, setAnnual] = useState(false);
  const main = TARIFFS.filter((t) => t.id !== "network");
  const network = TARIFFS.find((t) => t.id === "network");

  return (
    <div>
      <div
        className="inline-flex rounded-full border border-ink-line bg-white p-1"
        role="group"
        aria-label="Период оплаты"
      >
        {[
          { value: false, label: "Помесячно" },
          { value: true, label: `За год — ${12 - ANNUAL_MONTHS_PAID} месяца в подарок` },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setAnnual(o.value)}
            aria-pressed={annual === o.value}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              annual === o.value ? "bg-foreground text-white" : "text-foreground hover:bg-ink-wash",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {main.map((t) => {
          const perMonth = annual ? annualMonthly(t.monthly) : t.monthly;
          return (
            <div
              key={t.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-6",
                t.highlight ? "border-brand shadow-glass-lg" : "border-ink-hair shadow-glass",
              )}
            >
              {t.highlight ? (
                <Badge variant="brand" className="absolute -top-3 left-6">
                  Популярный
                </Badge>
              ) : null}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">{t.products}</p>
              <div className="mt-5">
                {t.monthly === 0 ? (
                  <span className="text-[32px] font-semibold leading-none tracking-tight">0 ₽</span>
                ) : (
                  <>
                    <span className="text-[32px] font-semibold leading-none tracking-tight">
                      {formatRub(perMonth)}
                    </span>
                    <span className="ml-1 text-sm text-ink-muted">/ мес</span>
                  </>
                )}
              </div>
              <p className="mt-2 min-h-5 text-xs text-ink-muted">
                {t.monthly === 0
                  ? "Навсегда"
                  : annual
                    ? `${formatRub(t.monthly * ANNUAL_MONTHS_PAID)} за год`
                    : "Без минимального срока"}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{t.lead}</p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={t.highlight ? "default" : "outline"}
                className="mt-6 w-full"
              >
                <a href="#zayavka" onClick={() => selectBrandTariff(t.id)}>
                  {t.cta}
                </a>
              </Button>
            </div>
          );
        })}
      </div>

      {network ? (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-ink-hair bg-white p-6 shadow-glass md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {network.name}{" "}
              <span className="whitespace-nowrap text-ink-muted">
                от {formatRub(annual ? annualMonthly(network.monthly) : network.monthly)} / мес
              </span>
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{network.features.join(" · ")}</p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <a href="#zayavka" onClick={() => selectBrandTariff(network.id)}>
              {network.cta}
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
