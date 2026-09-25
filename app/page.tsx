import Link from "next/link";

import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalyzeForm } from "@/components/analyze-form";
import { FlaskConical, SearchCheck, ShieldAlert, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: SearchCheck,
    title: "Вставьте состав",
    text: "Скопируйте INCI-список с упаковки или карточки товара на маркетплейсе — текстом или фото.",
  },
  {
    icon: FlaskConical,
    title: "Получите разбор",
    text: "Каждый ингредиент: функция, рабочая концентрация, уровень доказательности и конфликты с другими активами.",
  },
  {
    icon: ShieldAlert,
    title: "Соберите полку",
    text: "Добавляйте средства в «Мою полку» — сервис проверит совместимость и подскажет порядок нанесения.",
  },
];

const EXAMPLE_INGREDIENTS = [
  {
    name: "Niacinamide",
    role: "Витамин B3: выравнивает тон, регулирует себум, укрепляет барьер кожи.",
    concentration: "2–5%",
    evidence: "Высокая",
    variant: "lavender" as const,
  },
  {
    name: "Retinol",
    role: "Витамин A: стимулирует обновление, работает с фотостарением и акне.",
    concentration: "0,1–1%",
    evidence: "Высокая",
    variant: "coral" as const,
  },
  {
    name: "AHA-кислоты",
    role: "Поверхностный пилинг: убирают ороговевший слой, выравнивают текстуру.",
    concentration: "5–10%",
    evidence: "Средняя",
    variant: "amber" as const,
  },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-hero relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-lavender/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-coral/20 blur-3xl"
        />
        <Container className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-6 bg-white/50">
              <Sparkles className="mr-1 h-3 w-3" />
              Доказательный уход, а не маркетинг
            </Badge>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Что на самом деле в вашей косметике?
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Разбираем составы по научным данным: что работает, в какой
              концентрации и что нельзя смешивать.
            </p>
          </div>
          <GlassCard className="mx-auto mt-10 max-w-2xl p-6">
            <AnalyzeForm />
          </GlassCard>
        </Container>
      </section>

      {/* Как это работает */}
      <section className="py-20">
        <Container>
          <h2 className="font-display text-center text-3xl font-bold">
            Как это работает
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <GlassCard key={step.title} className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender/10 text-lavender">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold text-lavender-500">
                  Шаг {i + 1}
                </div>
                <h3 className="font-display mt-1 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </GlassCard>
            ))}
          </div>
        </Container>
      </section>

      {/* Наука, а не маркетинг */}
      <section className="bg-gradient-lavender py-20 text-white">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold">
              Наука, а не маркетинг
            </h2>
            <p className="mt-4 text-white/80">
              «Натуральное» не значит «безопасное», а «химия» — не значит
              «вредное». Мы оцениваем ингредиенты по уровню доказательности
              эффективности: от данных клинических исследований до
              маркетинговых заявлений без подтверждений.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              "Уровень доказательности по каждому активу",
              "Рабочие концентрации из исследований",
              "Проверка конфликтов между активами",
            ].map((item) => (
              <GlassCard
                key={item}
                className="border-white/30 bg-white/10 p-6 text-center shadow-none backdrop-blur-xl"
              >
                <p className="font-medium">{item}</p>
              </GlassCard>
            ))}
          </div>
        </Container>
      </section>

      {/* Пример разбора */}
      <section className="py-20">
        <Container>
          <h2 className="font-display text-center text-3xl font-bold">
            Как выглядит разбор
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Каждый ингредиент — с функцией, концентрацией и уровнем
            доказательности. Пример ниже — статичная демонстрация.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {EXAMPLE_INGREDIENTS.map((ing) => (
              <GlassCard key={ing.name} className="p-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold">{ing.name}</h3>
                  <Badge variant={ing.variant}>доказательность: {ing.evidence}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{ing.role}</p>
                <div className="mt-4 border-t border-lavender/10 pt-3 text-sm">
                  Рабочая концентрация:{" "}
                  <span className="font-semibold text-lavender-600">
                    {ing.concentration}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA на Мою полку */}
      <section className="bg-gradient-warm py-20 text-white">
        <Container className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Вся ваша полка — под контролем
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            «Моя полка» собирает ваши средства в одном месте: проверка
            совместимости активов, порядок нанесения, поиск дублей в составах
            и напоминания об использовании.
          </p>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="mt-8"
          >
            <Link href="/shelf">Попробовать «Мою полку»</Link>
          </Button>
        </Container>
      </section>

      {/* Футер */}
      <footer className="border-t border-lavender/10 bg-background py-10">
        <Container className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="font-display text-lg font-bold text-lavender">
            Buty.ru
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/analyze" className="hover:text-lavender">
              Разбор состава
            </Link>
            <Link href="/shelf" className="hover:text-lavender">
              Моя полка
            </Link>
            <Link href="/pricing" className="hover:text-lavender">
              Тарифы
            </Link>
            <Link href="/for-brands" className="hover:text-lavender">
              Брендам
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © 2026 Buty.ru. Информация не заменяет консультацию врача.
          </p>
        </Container>
      </footer>
    </main>
  );
}
