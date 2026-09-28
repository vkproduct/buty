"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  FlaskConical,
  LayoutGrid,
  Moon,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Демо «Моей полки» для главной: статичные данные в формате настоящих вкладок
 * (Средства · Совместимость · Мой режим · Реакции · Напоминания).
 */

type TabId = "items" | "compatibility" | "routine" | "reactions" | "reminders";

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid; pro?: boolean; hint: string }[] = [
  {
    id: "items",
    label: "Средства",
    icon: LayoutGrid,
    hint: "Добавляйте средства из каталога или свои — по названию и составу. Каждое средство сразу разбирается по активам.",
  },
  {
    id: "compatibility",
    label: "Совместимость",
    icon: FlaskConical,
    pro: true,
    hint: "Каждая пара средств проверяется на конфликты активов. Плюс поиск дублей — средств с одинаковыми активами.",
  },
  {
    id: "routine",
    label: "Мой режим",
    icon: Sun,
    pro: true,
    hint: "Порядок нанесения утром и вечером — с учётом конфликтов и того, какие активы лучше работают ночью.",
  },
  {
    id: "reactions",
    label: "Реакции",
    icon: AlertTriangle,
    hint: "Отмечайте покраснение, зуд или высыпания — со временем видно, на что реагирует именно ваша кожа.",
  },
  {
    id: "reminders",
    label: "Напоминания",
    icon: Bell,
    hint: "Напомним оценить новое средство через 28 дней и докупить привычное — через 90.",
  },
];

const ITEMS = [
  { title: "Сыворотка с ретинолом", actives: ["Retinol"] },
  { title: "Тоник с гликолевой кислотой", actives: ["Glycolic Acid"] },
  { title: "Сыворотка с витамином C", actives: ["Ascorbic Acid"] },
  { title: "Крем с ниацинамидом", actives: ["Niacinamide", "Ceramide NP"] },
  { title: "Флюид SPF 50", actives: ["UV-фильтры", "Niacinamide"] },
];

const PAIRS = [
  {
    a: "Сыворотка с ретинолом",
    b: "Тоник с гликолевой кислотой",
    status: "conflict" as const,
    note: "Ретиноид + AHA в один приём суммируют раздражение. Чередуйте по вечерам.",
  },
  {
    a: "Сыворотка с ретинолом",
    b: "Сыворотка с витамином C",
    status: "spread" as const,
    note: "Лучше развести по времени: витамин C — утром, ретинол — вечером.",
  },
  {
    a: "Сыворотка с витамином C",
    b: "Крем с ниацинамидом",
    status: "ok" as const,
    note: "Совместимы — можно наносить в один приём.",
  },
];

const PAIR_STYLE = {
  conflict: { label: "Конфликт", cls: "bg-coral-50 text-coral-700" },
  spread: { label: "Разнести", cls: "bg-amber-50 text-amber-800" },
  ok: { label: "ОК", cls: "bg-success-50 text-success-700" },
};

function ProTag() {
  return (
    <span className="absolute -right-7 -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      Pro
    </span>
  );
}

