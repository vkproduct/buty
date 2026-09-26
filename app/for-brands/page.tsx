import type { Metadata } from "next";
import { BarChart3, FlaskConical, Store } from "lucide-react";

import { BrandLeadForm } from "@/components/brand-lead-form";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";

export const metadata: Metadata = {
  title: "Брендам",
  description:
    "Buty.app для брендов: размещение в каталоге, научный разбор составов и аналитика интереса к продуктам.",
};

const OFFERS = [
  {
    icon: Store,
    title: "Размещение в каталоге",
    text: "Карточки продуктов с полным разбором состава и кнопками «Где купить» на WB, Ozon и Золотое Яблоко.",
  },
  {
    icon: FlaskConical,
    title: "Научный разбор формул",
    text: "Доказательный подход: функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности.",
  },
  {
    icon: BarChart3,
    title: "Аналитика интереса",
    text: "Переходы по партнёрским ссылкам и интерес к продуктам — понятная картина спроса на ваши формулы.",
  },
];

export default function ForBrandsPage() {
  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <Container className="max-w-4xl">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-bold">Buty.app для брендов</h1>
          <p className="mt-4 text-muted-foreground">
            Мы разбираем составы косметики с научным дерматологическим подходом
            для аудитории, которая читает INCI-списки перед покупкой. Покажите
            свои формулы тем, кто умеет их ценить.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {OFFERS.map(({ icon: Icon, title, text }) => (
            <GlassCard key={title} className="p-6">
              <Icon className="h-6 w-6 text-lavender" />
              <h2 className="font-display mt-3 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="mt-10 p-8">
          <h2 className="font-display text-2xl font-bold">Оставить заявку</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Расскажите о бренде — вернёмся с условиями размещения.
          </p>
          <div className="mt-6">
            <BrandLeadForm />
          </div>
        </GlassCard>
      </Container>
    </main>
  );
}
