"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Copy,
  FlaskConical,
  LayoutGrid,
  ShoppingCart,
  Sparkles,
  Sun,
  Moon,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ShelfClient, type ShelfItemView } from "@/components/shelf-client";
import type {
  DuplicateGroup,
  PairResult,
  Routine,
} from "@/lib/shelf/compatibility";

export interface ReactionView {
  id: string;
  type: string;
  note: string | null;
  photoUrl: string | null;
  occurredAt: string;
  itemTitle: string;
  suspects: string[];
}

export interface ReminderView {
  id: string;
  type: "introduce" | "restock";
  nextRunAt: string;
  doneAt: string | null;
  itemTitle: string;
  logs: { id: string; channel: string; message: string; createdAt: string }[];
}

const REACTION_LABELS: Record<string, string> = {
  redness: "Покраснение",
  itching: "Зуд",
  burning: "Жжение",
  breakouts: "Высыпания",
  dryness: "Сухость/шелушение",
  other: "Другое",
};

const TABS = [
  { id: "items", label: "Средства", icon: LayoutGrid },
  { id: "compatibility", label: "Совместимость", icon: FlaskConical },
  { id: "routine", label: "Мой режим", icon: Sun },
  { id: "reactions", label: "Реакции", icon: AlertTriangle },
  { id: "reminders", label: "Напоминания", icon: Bell },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  items: ShelfItemView[];
  pairs: PairResult[];
  duplicates: DuplicateGroup[];
  routine: Routine;
  reactions: ReactionView[];
  reminders: ReminderView[];
  isPro: boolean;
  reactionsLimited: boolean;
}

/** Вкладки «Моей полки»: средства + Pro-логика части 6 (гейтится по тарифу). */
export function ShelfTabs(props: Props) {
  const [tab, setTab] = useState<TabId>("items");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              tab === id
                ? "bg-lavender/15 text-lavender-700"
                : "text-muted-foreground hover:bg-lavender/5",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
            {!props.isPro && (id === "compatibility" || id === "routine") ? (
              <Sparkles className="h-3 w-3 text-amber" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "items" ? <ShelfClient items={props.items} /> : null}
        {tab === "compatibility" ? (
          props.isPro ? (
            <CompatibilityTab pairs={props.pairs} duplicates={props.duplicates} />
          ) : (
            <LockedTab text="Матрица совместимости активов и поиск дублей доступны в Pro." />
          )
        ) : null}
        {tab === "routine" ? (
          props.isPro ? (
            <RoutineTab routine={props.routine} />
          ) : (
            <LockedTab text="Персональный режим утро/вечер с порядком нанесения доступен в Pro." />
          )
        ) : null}
        {tab === "reactions" ? (
          <ReactionsTab
            items={props.items}
            reactions={props.reactions}
            limited={props.reactionsLimited}
          />
        ) : null}
        {tab === "reminders" ? (
          <RemindersTab items={props.items} reminders={props.reminders} />
        ) : null}
      </div>
    </div>
  );
}

/** Заглушка Pro-вкладки для бесплатного тарифа. */
function LockedTab({ text }: { text: string }) {
  return (
    <GlassCard className="flex flex-col items-center gap-4 p-10 text-center">
      <Sparkles className="h-8 w-8 text-amber" />
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      <Button asChild size="sm">
        <Link href="/pricing">Перейти на Pro</Link>
      </Button>
    </GlassCard>
  );
}

const PAIR_STYLES: Record<PairResult["status"], { label: string; cls: string }> = {
  conflict: { label: "Конфликт", cls: "bg-coral/10 text-coral-700" },
  spread: { label: "Разнести", cls: "bg-amber/15 text-amber-700" },
  ok: { label: "ОК", cls: "bg-lavender/10 text-lavender-700" },
};

