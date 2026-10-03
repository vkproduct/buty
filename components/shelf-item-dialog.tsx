"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  REMINDER_COPY,
  REMINDER_DELAYS_DAYS,
  type ReminderKind,
} from "@/lib/reminders/constants";
import { REACTION_LABELS } from "@/lib/shelf/reaction-labels";
import type { ShelfItemView } from "@/components/shelf-client";

export const STATUS_LABELS: Record<ShelfItemView["status"], string> = {
  using: "Использую",
  finished: "Закончила",
  reacted: "Была реакция",
};

const STATUS_HINTS: Record<ShelfItemView["status"], string> = {
  using: "Средство участвует в проверке совместимости и в режиме утро/вечер.",
  finished: "Средство остаётся в истории, но не участвует в проверке совместимости.",
  reacted: "Средство исключено из проверки совместимости. По каждой записанной реакции сервис подсвечивает подозреваемые ингредиенты состава.",
};

const REMINDER_ICONS: Record<ReminderKind, typeof CalendarClock> = {
  introduce: CalendarClock,
  restock: ShoppingCart,
};

/** Сегодняшняя дата в формате YYYY-MM-DD (локальное время). */
function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** «31 октября» */
export function formatDayMonth(date: Date | string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

interface Props {
  item: ShelfItemView | null;
  onOpenChange: (open: boolean) => void;
}

/** Окно средства на полке: состав, статус, редактирование, напоминания, удаление. */
export function ShelfItemDialog({ item, onOpenChange }: Props) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        {item ? (
          <ItemDetails item={item} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ItemDetails({
  item,
  onClose,
}: {
  item: ShelfItemView;
  onClose: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.title);
  const [inci, setInci] = useState(item.customInci ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reactionFormOpen, setReactionFormOpen] = useState(false);

  // Данные карточки обновляются после router.refresh() — синхронизируем форму
  useEffect(() => {
    if (!editing) {
      setName(item.title);
      setInci(item.customInci ?? "");
    }
  }, [item.title, item.customInci, editing]);

  async function call(key: string, promise: Promise<Response>) {
    setPending(key);
    setError(null);
    try {
      const res = await promise;
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Не получилось. Попробуйте ещё раз.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
      return false;
    } finally {
      setPending(null);
    }
  }

  const patch = (body: Record<string, unknown>) =>
    fetch(`/api/shelf/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  async function setStatus(status: ShelfItemView["status"]) {
    // «Была реакция» — сразу открываем форму записи реакции;
    // статус сменится сам, когда реакция будет сохранена.
    if (status === "reacted") {
      setReactionFormOpen(true);
      return;
    }
    setReactionFormOpen(false);
    if (status === item.status) return;
    await call(`status-${status}`, patch({ status }));
  }

  async function saveReaction(data: {
    type: string;
    occurredAt: string;
    note: string;
  }) {
    const ok = await call(
      "reaction",
      fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelfItemId: item.id,
          type: data.type,
          occurredAt: data.occurredAt || undefined,
          note: data.note || undefined,
        }),
      }),
    );
    if (ok) setReactionFormOpen(false);
  }

  async function markReactedOnly() {
    const ok = await call("status-reacted", patch({ status: "reacted" }));
    if (ok) setReactionFormOpen(false);
  }

  async function saveEdits() {
    const ok = await call(
      "save",
      patch({ customName: name, customInci: inci }),
    );
    if (ok) setEditing(false);
  }

  async function addReminder(type: ReminderKind) {
    await call(
      `remind-${type}`,
      fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelfItemId: item.id, type }),
      }),
    );
  }

  async function cancelReminder(id: string) {
    await call(`cancel-${id}`, fetch(`/api/reminders/${id}`, { method: "DELETE" }));
  }

  async function remove() {
    const ok = await call(
      "delete",
      fetch(`/api/shelf/${item.id}`, { method: "DELETE" }),
    );
    if (ok) onClose();
  }

  const isCustom = item.kind === "custom";
  const dirty =
    name.trim() !== item.title || inci.trim() !== (item.customInci ?? "").trim();

  return (
    <div className="space-y-6">
      <DialogHeader className="pr-8 text-left">
        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
        <DialogTitle className="font-display text-xl leading-snug">
          {item.title}
        </DialogTitle>
        <DialogDescription className="text-xs">
          На полке с {formatDayMonth(item.addedAt)}
        </DialogDescription>
      </DialogHeader>

      {/* Статус */}
      <section>
        <h3 className="text-sm font-semibold">Статус</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(STATUS_LABELS) as ShelfItemView["status"][]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending !== null}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-60",
                item.status === s || (s === "reacted" && reactionFormOpen)
                  ? s === "reacted"
                    ? "border-transparent bg-coral/10 font-semibold text-coral-700"
                    : "border-transparent bg-brand/15 font-semibold text-brand-700"
                  : "border-ink-hair text-muted-foreground hover:bg-brand/5",
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {!reactionFormOpen ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {STATUS_HINTS[item.status]}
          </p>
        ) : null}

        {reactionFormOpen ? (
          <ReactionForm
            pending={pending}
            alreadyReacted={item.status === "reacted"}
            onSave={saveReaction}
            onSkip={markReactedOnly}
            onCancel={() => {
              setReactionFormOpen(false);
              setError(null);
            }}
          />
        ) : null}

        {item.reactions.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-muted-foreground">
              Записанные реакции
            </h4>
            <ul className="mt-2 space-y-2">
              {item.reactions.map((r) => (
                <li key={r.id} className="rounded-xl bg-ink-wash p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-coral-700">
                      {REACTION_LABELS[r.type] ?? r.type}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDayMonth(r.occurredAt)}
                    </span>
                  </div>
                  {r.note ? (
                    <p className="mt-1 text-xs text-ink-soft">{r.note}</p>
                  ) : null}
                  {r.suspects.length > 0 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Подозреваемые ингредиенты: {r.suspects.slice(0, 8).join(", ")}
                      {r.suspects.length > 8 ? ` и ещё ${r.suspects.length - 8}` : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {item.status === "reacted" && !reactionFormOpen ? (
          <button
            type="button"
            onClick={() => setReactionFormOpen(true)}
            className="mt-3 text-xs font-semibold text-coral-700 hover:underline"
          >
            + Записать {item.reactions.length > 0 ? "ещё одну " : ""}реакцию
          </button>
        ) : null}
      </section>

      {/* Состав */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Состав
            {item.ingredientNames.length > 0 ? (
              <span className="ml-1 font-normal text-muted-foreground">
                · {item.ingredientNames.length} ингр.
              </span>
            ) : null}
          </h3>
          {isCustom && !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Редактировать
            </button>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-3 space-y-3">
            <label className="block text-xs text-muted-foreground">
              Название
              <Input
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Состав (INCI-список с упаковки)
              <textarea
                className="mt-1 min-h-32 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                value={inci}
                onChange={(e) => setInci(e.target.value)}
                placeholder="Aqua, Glycerin, Niacinamide…"
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!name.trim() || !dirty || pending !== null}
                onClick={saveEdits}
              >
                {pending === "save" ? "Сохраняем…" : "Сохранить"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending !== null}
                onClick={() => {
                  setEditing(false);
                  setName(item.title);
                  setInci(item.customInci ?? "");
                  setError(null);
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : item.ingredientNames.length > 0 ? (
          <>
            <ul className="mt-3 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {item.ingredientNames.map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className="rounded-full bg-ink-wash px-2.5 py-1 text-xs text-ink-soft"
                >
                  {n}
                </li>
              ))}
            </ul>
            {item.unrecognizedCount > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Не распознано компонентов: {item.unrecognizedCount}. Проверьте
                написание в составе.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 rounded-xl bg-amber/10 p-3 text-xs text-amber-800">
            Состав не указан — без него нельзя проверить совместимость.{" "}
            {isCustom ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="font-semibold underline"
              >
                Добавить состав
              </button>
            ) : null}
          </p>
        )}

        {!isCustom && item.slug ? (
          <Link
            href={`/products/${item.slug}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            Полный разбор средства <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        {!isCustom ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Состав взят из базы Buty, поэтому его нельзя изменить.
          </p>
        ) : null}
      </section>

      {/* Напоминания */}
      <section>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <BellRing className="h-4 w-4 text-amber" /> Напомнить мне
        </h3>
        <div className="mt-3 space-y-2">
          {(Object.keys(REMINDER_COPY) as ReminderKind[]).map((type) => {
            const Icon = REMINDER_ICONS[type];
            const active = item.reminders.find((r) => r.type === type);
            return (
              <div
                key={type}
                className="flex flex-col gap-3 rounded-2xl border border-ink-hair p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/10">
                    <Icon className="h-4 w-4 text-amber-700" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{REMINDER_COPY[type].title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {REMINDER_COPY[type].why}
                    </p>
                  </div>
                </div>
                {active ? (
                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                    <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
                      {formatDayMonth(active.nextRunAt)}
                    </span>
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={() => cancelReminder(active.id)}
                      aria-label={`Отменить напоминание «${REMINDER_COPY[type].title}»`}
                      title="Отменить напоминание"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-coral/10 hover:text-coral-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0 self-end sm:self-auto"
                    disabled={pending !== null}
                    onClick={() => addReminder(type)}
                  >
                    {pending === `remind-${type}`
                      ? "Ставим…"
                      : `Напомнить ${formatDayMonth(addDays(REMINDER_DELAYS_DAYS[type]))}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Удаление */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Убрать средство с полки? Реакции и напоминания по нему тоже удалятся.
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending !== null}
              onClick={() => setConfirmDelete(false)}
            >
              Нет
            </Button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={remove}
              className="rounded-full bg-coral/10 px-3 py-1.5 text-xs font-semibold text-coral-700 hover:bg-coral/20"
            >
              Да, убрать
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-coral-700"
          >
            <Trash2 className="h-3.5 w-3.5" /> Убрать с полки
          </button>
        )}
      </div>
    </div>
  );
}

/** Форма записи реакции — открывается сразу при выборе «Была реакция». */
function ReactionForm({
  pending,
  alreadyReacted,
  onSave,
  onSkip,
  onCancel,
}: {
  pending: string | null;
  alreadyReacted: boolean;
  onSave: (data: { type: string; occurredAt: string; note: string }) => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const today = todayIso();

  return (
    <div className="mt-3 rounded-2xl border border-coral/30 bg-coral/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 text-coral-700" /> Что произошло?
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Запишите реакцию — сервис свяжет её с составом и подсветит
        подозреваемые ингредиенты.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Тип реакции">
        {Object.entries(REACTION_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              type === value
                ? "border-coral-700 bg-white font-semibold text-coral-700"
                : "border-ink-hair bg-white text-muted-foreground hover:border-coral/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
        <label className="block text-xs text-muted-foreground">
          Когда
          <Input
            type="date"
            className="mt-1"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Комментарий (необязательно)
          <Input
            className="mt-1"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например: щипало после нанесения на щёки"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!type || pending !== null}
          onClick={() => type && onSave({ type, occurredAt: date, note: note.trim() })}
        >
          {pending === "reaction" ? "Сохраняем…" : "Сохранить реакцию"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending !== null}
          onClick={onCancel}
        >
          Отмена
        </Button>
        {!alreadyReacted ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={onSkip}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Только сменить статус, без записи
          </button>
        ) : null}
      </div>
    </div>
  );
}
