import Link from "next/link";

import {
  getProductAnalysisStats,
  getProductClickStats,
  getTopUnknownTokens,
} from "@/lib/analytics";
import { GlassCard } from "@/components/ui/glass-card";

/** Базовая аналитика для брендов: составы, клики /go/, словарь. */
export default async function AdminAnalytics() {
  const [analyses, clicks, tokens] = await Promise.all([
    getProductAnalysisStats(),
    getProductClickStats(),
    getTopUnknownTokens(10),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassCard className="space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">
          Разборы состава по продуктам
        </h2>
        <ul className="space-y-2">
          {analyses.map((p) => (
            <li
              key={p.productId}
              className="flex items-center justify-between gap-2 rounded-2xl bg-white/50 px-4 py-2 text-sm"
            >
              <Link
                href={`/products/${p.slug}`}
                className="text-lavender hover:underline"
              >
                {p.brand} {p.name}
              </Link>
              <span className="text-muted-foreground">
                {p.ingredientCount} ингр.
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">
          Клики «Где купить» (/go/)
        </h2>
        <ul className="space-y-2">
          {clicks.length === 0 && (
            <li className="text-sm text-muted-foreground">Кликов пока нет.</li>
          )}
          {clicks.map((c) => (
            <li
              key={c.productId}
              className="flex items-center justify-between gap-2 rounded-2xl bg-white/50 px-4 py-2 text-sm"
            >
              <Link
                href={`/products/${c.slug}`}
                className="text-lavender hover:underline"
              >
                {c.brand} {c.name}
              </Link>
              <span className="font-semibold text-lavender">{c.clicks}</span>
            </li>
          ))}
        </ul>

        <h2 className="pt-4 font-display text-xl font-bold">
          Топ-10 нераспознанных токенов
        </h2>
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li
              key={t.token}
              className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-2 text-sm"
            >
              <span className="font-mono">{t.token}</span>
              <span className="font-semibold text-lavender">{t.count}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
