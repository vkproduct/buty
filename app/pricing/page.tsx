import type { Metadata } from "next";
import { Suspense } from "react";

import { getSession } from "@/lib/auth";
import { getUserPlan } from "@/lib/billing";
import { PricingClient } from "@/components/pricing-client";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Тарифы" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const session = await getSession();
  const plan = session?.user
    ? await getUserPlan(session.user.id)
    : { isPro: false, currentPeriodEnd: null };

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold">Тарифы</h1>
          <p className="mt-4 text-muted-foreground">
            Разбор составов и подбор ухода — бесплатно всегда. Pro открывает
            «Мою полку» целиком: совместимость активов, режим, полную историю
            реакций и экспорт.
          </p>
        </div>
        <div className="mt-12">
          <Suspense>
            <PricingClient
              isLoggedIn={Boolean(session?.user)}
              isPro={plan.isPro}
              currentPeriodEnd={
                plan.currentPeriodEnd ? plan.currentPeriodEnd.toISOString() : null
              }
            />
          </Suspense>
        </div>
      </Container>
    </main>
  );
}
