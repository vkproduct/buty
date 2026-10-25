import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadShelfView } from "@/lib/shelf/view";
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
      <main className="min-h-screen bg-ink-wash">
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
                <span className="font-semibold text-foreground">Всё бесплатно:</span> полка без
                лимита, совместимость, режим утро/вечер, поиск дублей, дневник реакций,
                напоминания и экспорт в PDF.
              </li>
            </ul>
            <div className="mt-6">
              <SignInForm cta="Собрать полку бесплатно" />
            </div>
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
    items: view,
    pairs,
    duplicates,
    routine,
    reactions,
    reminders,
  } = await loadShelfView(session.user.id, profile);

  return (
    <main className="min-h-screen bg-ink-wash">
      <Container className="py-12">
        <ShelfTabs
          items={view}
          pairs={pairs}
          duplicates={duplicates}
          routine={routine}
          reactions={reactions}
          reminders={reminders}
        />
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/shelf/export" className="font-medium text-brand hover:underline">
            Скачать полку в PDF
          </Link>
        </p>
      </Container>
    </main>
  );
}
