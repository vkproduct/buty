"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

interface AnalysisListItem {
  id: string;
  createdAt: string;
  inputMethod: string;
  total: number;
  recognized: number;
  conflicts: number;
  preview: string;
  rawText: string;
  productName: string | null;
}

const INPUT_METHOD_LABEL: Record<string, string> = {
  text: "текст",
  photo: "фото",
  product: "карточка продукта",
};

function formatMsk(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
}

/** «История разборов» в профиле: список с повторным разбором и удалением. */
export function AnalysisHistory() {
  const [items, setItems] = useState<AnalysisListItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses${cursor ? `?cursor=${cursor}` : ""}`);
      if (!res.ok) throw new Error("Не удалось загрузить историю");
      const data = (await res.json()) as { items: AnalysisListItem[]; nextCursor: string | null };
      setItems((prev) => (cursor && prev ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить историю");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить запись");
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить запись");
    } finally {
      setRemoving(null);
    }
  }

  async function clearAll() {
    setRemoving("all");
    setError(null);
    try {
      const res = await fetch("/api/analyses", { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось очистить историю");
      setItems([]);
      setNextCursor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось очистить историю");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">История разборов</h2>
        {items && items.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={removing !== null}
            onClick={() => void clearAll()}
          >
            {removing === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Очистить историю
          </Button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-coral-700">{error}</p>}
      {items === null || loading ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {items === null ? "Загружаем…" : "Загружаем ещё…"}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Здесь появятся ваши разборы.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2.5 text-sm"
            >
              <Link
                href={`/analyze?text=${encodeURIComponent(a.rawText)}`}
                className="min-w-0 font-medium text-brand hover:underline"
                title="Разобрать ещё раз"
              >
                <span className="block truncate">
                  {a.productName ?? a.preview}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {formatMsk(a.createdAt)} · {INPUT_METHOD_LABEL[a.inputMethod] ?? a.inputMethod} ·
                  распознано {a.recognized} из {a.total}
                  {a.conflicts > 0 ? ` · конфликтов: ${a.conflicts}` : ""}
                </span>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Удалить запись"
                disabled={removing !== null}
                onClick={() => void remove(a.id)}
              >
                {removing === a.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {nextCursor && (
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          disabled={loading}
          onClick={() => void load(nextCursor)}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Показать ещё
        </Button>
      )}
    </GlassCard>
  );
}