export function ShelfShowcase() {
  const [tab, setTab] = useState<TabId>("compatibility");
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-hair bg-white shadow-glow">
      {/* Вкладки */}
      <div
        role="tablist"
        aria-label="Разделы «Моей полки»"
        className="flex gap-2 overflow-x-auto border-b border-ink-hair px-3 sm:gap-4 sm:px-5"
      >
        {TABS.map(({ id, label, icon: Icon, pro }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`shelf-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="shelf-panel"
            onClick={() => setTab(id)}
            className={cn(
              "group flex shrink-0 grow flex-col items-center gap-2 whitespace-nowrap border-b-2 px-2 pb-3 pt-4 text-xs font-semibold transition-colors",
              tab === id
                ? "border-foreground text-foreground"
                : "border-transparent text-ink-muted hover:border-ink-line hover:text-foreground",
            )}
          >
            <span className="relative">
              <Icon
                className={cn("h-6 w-6", tab === id ? "opacity-100" : "opacity-70 group-hover:opacity-100")}
                strokeWidth={1.5}
                aria-hidden
              />
              {pro ? <ProTag /> : null}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div
        id="shelf-panel"
        role="tabpanel"
        aria-labelledby={`shelf-tab-${tab}`}
        className="min-h-[360px] p-5 sm:p-7"
      >
        <p className="mb-5 text-[15px] leading-relaxed text-ink-soft">{current.hint}</p>

        {tab === "items" ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {ITEMS.map((i) => (
              <li key={i.title} className="rounded-xl border border-ink-hair p-4">
                <div className="text-sm font-semibold">{i.title}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {i.actives.map((a) => (
                    <span key={a} className="rounded-full bg-ink-wash px-2.5 py-1 text-xs text-ink-soft">
                      {a}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "compatibility" ? (
          <ul className="space-y-2.5">
            {PAIRS.map((p) => (
              <li key={p.a + p.b} className="rounded-xl border border-ink-hair p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {p.a} <span className="font-normal text-ink-faint">×</span> {p.b}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
                      PAIR_STYLE[p.status].cls,
                    )}
                  >
                    {PAIR_STYLE[p.status].label}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{p.note}</p>
              </li>
            ))}
            <li className="rounded-xl bg-ink-wash p-4 text-sm text-ink-soft">
              <span className="font-semibold text-foreground">Похожие средства:</span> ниацинамид
              есть и в креме, и в SPF — вторая сыворотка с ним не нужна.
            </li>
          </ul>
        ) : null}

        {tab === "routine" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Утро",
                icon: Sun,
                steps: ["Сыворотка с витамином C", "Крем с ниацинамидом", "Флюид SPF 50"],
              },
              {
                title: "Вечер",
                icon: Moon,
                steps: ["Сыворотка с ретинолом", "Крем с ниацинамидом"],
              },
            ].map(({ title, icon: Icon, steps }) => (
              <div key={title} className="rounded-xl border border-ink-hair p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon className="h-4 w-4" aria-hidden /> {title}
                </div>
                <ol className="mt-3 space-y-2">
                  {steps.map((s, i) => (
                    <li key={s} className="flex items-start gap-2.5 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <p className="rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 sm:col-span-2">
              Тоник с гликолевой кислотой — через вечер, в дни без ретинола.
            </p>
          </div>
        ) : null}

        {tab === "reactions" ? (
          <ul className="space-y-2.5">
            {[
              { type: "Покраснение", item: "Тоник с гликолевой кислотой", when: "3 дня назад", note: "после второго нанесения подряд" },
              { type: "Сухость/шелушение", item: "Сыворотка с ретинолом", when: "2 недели назад", note: "первая неделя использования" },
            ].map((r) => (
              <li key={r.type} className="rounded-xl border border-ink-hair p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-coral-50 px-2.5 py-1 text-xs font-semibold leading-none text-coral-700">
                    {r.type}
                  </span>
                  <span className="text-sm text-ink-muted">{r.when}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium">{r.item}</p>
                <p className="text-sm text-ink-muted">{r.note}</p>
              </li>
            ))}
            <li className="text-sm text-ink-muted">
              Free — последние 5 реакций, Pro — вся история.
            </li>
          </ul>
        ) : null}

        {tab === "reminders" ? (
          <ul className="space-y-2.5">
            {[
              { title: "Оцените сыворотку с ретинолом", text: "Прошло 28 дней с начала использования — время понять, работает ли средство." },
              { title: "Пора докупить флюид SPF 50", text: "Прошло 90 дней — скорее всего, флакон заканчивается." },
            ].map((r) => (
              <li key={r.title} className="flex gap-3 rounded-xl border border-ink-hair p-4">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="border-t border-ink-hair px-5 py-3 text-xs text-ink-muted sm:px-7">
        Пример полки — демонстрация интерфейса. Рекомендации в вашей полке строятся по составам ваших средств.
      </div>
    </div>
  );
}
