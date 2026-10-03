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
import { DeleteSkinProfileButton } from "@/components/delete-skin-profile-button";
import { labelFor, migrateLegacy } from "@/lib/skin-profile/options";

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
        <h1 className="font-display text-[28px] font-semibold leading-tight">Профиль</h1>

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Профиль кожи</h2>
              <Button asChild size="sm" variant="outline">
                <Link href="/onboarding">Изменить</Link>
              </Button>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
              <dt className="text-ink-muted">Тип кожи</dt>
              <dd className="font-medium">
                {profile.skinType === "sensitive"
                  ? "Не указан — обновите профиль"
                  : labelFor(profile.skinType)}
                {profile.sensitive || profile.skinType === "sensitive"
                  ? ", склонна к чувствительности"
                  : ""}
              </dd>
              <dt className="text-ink-muted">Задачи</dt>
              <dd className="font-medium">
                {profile.concerns.length > 0
                  ? migrateLegacy(profile.concerns).map(labelFor).join(", ")
                  : "Не выбраны"}
              </dd>
              <dt className="text-ink-muted">Особые периоды</dt>
              <dd className="font-medium">
                {profile.conditions.length > 0
                  ? profile.conditions.map(labelFor).join(", ")
                  : "Нет"}
              </dd>
              <dt className="text-ink-muted">Аллергия</dt>
              <dd className="font-medium">
                {profile.allergies.length > 0
                  ? migrateLegacy(profile.allergies).map(labelFor).join(", ")
                  : "Нет"}
              </dd>
              <dt className="text-ink-muted">Раздражение</dt>
              <dd className="font-medium">
                {profile.intolerances.length > 0
                  ? profile.intolerances.map(labelFor).join(", ")
                  : "Нет"}
              </dd>
            </dl>
            {!profile.healthConsentAt ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Мы обновили анкету: добавили вопросы об особых периодах и реакциях кожи.{" "}
                <Link href="/onboarding" className="font-semibold underline underline-offset-4">
                  Дополнить профиль
                </Link>
              </p>
            ) : null}
            <div className="mt-4 border-t border-ink-hair pt-3">
              <DeleteSkinProfileButton />
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Профиль кожи</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Не заполнен — без него полка не учтёт тип кожи и аллергии.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/onboarding">Заполнить за минуту</Link>
            </Button>
          </GlassCard>
        )}

        <GlassCard className="p-6">
          <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
            <MousePointerClick className="h-5 w-5 text-brand" />
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
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2.5 text-sm"
                >
                  <Link
                    href={`/products/${c.product.slug}`}
                    className="font-medium text-brand hover:underline"
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
