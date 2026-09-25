"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, Plus, Search, Trash2, CalendarClock, ShoppingCart } from "lucide-react";

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

export interface ShelfItemView {
  id: string;
  status: "using" | "finished" | "reacted";
  addedAt: string;
  title: string;
  subtitle: string;
  slug: string | null;
  ingredientNames: string[];
}

const STATUS_LABELS: Record<ShelfItemView["status"], string> = {
  using: "Использую",
  finished: "Закончила",
  reacted: "Была реакция",
};

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

/** Клиент полки: список средств, добавление (поиск/своё), статусы, удаление. */
export function ShelfClient({ items }: { items: ShelfItemView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function mutate(promise: Promise<Response>) {
    const res = await promise;
    if (res.ok) router.refresh();
    return res;
  }

  async function setStatus(id: string, status: ShelfItemView["status"]) {
    await mutate(
      fetch(`/api/shelf/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  }

  async function remove(id: string) {
    await mutate(fetch(`/api/shelf/${id}`, { method: "DELETE" }));
  }

  async function remind(id: string, type: "introduce" | "restock") {
    await mutate(
      fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelfItemId: id, type }),
      }),
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Моя полка</h1>
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <GlassCard key={item.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                <h2 className="font-display truncate text-base font-semibold">
                  {item.slug ? (
                    <Link
                      href={`/products/${item.slug}`}
                      className="hover:text-lavender-700"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
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
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/50 pt-3">
              <div className="flex gap-1">
                {(Object.keys(STATUS_LABELS) as ShelfItemView["status"][]).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(item.id, s)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                        item.status === s
                          ? "bg-lavender/15 font-semibold text-lavender-700"
                          : "text-muted-foreground hover:bg-lavender/5",
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Удалить"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-coral/10 hover:text-coral-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={() => remind(item.id, "introduce")}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-amber/10 hover:text-amber-700"
              >
                <CalendarClock className="h-3.5 w-3.5" /> О введении
              </button>
              <button
                type="button"
                onClick={() => remind(item.id, "restock")}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-amber/10 hover:text-amber-700"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> О покупке
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
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
        ? "bg-lavender/15 text-lavender-700"
        : "text-muted-foreground hover:bg-lavender/5",
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
                  className="w-full rounded-2xl px-3 py-2 text-left transition-colors hover:bg-lavender/10 disabled:opacity-50"
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
              <Link href="/pricing" className="font-medium text-lavender hover:underline">
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
            className="min-h-28 w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-lavender/40"
            placeholder="Состав (INCI-список текстом) — необязательно"
            value={customInci}
            onChange={(e) => {
              setCustomInci(e.target.value);
              setAnalysis(null);
            }}
            aria-label="Состав"
          />
          {analysis ? (
            <div className="rounded-2xl bg-lavender/5 p-3 text-sm">
              <p className="font-semibold text-lavender-700">
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
