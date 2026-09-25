import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

interface ComingSoonProps {
  title: string;
  description: string;
}

/** Заглушка маршрута: стеклянная карточка с заголовком и «скоро». */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="flex min-h-screen items-center justify-center py-20">
        <GlassCard className="max-w-lg p-10 text-center">
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-4 text-muted-foreground">{description}</p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-lavender-400">
            Скоро
          </p>
        </GlassCard>
      </Container>
    </main>
  );
}
