"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, ChevronRight, FlaskConical, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/analysis/types";
import { REMINDER_COPY } from "@/lib/reminders/constants";
import {
  formatDayMonth,
  ShelfItemDialog,
  STATUS_LABELS,
} from "@/components/shelf-item-dialog";

export interface ShelfReminderView {
  id: string;
  type: "introduce" | "restock";
  nextRunAt: string;
}

export interface ShelfReactionView {
  id: string;
  type: string;
  note: string | null;
  occurredAt: string;
  /** Названия подозреваемых ингредиентов */
  suspects: string[];
}

export interface ShelfItemView {
  id: string;
  /** catalog — средство из базы Buty, custom — «своё средство» пользователя */
  kind: "catalog" | "custom";
  status: "using" | "finished" | "reacted";
  addedAt: string;
  title: string;
  subtitle: string;
  slug: string | null;
  ingredientNames: string[];
  /** Исходный INCI-текст «своего средства» (для редактирования) */
  customInci: string | null;
  /** Сколько компонентов состава не удалось распознать */
  unrecognizedCount: number;
  /** Активные (ещё не сработавшие) напоминания */
  reminders: ShelfReminderView[];
  /** Реакции на средство (на free — в пределах видимой истории) */
  reactions: ShelfReactionView[];
}

const STATUS_VARIANTS: Record<
  ShelfItemView["status"],
  "default" | "outline" | "coral"
> = {
  using: "default",
  finished: "outline",
  reacted: "coral",
};

interface ProductHit {
  id: string;
  brand: string;
  name: string;
  category: string;
}

/** Прочитать текст ошибки API (в т.ч. paywall 402 с лимитом полки). */
async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Не удалось добавить средство.";
  } catch {
    return "Не удалось добавить средство.";
  }
}

/** Клиент полки: список средств (карточки открываются в окно), добавление. */
export function ShelfClient({
  items,
  aside,
}: {
  items: ShelfItemView[];
  /** Блок между заголовком и карточками (например, сводка совместимости) */
  aside?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const openItem = items.find((i) => i.id === openItemId) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight">Моя полка</h1>
          <p className="mt-1 text-muted-foreground">
            {items.length > 0
              ? `Средств на полке: ${items.length}`
              : "Пока пусто — добавьте первое средство."}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Добавить средство
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить средство</DialogTitle>
            </DialogHeader>
            <AddItemForm
              onAdded={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {aside ? <div className="mt-6">{aside}</div> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <GlassCard
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={`Открыть «${item.title}»`}
            onClick={() => setOpenItemId(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenItemId(item.id);
              }
            }}
            className="group flex cursor-pointer flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                <h2 className="font-display truncate text-base font-semibold group-hover:text-brand-700">
                  {item.title}
                </h2>
              </div>
              <Badge variant={STATUS_VARIANTS[item.status]}>
                {STATUS_LABELS[item.status]}
              </Badge>
            </div>

            {item.ingredientNames.length > 0 ? (
              <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
                {item.ingredientNames.slice(0, 8).join(" · ")}
                {item.ingredientNames.length > 8
                  ? ` · ещё ${item.ingredientNames.length - 8}`
                  : ""}
              </p>
            ) : (
              <p className="mt-3 text-xs text-amber-800">
                Состав не указан — откройте карточку, чтобы добавить.
              </p>
            )}

            <div className="min-h-[1rem] flex-1" />
            <div className="flex items-end justify-between gap-2 border-t border-border pt-3">
              <div className="flex min-w-0 flex-col gap-1">
                {item.reminders.length > 0 ? (
                  item.reminders.map((r) => (
                    <span
                      key={r.id}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground"
                    >
                      <BellRing className="h-3 w-3 shrink-0 text-amber" />
                      {REMINDER_COPY[r.type].title} · {formatDayMonth(r.nextRunAt)}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Напоминаний нет
                  </span>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-700">
                Подробнее
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      <ShelfItemDialog
        item={openItem}
        onOpenChange={(v) => {
          if (!v) setOpenItemId(null);
        }}
      />
    </div>
  );
}

function AddItemForm({ onAdded }: { onAdded: () => void }) {
  const [mode, setMode] = useState<"search" | "custom">("search");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [customName, setCustomName] = useState("");
  const [customInci, setCustomInci] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = (await res.json()) as { products: ProductHit[] };
      setHits(data.products);
    }
  }

  async function addProduct(productId: string) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setPending(false);
    if (res.ok) onAdded();
    else setError(await readError(res));
  }

  async function analyze() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: customInci }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Не удалось разобрать состав.");
      return;
    }
    setAnalysis((await res.json()) as AnalysisResult);
  }

  async function addCustom() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customName, customInci: customInci || undefined }),
    });
    setPending(false);
    if (res.ok) onAdded();
    else setError(await readError(res));
  }

  const tab = (active: boolean) =>
    cn(
      "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all",
      active
        ? "bg-brand/15 text-brand-700"
        : "text-muted-foreground hover:bg-brand/5",
    );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button type="button" className={tab(mode === "search")} onClick={() => setMode("search")}>
          <Search className="mr-1 inline h-4 w-4" /> Из базы
        </button>
        <button type="button" className={tab(mode === "custom")} onClick={() => setMode("custom")}>
          <FlaskConical className="mr-1 inline h-4 w-4" /> Своё средство
        </button>
      </div>

      {mode === "search" ? (
        <div className="space-y-3">
          <Input
            placeholder="Бренд или название…"
            value={query}
            onChange={(e) => search(e.target.value)}
            aria-label="Поиск средства"
          />
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {hits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => addProduct(p.id)}
                  className="w-full rounded-2xl px-3 py-2 text-left transition-colors hover:bg-brand/10 disabled:opacity-50"
                >
                  <span className="text-xs text-muted-foreground">
                    {p.brand} · {p.category}
                  </span>
                  <br />
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              </li>
            ))}
            {query.trim().length >= 2 && hits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Ничего не найдено — попробуйте «Своё средство».
              </li>
            ) : null}
          </ul>
          {error ? (
            <p className="text-sm text-destructive">
              {error}{" "}
              <Link href="/pricing" className="font-medium text-brand hover:underline">
                Тарифы
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            placeholder="Название средства"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            aria-label="Название"
          />
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="Состав (INCI-список текстом) — необязательно"
            value={customInci}
            onChange={(e) => {
              setCustomInci(e.target.value);
              setAnalysis(null);
            }}
            aria-label="Состав"
          />
          {analysis ? (
            <div className="rounded-2xl bg-brand/5 p-3 text-sm">
              <p className="font-semibold text-brand-700">
                Распознано {analysis.summary.recognized} из{" "}
                {analysis.summary.total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analysis.ingredients
                  .slice(0, 10)
                  .map((i) => i.displayName)
                  .join(" · ")}
                {analysis.ingredients.length > 10 ? "…" : ""}
              </p>
              {analysis.conflicts.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-coral-700">
                  Конфликты активов: {analysis.conflicts.length}
                </p>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!customInci.trim() || pending}
              onClick={analyze}
            >
              Разобрать состав
            </Button>
            <Button
              type="button"
              disabled={!customName.trim() || pending}
              onClick={addCustom}
            >
              Добавить на полку
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
