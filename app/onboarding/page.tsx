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
      <Container className="py-8 sm:py-16">
        <GlassCard className="mx-auto max-w-2xl p-6 sm:p-10">
          <OnboardingForm
            initial={
              profile
                ? {
                    skinType: profile.skinType,
                    sensitive: profile.sensitive,
                    concerns: profile.concerns,
                    conditions: profile.conditions,
                    allergies: profile.allergies,
                    intolerances: profile.intolerances,
                    complete: Boolean(profile.healthConsentAt),
                  }
                : null
            }
          />
        </GlassCard>
      </Container>
    </main>
  );
}
