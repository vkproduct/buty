import Link from "next/link";

import { getDailyUsage, mskDayStart } from "@/lib/budget/daily-limit";
import { geminiCostUsd } from "@/lib/budget/prices";
import { aiDailyLimit, aiPerIpDailyLimit, AI_DAILY_COUNTER_KEY } from "@/lib/ai-summary/rate-limit";
import {
  OCR_DAILY_COUNTER_KEY,
  ocrDailyLimit,
  ocrPerIpDailyLimit,
} from "@/lib/ocr/rate-limit";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";

/** Обзор: счётчики основных сущностей. */
export default async function AdminHome() {
  const [users, subs, products, ingredients, leads, feedback, clicks] =
    await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { plan: "pro" } }),
      prisma.product.count(),
      prisma.ingredient.count(),
      prisma.brandLead.count(),
      prisma.feedback.count(),
      prisma.partnerClick.count(),
    ]);

  const stats = [
    { label: "Пользователей", value: users, href: "/admin/users" },
    { label: "Pro-подписок", value: subs, href: "/admin/users" },
    { label: "Продуктов", value: products, href: "/admin/products" },
    { label: "Ингредиентов", value: ingredients, href: "/admin/ingredients" },
    { label: "Заявок брендов", value: leads, href: "/admin/leads" },
    { label: "Нераспознанных токенов", value: feedback, href: "/admin/feedback" },
    { label: "Партнёрских кликов", value: clicks, href: "/admin/analytics" },
  ];

  const aiUsage = getDailyUsage(AI_DAILY_COUNTER_KEY);
  const ocrUsage = getDailyUsage(OCR_DAILY_COUNTER_KEY);

  // Токены ИИ-резюме: сегодня (с 00:00 МСК) и за 30 дней. Сумма по кэшу AiSummary:
  // уникальные обращения к ИИ, каждое с фактическим расходом токенов.
  const todayStart = new Date(mskDayStart());
  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [todayAgg, monthAgg] = await Promise.all([
    prisma.aiSummary.aggregate({
      _sum: { inputTokens: true, outputTokens: true },
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.aiSummary.aggregate({
      _sum: { inputTokens: true, outputTokens: true },
      where: { createdAt: { gte: monthStart } },
    }),
  ]);
  const todayTokens = (todayAgg._sum.inputTokens ?? 0) + (todayAgg._sum.outputTokens ?? 0);
  const monthTokens = (monthAgg._sum.inputTokens ?? 0) + (monthAgg._sum.outputTokens ?? 0);
  const monthCost = geminiCostUsd(
    monthAgg._sum.inputTokens ?? 0,
    monthAgg._sum.outputTokens ?? 0,
  );
  const resetTime = aiUsage.resetsAt.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });

  // Разборы: журнал Analysis. «Стены» = blocked + teaser (гостю не показали полный разбор).
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    todayTotal,
    todayShown,
    todayWalls,
    weekTotal,
    weekShown,
    weekWalls,
    weekUsers,
    signups7d,
    convertedRows,
    unmatchedRows,
    topProducts,
  ] = await Promise.all([
    prisma.analysis.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.analysis.count({ where: { createdAt: { gte: todayStart }, status: "shown" } }),
    prisma.analysis.count({
      where: { createdAt: { gte: todayStart }, status: { in: ["blocked", "teaser"] } },
    }),
    prisma.analysis.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.analysis.count({ where: { createdAt: { gte: weekAgo }, status: "shown" } }),
    prisma.analysis.count({
      where: { createdAt: { gte: weekAgo }, status: { in: ["blocked", "teaser"] } },
    }),
    prisma.analysis.findMany({
      where: { createdAt: { gte: weekAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    // Конверсия «стена → регистрация» (оценка): пользователи недели, у которых первая
    // запись shown появилась в течение 30 минут после создания аккаунта. sign_up_source
    // живёт только в Mixpanel, поэтому считаем грубо.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM "User" u
      WHERE u."createdAt" >= ${weekAgo}
        AND EXISTS (
          SELECT 1 FROM "Analysis" a
          WHERE a."userId" = u.id AND a.status = 'shown'
            AND a."createdAt" <= u."createdAt" + interval '30 minutes'
        )`,
    // Топ-20 нераспознанных токенов за 30 дней
    prisma.$queryRaw<Array<{ token: string; count: bigint }>>`
      SELECT t AS token, count(*) AS count
      FROM "Analysis" a, unnest(a."unmatched") AS u(t)
      WHERE a."createdAt" >= ${monthAgo}
      GROUP BY t ORDER BY count DESC LIMIT 20`,
    prisma.analysis.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, createdAt: { gte: monthAgo } },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 20,
    }),
  ]);
  const converted7d = Number(convertedRows[0]?.count ?? 0);
  const conversion =
    weekWalls > 0 ? Math.round((converted7d / weekWalls) * 1000) / 10 : null;
  const productIds = topProducts.map((p) => p.productId).filter((id): id is string => id !== null);
  const topProductsMeta = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, brand: true, name: true, slug: true },
  });
  const productMetaById = new Map(topProductsMeta.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <GlassCard className="p-6 transition-shadow hover:shadow-glass">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="font-display text-[26px] font-bold text-brand">
                {s.value}
              </p>
            </GlassCard>
          </Link>
        ))}
      </div>

      <GlassCard className="p-6">
        <h2 className="font-display text-lg font-semibold">Бюджет ИИ сегодня</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Сброс в {resetTime} МСК. Ответы из кэша и всё, что не тратит токены, лимиты не расходуют.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">ИИ-резюме (новые обращения)</dt>
            <dd className="font-semibold">
              {aiUsage.used} / {aiDailyLimit()}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({aiPerIpDailyLimit()} на IP в сутки, 30 в час)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">OCR (фото составов)</dt>
            <dd className="font-semibold">
              {ocrUsage.used} / {ocrDailyLimit()}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({ocrPerIpDailyLimit()} на IP в сутки, 20 в час)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Токены ИИ-резюме сегодня</dt>
            <dd className="font-semibold">{todayTokens.toLocaleString("ru-RU")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Токены за 30 дней</dt>
            <dd className="font-semibold">
              {monthTokens.toLocaleString("ru-RU")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ≈ ${monthCost.toFixed(2)} (Gemini)
              </span>
            </dd>
          </div>
        </dl>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display text-lg font-semibold">Разборы</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Журнал Analysis. «Стены» — гостю показали заглушку (blocked + teaser).
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Сегодня: всего / полных / стен</dt>
            <dd className="font-semibold">
              {todayTotal} / {todayShown} / {todayWalls}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">7 дней: всего / полных / стен</dt>
            <dd className="font-semibold">
              {weekTotal} / {weekShown} / {weekWalls}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Уникальных вошедших за 7 дней</dt>
            <dd className="font-semibold">{weekUsers.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Регистраций за 7 дней</dt>
            <dd className="font-semibold">{signups7d}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">
              Конверсия «стена → регистрация» за 7 дней (оценка)
            </dt>
            <dd className="font-semibold">
              {conversion === null ? "—" : `${conversion}%`}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {converted7d} регистраций после стены из {weekWalls} стен; sign_up_source живёт
                только в Mixpanel, считаем по первому разбору в течение 30 минут после регистрации
              </span>
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Топ-20 нераспознанных токенов за 30 дней</h3>
            {unmatchedRows.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Пока пусто.</p>
            ) : (
              <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                {unmatchedRows.map((r, i) => (
                  <li key={r.token} className="flex justify-between gap-3">
                    <span>
                      {i + 1}. {r.token}
                    </span>
                    <span className="font-semibold text-foreground">{Number(r.count)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Топ-20 продуктов по разборам за 30 дней</h3>
            {topProducts.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Пока пусто.</p>
            ) : (
              <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                {topProducts.map((p, i) => {
                  const meta = p.productId ? productMetaById.get(p.productId) : undefined;
                  return (
                    <li key={p.productId ?? i} className="flex justify-between gap-3">
                      <span>
                        {i + 1}.{" "}
                        {meta ? (
                          <Link
                            href={`/products/${meta.slug}`}
                            className="text-brand hover:underline"
                          >
                            {meta.brand} {meta.name}
                          </Link>
                        ) : (
                          "продукт удалён"
                        )}
                      </span>
                      <span className="font-semibold text-foreground">
                        {p._count.productId}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
