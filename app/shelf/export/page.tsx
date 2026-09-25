import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { analyzeText } from "@/lib/analysis/analyze";
import { getUserPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { buildRoutine } from "@/lib/shelf/compatibility";
import { loadShelfProducts } from "@/lib/shelf/data";
import { AutoPrint } from "@/components/auto-print";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Экспорт полки" };
export const dynamic = "force-dynamic";

/**
 * /shelf/export — печатная версия полки для сохранения в PDF.
 * Только Pro: free-пользователи отправляются на /pricing.
 */
export default async function ShelfExportPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const plan = await getUserPlan(session.user.id);
  if (!plan.isPro) redirect("/pricing");

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

  const rows = await Promise.all(
    items.map(async (item) => {
      if (item.product) {
        return {
          id: item.id,
          title: item.product.name,
          subtitle: item.product.brand,
          ingredients: item.product.ingredients.map(
            (pi) => pi.ingredient.displayName,
          ),
        };
      }
      const analysis = item.customInci
        ? await analyzeText(item.customInci)
        : null;
      return {
        id: item.id,
        title: item.customName ?? "Своё средство",
        subtitle: "Своё средство",
        ingredients: analysis?.ingredients.map((i) => i.displayName) ?? [],
      };
    }),
  );

  const products = await loadShelfProducts(session.user.id, true);
  const routine = buildRoutine(products, profile.skinType);

  const step = (s: { order: number; title: string; why: string }) => (
    <li key={`${s.order}-${s.title}`} className="text-sm">
      {s.order}. {s.title} — <span className="text-gray-500">{s.why}</span>
    </li>
  );

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-gray-900 print:px-0">
      <AutoPrint />
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href="/shelf">← Назад на полку</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          В открывшемся диалоге выберите «Сохранить как PDF».
        </p>
      </div>

      <h1 className="font-display text-2xl font-bold">
        Моя полка — Buty.ru
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {session.user.email} · {new Date().toLocaleDateString("ru-RU")}
      </p>

      <h2 className="mt-8 text-lg font-semibold">
        Средства ({rows.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold">
              {r.title} <span className="font-normal text-gray-500">· {r.subtitle}</span>
            </p>
            {r.ingredients.length > 0 ? (
              <p className="mt-1 text-xs text-gray-500">
                {r.ingredients.join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Режим</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Утро</h3>
          <ul className="mt-2 space-y-1">{routine.morning.map(step)}</ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Вечер</h3>
          <ul className="mt-2 space-y-1">{routine.evening.map(step)}</ul>
        </div>
      </div>
      {routine.notes.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-500">
          {routine.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
