import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata: Metadata = { title: "Профиль кожи" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  const profile = await prisma.skinProfile.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="py-16">
        <GlassCard className="mx-auto max-w-2xl p-8 sm:p-10">
          <h1 className="font-display text-3xl font-bold">Расскажите о коже</h1>
          <p className="mt-2 text-muted-foreground">
            Это поможет точнее подбирать уход и учитывать аллергии при разборе
            составов.
          </p>
          <div className="mt-8">
            <OnboardingForm
              initial={
                profile
                  ? {
                      skinType: profile.skinType,
                      concerns: profile.concerns,
                      allergies: profile.allergies,
                    }
                  : null
              }
            />
          </div>
        </GlassCard>
      </Container>
    </main>
  );
}
