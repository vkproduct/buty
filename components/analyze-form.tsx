"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Форма вставки состава: мок-редакция, отправляет текст на /analyze. */
export function AnalyzeForm() {
  const router = useRouter();
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : "";
    router.push(`/analyze${query}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Вставьте состав сюда. Например: Aqua, Niacinamide, Glycerin, Panthenol…"
        className="w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm backdrop-blur transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
      />
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Разобрать состав
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
