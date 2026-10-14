import type { Metadata } from "next";
import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Проверьте почту" };

const isDev = process.env.NODE_ENV !== "production";

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
            Письмо приходит в течение пары минут. Если его нет, проверьте папку «Спам»
            или{" "}
            <Link href="/auth/signin" className="underline underline-offset-4">
              введите email ещё раз
            </Link>
            .
          </p>
          {isDev ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Dev-режим: ссылка выводится в консоль сервера.
            </p>
          ) : null}
        </GlassCard>
      </Container>
    </main>
  );
}
