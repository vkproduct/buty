"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GOALS, reachGoal } from "@/lib/analytics/metrika";
import { setPendingPhoto } from "@/lib/pending-photo";

interface AnalyzeFormProps {
  /** id поля — чтобы на странице могли жить две формы */
  id?: string;
  rows?: number;
}

/**
 * Форма вставки состава: отправляет текст на /analyze.
 * Кнопка «Загрузить фото» выбирает снимок здесь же и переводит на /analyze,
 * где распознавание запускается автоматически.
 */
export function AnalyzeForm({ id = "inci", rows = 5 }: AnalyzeFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim()) reachGoal(GOALS.analyzeSubmit);
    const query = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : "";
    router.push(`/analyze${query}`);
  }

  function handlePhoto(file: File) {
    reachGoal(GOALS.analyzePhoto);
    setPendingPhoto(file);
    router.push("/analyze?photo=1");
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
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
      >
        <Camera className="h-4 w-4" />
        Загрузить фото состава
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Фото состава"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhoto(file);
          e.target.value = "";
        }}
      />
    </form>
  );
}
