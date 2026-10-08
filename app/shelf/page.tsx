import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";

import { getSession } from "@/lib/auth";
import { FREE_REACTIONS_LIMIT, FREE_SHELF_LIMIT } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { loadShelfView } from "@/lib/shelf/view";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { SignInForm } from "@/components/sign-in-form";
import { ShelfTabs } from "@/components/shelf-tabs";

export const metadata: Metadata = { title: "Моя полка" };
export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const session = await getSession();

  if (!session?.user) {
    return (
      <main className="bg-gradient-hero min-h-screen">
        <Container className="flex min-h-[70vh] items-center justify-center py-20">
          <GlassCard className="w-full max-w-lg p-8 sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
              <Lock className="h-5 w-5 text-brand" />
            </span>
            <h1 className="font-display mt-4 text-[28px] font-semibold leading-tight">Моя полка</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Все ваши средства в одном месте: проверка совместимости, режим
              утро / вечер, поиск дублей, дневник реакций и напоминания.
              Войдите по ссылке из письма — пароль не нужен.
            </p>
            <ul className="mt-5 space-y-2 rounded-xl bg-ink-wash p-4 text-sm text-ink-soft">
              <li>
                <span className="font-semibold text-foreground">Бесплатно:</span> до{" "}
                {FREE_SHELF_LIMIT} средств на полке и проверка их совместимости,
                последние {FREE_REACTIONS_LIMIT} реакций, напоминания.
              </li>
              <li>
                <span className="font-semibold text-foreground">Pro:</span> полка без лимита,
                совместимость всей полки, режим, поиск дублей, вся история реакций, экспорт в PDF.
              </li>
            </ul>
            <div className="mt-6">
              <SignInForm cta="Собрать полку бесплатно" />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link href="/pricing" className="font-medium text-brand hover:underline">
                Сравнить тарифы
              </Link>
            </p>
          </GlassCard>
        </Container>
      </main>
    );
  }

  const profile = await prisma.skinProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding");

  const {
    plan,
    items: view,
    pairs,
    duplicates,
    routine,
    reactions,
    reactionsLimited,
    reminders,
  } = await loadShelfView(session.user.id, profile);

  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="py-12">
        <ShelfTabs
          items={view}
          pairs={pairs}
          duplicates={duplicates}
          routine={routine}
          reactions={reactions}
          reminders={reminders}
          isPro={plan.isPro}
          reactionsLimited={reactionsLimited}
        />
        {plan.isPro ? (
          <GlassCard className="mt-8 flex items-center gap-3 p-5">
            <Sparkles className="h-5 w-5 shrink-0 text-amber" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Pro активен
                {plan.currentPeriodEnd
                  ? ` до ${plan.currentPeriodEnd.toLocaleDateString("ru-RU")}`
                  : ""}
                :
              </span>{" "}
              совместимость всей полки, поиск дублей, режим, полная история реакций и{" "}
              <Link href="/shelf/export" className="font-medium text-brand hover:underline">
                экспорт полки в PDF
              </Link>
              .
            </p>
          </GlassCard>
        ) : (
          <GlassCard className="mt-8 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-amber" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Pro открывает:
                </span>{" "}
                полку без лимита и совместимость всех средств, поиск дублей,
                режим утро/вечер, полную историю реакций и экспорт полки в PDF.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/pricing">Перейти на Pro</Link>
            </Button>
          </GlassCard>
        )}
      </Container>
    </main>
  );
}
