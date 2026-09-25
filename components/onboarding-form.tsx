"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SKIN_TYPES = [
  { value: "dry", label: "Сухая" },
  { value: "oily", label: "Жирная" },
  { value: "combination", label: "Комбинированная" },
  { value: "normal", label: "Нормальная" },
  { value: "sensitive", label: "Чувствительная" },
] as const;

const CONCERNS = [
  "Акне и воспаления",
  "Пигментация",
  "Морщины и фотостарение",
  "Обезвоженность",
  "Покраснения и купероз",
  "Чёрные точки и поры",
  "Неровный тон",
  "Атопичность",
];

const ALLERGIES = [
  "Отдушки / парфюмерные композиции",
  "Эфирные масла",
  "Химические SPF-фильтры",
  "Консерванты (феноксиэтанол, MI/MCI)",
  "Ланолин",
  "Ниацинамид",
];

interface OnboardingFormProps {
  initial?: { skinType: string; concerns: string[]; allergies: string[] } | null;
}

/** Форма онбординга: тип кожи, проблемы, аллергии → POST /api/skin-profile. */
export function OnboardingForm({ initial }: OnboardingFormProps) {
  const router = useRouter();
  const [skinType, setSkinType] = useState(initial?.skinType ?? "");
  const [concerns, setConcerns] = useState<string[]>(initial?.concerns ?? []);
  const [allergies, setAllergies] = useState<string[]>(initial?.allergies ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], set: (v: string[]) => void, item: string) {
    set(list.includes(item) ? list.filter((v) => v !== item) : [...list, item]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/skin-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skinType, concerns, allergies }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Не удалось сохранить профиль. Попробуйте ещё раз.");
      return;
    }
    router.push("/shelf");
    router.refresh();
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-4 py-2 text-sm transition-all",
      active
        ? "border-lavender bg-lavender/15 font-semibold text-lavender-700"
        : "border-white/60 bg-white/50 text-muted-foreground hover:bg-white/80",
    );

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section>
        <h2 className="font-display text-lg font-semibold">Тип кожи</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SKIN_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={chip(skinType === t.value)}
              onClick={() => setSkinType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Проблемы кожи</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONCERNS.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(concerns.includes(c))}
              onClick={() => toggle(concerns, setConcerns, c)}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">
          Аллергии и непереносимости
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALLERGIES.map((a) => (
            <button
              key={a}
              type="button"
              className={chip(allergies.includes(a))}
              onClick={() => toggle(allergies, setAllergies, a)}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={!skinType || pending}>
        {pending ? "Сохраняем…" : "Сохранить и перейти к полке"}
      </Button>
    </form>
  );
}
