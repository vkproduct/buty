import { getTopUnknownTokens } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";

/** Нераспознанные токены из Feedback: топ для расширения словаря + лента. */
export default async function AdminFeedback() {
  const [top, latest] = await Promise.all([
    getTopUnknownTokens(30),
    prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassCard className="space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">
          Топ нераспознанных токенов
        </h2>
        <p className="text-sm text-muted-foreground">
          Приоритет для расширения словаря ингредиентов.
        </p>
        <ul className="space-y-2">
          {top.length === 0 && (
            <li className="text-sm text-muted-foreground">Данных пока нет.</li>
          )}
          {top.map((t) => (
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

      <GlassCard className="space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">Последние сообщения</h2>
        <ul className="space-y-2">
          {latest.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/50 px-4 py-2 text-sm"
            >
              <span className="font-mono">{f.rawToken}</span>
              <span className="text-muted-foreground">{f.email ?? "—"}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {f.createdAt.toLocaleDateString("ru-RU")}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
