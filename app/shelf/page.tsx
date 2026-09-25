import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";

import { getSession } from "@/lib/auth";
import { analyzeText } from "@/lib/analysis/analyze";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { ShelfClient, type ShelfItemView } from "@/components/shelf-client";

export const metadata: Metadata = { title: "Моя полка" };
export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const session = await getSession();

  if (!session?.user) {
    return (
      <main className="bg-gradient-hero min-h-screen">
        <Container className="flex min-h-[70vh] items-center justify-center py-20">
          <GlassCard className="max-w-lg p-10 text-center">
            <Lock className="mx-auto h-8 w-8 text-lavender" />
            <h1 className="font-display mt-4 text-3xl font-bold">Моя полка</h1>
            <p className="mt-4 text-muted-foreground">
              Коллекция ваших средств с разбором составов. Войдите по ссылке из
              письма, чтобы собрать свою полку.
            </p>
            <Button asChild className="mt-6">
              <Link href="/auth/signin">Войти</Link>
            </Button>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-lavender-400">
              <Sparkles className="h-4 w-4" /> Pro-функции скоро
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Проверка совместимости активов, порядок нанесения, поиск дублей,
              история реакций и напоминания — в Pro-подписке.
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

  const items = await prisma.shelfItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          ingredients: {
            include: { ingredient: true },
            orderBy: { position: "asc" },
          },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  const view: ShelfItemView[] = await Promise.all(
    items.map(async (item) => {
      if (item.product) {
        return {
          id: item.id,
          status: item.status,
          addedAt: item.addedAt.toISOString(),
          title: item.product.name,
          subtitle: item.product.brand,
          slug: item.product.slug,
          ingredientNames: item.product.ingredients.map(
            (pi) => pi.ingredient.displayName,
          ),
        };
      }
      const analysis = item.customInci ? await analyzeText(item.customInci) : null;
      return {
        id: item.id,
        status: item.status,
        addedAt: item.addedAt.toISOString(),
        title: item.customName ?? "Своё средство",
        subtitle: "Своё средство",
        slug: null,
        ingredientNames:
          analysis?.ingredients.map((i) => i.displayName) ?? [],
      };
    }),
  );

  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="py-12">
        <ShelfClient items={view} />
        <GlassCard className="mt-8 flex items-center gap-3 p-5">
          <Sparkles className="h-5 w-5 shrink-0 text-amber" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              Pro-функции скоро:
            </span>{" "}
            проверка совместимости активов между средствами полки, порядок
            нанесения, поиск дублей, история реакций кожи и напоминания.
          </p>
        </GlassCard>
      </Container>
    </main>
  );
}
