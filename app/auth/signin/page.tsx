import type { Metadata } from "next";

import { GlassCard } from "@/components/ui/glass-card";
import { Container } from "@/components/ui/container";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = { title: "Вход" };

export default function SignInPage() {
  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="flex min-h-screen items-center justify-center py-20">
        <GlassCard className="w-full max-w-md p-8">
          <h1 className="font-display text-2xl font-bold">Вход в Buty.ru</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Пришлём ссылку для входа на email — без пароля.
          </p>
          <div className="mt-6">
            <SignInForm />
          </div>
        </GlassCard>
      </Container>
    </main>
  );
}
