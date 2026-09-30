"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GOALS, reachGoal } from "@/lib/analytics/metrika";

interface AnalyzeFormProps {
  /** id поля — чтобы на странице могли жить две формы */
  id?: string;
  rows?: number;
}

/** Форма вставки состава: отправляет текст на /analyze. */
export function AnalyzeForm({ id = "inci", rows = 5 }: AnalyzeFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim()) reachGoal(GOALS.analyzeSubmit);
    const query = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : "";
    router.push(`/analyze${query}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <label htmlFor={id} className="sr-only">
        Состав средства (INCI)
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        placeholder="Вставьте состав сюда. Например: Aqua, Niacinamide, Glycerin, Panthenol…"
        className="w-full resize-none rounded-xl border border-input bg-white px-4 py-3.5 text-[15px] leading-relaxed text-foreground transition-shadow placeholder:text-ink-muted focus-visible:border-foreground focus-visible:shadow-[0_0_0_1px_#222] focus-visible:outline-none"
      />
      <Button type="submit" size="lg" className="w-full">
        Разобрать состав
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
