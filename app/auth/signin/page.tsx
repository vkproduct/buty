import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { GlassCard } from "@/components/ui/glass-card";
import { Container } from "@/components/ui/container";
import { getSession } from "@/lib/auth";
import { SignInClient } from "./signin-client";

export const metadata: Metadata = { title: "Вход" };
export const dynamic = "force-dynamic";

/** Безопасный относительный путь для редиректа (открытый редирект запрещён). */
function safeCallback(raw: string | string[] | undefined): string {
  const value = typeof raw === "string" ? raw : null;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/shelf";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string | string[] };
}) {
  // Уже вошёл (например, только что кодом в окне разбора) — форма входа не нужна
  const session = await getSession();
  if (session?.user) redirect(safeCallback(searchParams.callbackUrl));

  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="flex min-h-screen items-center justify-center py-20">
        <GlassCard className="w-full max-w-md p-8">
          <h1 className="font-display text-2xl font-bold">Вход в Buty.app</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Пришлём 6-значный код на email — без пароля.
          </p>
          <div className="mt-6">
            <Suspense>
              <SignInClient />
            </Suspense>
          </div>
        </GlassCard>
      </Container>
    </main>
  );
}
