import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

interface ComingSoonProps {
  title: string;
  description: string;
}

/** Заглушка маршрута: плоская карточка с заголовком и «скоро». */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <main className="bg-gradient-hero min-h-screen">
      <Container className="flex min-h-screen items-center justify-center py-20">
        <GlassCard className="max-w-lg p-10 text-center">
          <h1 className="font-display text-[28px] font-semibold leading-tight">{title}</h1>
          <p className="mt-4 text-muted-foreground">{description}</p>
          <span className="eyebrow mt-6 mb-0">Скоро</span>
        </GlassCard>
      </Container>
    </main>
  );
}
