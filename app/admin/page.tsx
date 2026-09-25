import Link from "next/link";

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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <Link key={s.label} href={s.href}>
          <GlassCard className="p-6 transition-shadow hover:shadow-glass">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl font-bold text-lavender">
              {s.value}
            </p>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
}
