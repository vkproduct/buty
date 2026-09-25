import type { Metadata } from "next";

import { GlassCard } from "@/components/ui/glass-card";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Проверьте почту" };

export default function VerifyPage() {
  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="flex min-h-screen items-center justify-center py-20">
        <GlassCard className="max-w-md p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Проверьте почту</h1>
          <p className="mt-4 text-muted-foreground">
            Мы отправили ссылку для входа. Перейдите по ней, чтобы попасть в
            «Мою полку».
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            В dev-режиме ссылка выводится в консоль сервера.
          </p>
        </GlassCard>
      </Container>
    </main>
  );
}
