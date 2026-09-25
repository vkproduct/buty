import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MousePointerClick, Sparkles } from "lucide-react";

import { getSession } from "@/lib/auth";
import { getUserPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

export const metadata: Metadata = { title: "Профиль" };
export const dynamic = "force-dynamic";

/** Профиль: тариф, косметический профиль и история партнёрских кликов. */
export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const [plan, profile, clicks] = await Promise.all([
    getUserPlan(session.user.id),
    prisma.skinProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.partnerClick.findMany({
      where: { userId: session.user.id },
      include: { product: { select: { name: true, brand: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <main className="bg-gradient-hero min-h-screen py-12">
      <Container className="max-w-3xl space-y-6">
        <h1 className="font-display text-3xl font-bold">Профиль</h1>

        <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              Тариф:{" "}
              {plan.isPro ? (
                <Badge>
                  <Sparkles className="mr-1 h-3 w-3" /> Pro
                  {plan.currentPeriodEnd
                    ? ` до ${plan.currentPeriodEnd.toLocaleDateString("ru-RU")}`
                    : ""}
                </Badge>
              ) : (
                <Badge variant="outline">Free</Badge>
              )}
            </p>
          </div>
          {!plan.isPro ? (
            <Button asChild size="sm">
              <Link href="/pricing">Перейти на Pro</Link>
            </Button>
          ) : null}
        </GlassCard>

        {profile ? (
          <GlassCard className="p-6">
            <h2 className="font-display text-lg font-semibold">Профиль кожи</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Тип: {profile.skinType}
              {profile.concerns.length > 0
                ? ` · Задачи: ${profile.concerns.join(", ")}`
                : ""}
              {profile.allergies.length > 0
                ? ` · Аллергии: ${profile.allergies.join(", ")}`
                : ""}
            </p>
          </GlassCard>
        ) : null}

        <GlassCard className="p-6">
          <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
            <MousePointerClick className="h-5 w-5 text-lavender" />
            История переходов «Где купить»
          </h2>
          {clicks.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Пока пусто — переходы по кнопкам «Где купить» появятся здесь.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {clicks.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/50 px-4 py-2.5 text-sm"
                >
                  <Link
                    href={`/products/${c.product.slug}`}
                    className="font-medium text-lavender hover:underline"
                  >
                    {c.product.brand} {c.product.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {c.source} · {new Date(c.createdAt).toLocaleString("ru-RU")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </Container>
    </main>
  );
}
