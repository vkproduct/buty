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
    </div>
  );
}