function CompatibilityTab({
  pairs,
  duplicates,
}: {
  pairs: PairResult[];
  duplicates: DuplicateGroup[];
}) {
  return (
    <div className="space-y-6">
      {pairs.length === 0 ? (
        <EmptyNote text="Добавьте минимум два средства со статусом «Использую», чтобы увидеть матрицу совместимости." />
      ) : (
        <div className="grid gap-3">
          {pairs.map((p) => (
            <GlassCard key={`${p.productAId}-${p.productBId}`} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {p.aTitle} <span className="text-muted-foreground">×</span>{" "}
                  {p.bTitle}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    PAIR_STYLES[p.status].cls,
                  )}
                >
                  {PAIR_STYLES[p.status].label}
                </span>
              </div>
              {p.conflicts.map((c, i) => (
                <p key={i} className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {c.aName} × {c.bName}
                  </span>{" "}
                  ({c.severity}): {c.reason}
                </p>
              ))}
              {p.note ? (
                <p className="mt-2 text-xs text-muted-foreground">{p.note}</p>
              ) : null}
            </GlassCard>
          ))}
        </div>
      )}

      {duplicates.length > 0 ? (
        <div>
          <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Copy className="h-4 w-4 text-amber" /> Похожие средства
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {duplicates.map((d) => (
              <GlassCard key={d.productIds.join("-")} className="p-4">
                <p className="text-sm font-medium">{d.titles.join(" × ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Общие активы:{" "}
                  {d.sharedActives.map((a) => a.displayName).join(", ")}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoutineTab({ routine }: { routine: Routine }) {
  const block = (
    title: string,
    icon: typeof Sun,
    steps: Routine["morning"],
  ) => {
    const Icon = icon;
    return (
      <GlassCard className="p-5">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
          <Icon className="h-5 w-5 text-lavender" /> {title}
        </h2>
        {steps.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Нет шагов.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {steps.map((s) => (
              <li key={s.productId} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender/15 text-xs font-bold text-lavender-700">
                  {s.order}
                </span>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.why}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </GlassCard>
    );
  };

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {block("Утро", Sun, routine.morning)}
        {block("Вечер", Moon, routine.evening)}
      </div>
      {routine.notes.length > 0 ? (
        <GlassCard className="mt-4 p-5">
          <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-amber" /> Рекомендации
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {routine.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </GlassCard>
      ) : null}
    </div>
  );
}

function ReactionsTab({
  items,
  reactions,
  limited,
}: {
  items: ShelfItemView[];
  reactions: ReactionView[];
  limited: boolean;
}) {
  const router = useRouter();
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState("redness");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shelfItemId: itemId,
        type,
        note: note || undefined,
        occurredAt: date || undefined,
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Не удалось сохранить реакцию.");
      return;
    }
    setItemId("");
    setNote("");
    setDate("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-5">
        <h2 className="font-display text-lg font-semibold">Записать реакцию</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            aria-label="Средство"
            className="rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-lavender/40"
          >
            <option value="">Выберите средство…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Тип реакции"
            className="rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-lavender/40"
          >
            {Object.entries(REACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Дата реакции"
          />
          <Input
            placeholder="Комментарий (необязательно)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Комментарий"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <Button
          className="mt-4"
          disabled={!itemId || pending}
          onClick={submit}
        >
          Сохранить реакцию
        </Button>
      </GlassCard>

      {reactions.length === 0 ? (
        <EmptyNote text="Реакций пока нет — отлично! Если что-то пойдёт не так, записывайте здесь: сервис свяжет реакцию с составом средства." />
      ) : (
        <div className="grid gap-3">
          {reactions.map((r) => (
            <GlassCard key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{r.itemTitle}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="coral">{REACTION_LABELS[r.type] ?? r.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.occurredAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
              {r.note ? (
                <p className="mt-2 text-sm text-muted-foreground">{r.note}</p>
              ) : null}
              {r.suspects.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Подозреваемые ингредиенты: {r.suspects.join(", ")}
                </p>
              ) : null}
            </GlassCard>
          ))}
          {limited ? (
            <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-xs text-muted-foreground">
                Показаны последние реакции. Полная история без лимита — в Pro.
              </p>
              <Button asChild size="sm" variant="secondary">
                <Link href="/pricing">Открыть историю</Link>
              </Button>
            </GlassCard>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RemindersTab({
  items,
  reminders,
}: {
  items: ShelfItemView[];
  reminders: ReminderView[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function create(shelfItemId: string, type: "introduce" | "restock") {
    setPendingId(`${shelfItemId}-${type}`);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shelfItemId, type }),
    });
    setPendingId(null);
    if (res.ok) router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-5">
        <h2 className="font-display text-lg font-semibold">
          Поставить напоминание
        </h2>
        <div className="mt-4 grid gap-3">
          {items.map((i) => (
            <div
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/50 px-4 py-3"
            >
              <p className="text-sm font-medium">{i.title}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pendingId !== null}
                  onClick={() => create(i.id, "introduce")}
                >
                  <CalendarClock className="h-4 w-4" /> О введении (28 дн.)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pendingId !== null}
                  onClick={() => create(i.id, "restock")}
                >
                  <ShoppingCart className="h-4 w-4" /> О покупке (90 дн.)
                </Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {reminders.length === 0 ? (
        <EmptyNote text="Активных напоминаний нет." />
      ) : (
        <div className="grid gap-3">
          {reminders.map((r) => (
            <GlassCard key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{r.itemTitle}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.type === "introduce"
                      ? "Напомнить о введении"
                      : "Напомнить о покупке"}{" "}
                    · {new Date(r.nextRunAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.doneAt ? (
                    <Badge variant="outline">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Отправлено
                    </Badge>
                  ) : (
                    <Badge>Ждёт</Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    aria-label="Удалить напоминание"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-coral/10 hover:text-coral-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {r.logs.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-white/50 pt-2">
                  {r.logs.map((l) => (
                    <li key={l.id} className="text-xs text-muted-foreground">
                      [{l.channel}] {new Date(l.createdAt).toLocaleString("ru-RU")}
                      : {l.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <GlassCard className="p-5 text-sm text-muted-foreground">{text}</GlassCard>
  );
}
