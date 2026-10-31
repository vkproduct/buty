import type { Metadata } from "next";
import { Suspense } from "react";

import { GlassCard } from "@/components/ui/glass-card";
import { Container } from "@/components/ui/container";
import { SignInClient } from "./signin-client";

export const metadata: Metadata = { title: "Вход" };

export default function SignInPage() {
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
