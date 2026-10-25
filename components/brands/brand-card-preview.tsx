"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, EyeOff, FlaskRound, TicketPercent } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Фоны «фото бренда» в примере: настоящих фото нет, чтобы не изображать реальный бренд. */
const PHOTOS = [
  { label: "Флакон", cls: "bg-brand-50", icon: "text-brand" },
  { label: "Текстура", cls: "bg-teal-50", icon: "text-teal-600" },
  { label: "Применение", cls: "bg-amber-50", icon: "text-amber-600" },
];

const ANALYSIS = [
  { name: "Ниацинамид", note: "сильная доказательность", dot: "bg-success" },
  { name: "Цинк PCA", note: "умеренная доказательность", dot: "bg-teal" },
  { name: "Пантенол", note: "сильная доказательность", dot: "bg-success" },
];

const DEMO_CODE = "BUTY15";

/**
 * Пример карточки средства с платными возможностями бренда:
 * фото, ссылки на покупку, скрытый промокод и блок «От бренда».
 * Всё на клиенте и только для демонстрации — настоящий код здесь не хранится.
 */
export function BrandCardPreview() {
  const [photo, setPhoto] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(DEMO_CODE);
    } catch {
      // буфер обмена может быть недоступен (http, старый браузер) — просто показываем код
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const current = PHOTOS[photo];

  return (
    <div className="rounded-3xl border border-ink-hair bg-white p-5 shadow-pop sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-ink-muted">Пример карточки средства</span>
        <Badge variant="outline">Демо</Badge>
      </div>

      {/* Фото бренда */}
      <div
        className={cn(
          "relative flex aspect-[16/10] items-center justify-center rounded-2xl transition-colors",
          current.cls,
        )}
      >
        <FlaskRound className={cn("h-16 w-16", current.icon)} strokeWidth={1.25} aria-hidden />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground">
          Фото бренда · {current.label}
        </span>
      </div>
      <div className="mt-3 flex gap-2" role="group" aria-label="Фото средства">
        {PHOTOS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPhoto(i)}
            aria-label={`Фото: ${p.label}`}
            aria-pressed={i === photo}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl border transition-colors",
              p.cls,
              i === photo ? "border-foreground" : "border-transparent hover:border-ink-line",
            )}
          >
            <FlaskRound className={cn("h-5 w-5", p.icon)} strokeWidth={1.5} aria-hidden />
          </button>
        ))}
      </div>

      {/* Название */}
      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Ваш бренд</p>
      <p className="mt-1 text-lg font-semibold leading-snug">Сыворотка с ниацинамидом 10%</p>

      {/* Разбор — наш, бренд на него не влияет */}
      <div className="mt-4 rounded-2xl bg-ink-wash p-4">
        <p className="text-sm font-semibold">Разбор состава от Buty</p>
        <ul className="mt-2 space-y-1.5">
          {ANALYSIS.map((a) => (
            <li key={a.name} className="flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", a.dot)} aria-hidden />
              <span className="font-medium">{a.name}</span>
              <span className="truncate text-ink-muted">— {a.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-muted">Оценку бренд изменить не может</p>
      </div>

      {/* Ссылки на покупку */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <span className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-cta px-4 text-sm font-semibold text-white">
          Сайт бренда <ExternalLink className="h-4 w-4" aria-hidden />
        </span>
        <span className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-line px-4 text-sm font-semibold">
          На маркетплейсе <ExternalLink className="h-4 w-4" aria-hidden />
        </span>
      </div>

      {/* Промокод: скрыт до клика */}
      <div className="mt-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4">
        <div className="flex items-start gap-3">
          <TicketPercent className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">−15% в официальном магазине</p>
            <p className="text-xs text-ink-muted">До 31 декабря · по ссылке выше</p>
          </div>
        </div>
        {revealed ? (
          <div className="mt-3 flex items-center gap-2">
            <span className="flex h-11 flex-1 items-center justify-center rounded-lg border border-ink-line bg-white font-mono text-base font-semibold tracking-widest">
              {DEMO_CODE}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-white hover:bg-black"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Скопирован" : "Копировать"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-foreground bg-white text-sm font-semibold hover:bg-ink-wash"
          >
            <EyeOff className="h-4 w-4" aria-hidden /> Показать промокод
          </button>
        )}
      </div>

      {/* Блок «От бренда» */}
      <div className="mt-3 rounded-2xl border border-ink-hair p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">От бренда</p>
          <span className="rounded-full bg-ink-wash px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            Реклама
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Лёгкая сыворотка на каждый день: выравнивает тон и делает поры менее заметными.
          Без отдушки, подходит для комбинированной кожи.
        </p>
        <p className="mt-2 text-[11px] text-ink-faint">Рекламодатель: ООО «Ваш бренд» · erid: пример</p>
      </div>
    </div>
  );
}
