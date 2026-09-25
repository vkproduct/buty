"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  FlaskConical,
  Loader2,
  MessageSquarePlus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import type {
  AnalysisResult,
  AnalyzedIngredient,
  ConflictInfo,
} from "@/lib/analysis/types";
import { getOcrProvider, OcrNotReadyError } from "@/lib/ocr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";

const EVIDENCE_LABEL: Record<string, { label: string; variant: "lavender" | "amber" | "coral" | "outline" }> = {
  STRONG: { label: "Сильная доказательность", variant: "lavender" },
  MODERATE: { label: "Умеренная доказательность", variant: "amber" },
  LIMITED: { label: "Ограниченная доказательность", variant: "coral" },
  ANECDOTAL: { label: "Без качественных данных", variant: "outline" },
};

const CATEGORY_LABEL: Record<string, string> = {
  active: "Актив",
  "uv-filter": "UV-фильтр",
  humectant: "Увлажнитель",
  barrier: "Барьерный компонент",
  antioxidant: "Антиоксидант",
  emollient: "Эмолент",
  botanical: "Растительный экстракт",
  soothing: "Успокаивающий",
  fragrance: "Отдушка",
  alcohol: "Спирт",
};

const SEVERITY_STYLE: Record<string, { label: string; variant: "coral" | "amber" | "default" }> = {
  high: { label: "Высокий риск", variant: "coral" },
  medium: { label: "Умеренный риск", variant: "amber" },
  low: { label: "Низкий риск", variant: "default" },
};

/** Страница разбора состава: форма ввода, результат анализа, заглушка OCR. */
export function AnalyzeView({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [ocrNotice, setOcrNotice] = useState(false);
  const [feedbackToken, setFeedbackToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoRan = useRef(false);

  async function runAnalysis(raw: string) {
    if (!raw.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка анализа");
      setResult(data as AnalysisResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось разобрать состав");
    } finally {
      setLoading(false);
    }
  }

  // Авто-запуск при переходе с лендинга через ?text=
  useEffect(() => {
    if (!autoRan.current && initialText.trim()) {
      autoRan.current = true;
      void runAnalysis(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePhoto(file: File) {
    try {
      const extracted = await getOcrProvider().extractText(file);
      setText(extracted);
    } catch (e) {
      if (e instanceof OcrNotReadyError) setOcrNotice(true);
      else setError("Не удалось обработать фото");
    }
  }

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <Container className="space-y-10">
        <div className="space-y-3 text-center">
          <Badge variant="lavender" className="mx-auto">
            <FlaskConical className="mr-1 h-3 w-3" /> Доказательный разбор
          </Badge>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Разбор состава
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Вставьте INCI-список — покажем функцию каждого ингредиента,
            типичную рабочую концентрацию, уровень доказательности и конфликты активов.
          </p>
        </div>

        <GlassCard className="space-y-4 p-6 sm:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAnalysis(text);
            }}
            className="space-y-4"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Вставьте состав сюда. Например: Aqua, Niacinamide, Glycerin, Panthenol…"
              className="w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm backdrop-blur transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={loading || !text.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {loading ? "Разбираем…" : "Разобрать"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Загрузить фото
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePhoto(file);
                  e.target.value = "";
                }}
              />
            </div>
          </form>
          {error && <p className="text-sm text-coral-700">{error}</p>}
        </GlassCard>

        {result && (
          <>
            <SummaryBlock result={result} />
            {result.conflicts.length > 0 && (
              <ConflictsBlock conflicts={result.conflicts} />
            )}
            {result.advice.length > 0 && <AdviceBlock advice={result.advice} />}

            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold">
                Ингредиенты ({result.ingredients.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {result.ingredients.map((ing) => (
                  <IngredientCard key={ing.id} ingredient={ing} />
                ))}
              </div>
            </section>

            {result.unmatched.length > 0 && (
              <UnmatchedBlock
                tokens={result.unmatched}
                onReport={(token) => setFeedbackToken(token)}
              />
            )}
          </>
        )}
      </Container>

      <Dialog open={ocrNotice} onOpenChange={setOcrNotice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузка фото</DialogTitle>
            <DialogDescription>
              OCR подключается на этапе интеграции. Пока вставьте состав текстом —
              его можно скопировать с карточки товара на маркетплейсе.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOcrNotice(false)}>Понятно</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackDialog
        token={feedbackToken}
        onClose={() => setFeedbackToken(null)}
      />
    </main>
  );
}

function SummaryBlock({ result }: { result: AnalysisResult }) {
  const items = [
    { label: "Распознано", value: `${result.summary.recognized} из ${result.summary.total}` },
    { label: "Активы", value: result.summary.actives },
    { label: "Отдушки", value: result.summary.fragrances },
    { label: "Спирты", value: result.summary.alcohols },
    { label: "SPF-фильтры", value: result.summary.spfFilters },
  ];
  return (
    <GlassCard className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="font-display text-2xl font-bold text-lavender-700">
            {item.value}
          </div>
          <div className="text-xs text-muted-foreground">{item.label}</div>
        </div>
      ))}
    </GlassCard>
  );
}

function ConflictsBlock({ conflicts }: { conflicts: ConflictInfo[] }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
        <ShieldAlert className="h-6 w-6 text-coral" /> Конфликты активов
      </h2>
      <div className="space-y-3">
        {conflicts.map((c, i) => {
          const style = SEVERITY_STYLE[c.severity] ?? SEVERITY_STYLE.low;
          return (
            <GlassCard key={i} className="flex flex-col gap-2 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/ingredients/${c.a.slug}`}
                  className="font-semibold text-lavender-700 underline-offset-4 hover:underline"
                >
                  {c.a.displayName}
                </Link>
                <span className="text-muted-foreground">+</span>
                <Link
                  href={`/ingredients/${c.b.slug}`}
                  className="font-semibold text-lavender-700 underline-offset-4 hover:underline"
                >
                  {c.b.displayName}
                </Link>
                <Badge variant={style.variant}>{style.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{c.reason}</p>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
}

function AdviceBlock({ advice }: { advice: string[] }) {
  return (
    <GlassCard className="space-y-3 p-6">
      <h2 className="font-display flex items-center gap-2 text-xl font-bold">
        <Sparkles className="h-5 w-5 text-amber" /> Советы по уходу
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        {advice.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </GlassCard>
  );
}

function IngredientCard({ ingredient }: { ingredient: AnalyzedIngredient }) {
  const evidence = EVIDENCE_LABEL[ingredient.evidenceLevel] ?? EVIDENCE_LABEL.ANECDOTAL;
  return (
    <GlassCard className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/ingredients/${ingredient.slug}`}
          className="font-display text-lg font-bold text-lavender-700 underline-offset-4 hover:underline"
        >
          {ingredient.displayName}
        </Link>
        <Badge variant="outline">
          {CATEGORY_LABEL[ingredient.category] ?? ingredient.category}
        </Badge>
      </div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {ingredient.inciName}
      </p>
      <p className="text-sm">{ingredient.function}</p>
      <div className="mt-auto flex flex-wrap gap-2">
        {ingredient.typicalConc && (
          <Badge variant="amber">Обычно {ingredient.typicalConc}</Badge>
        )}
        <Badge variant={evidence.variant}>{evidence.label}</Badge>
      </div>
      {ingredient.safetyNotes && (
        <p className="text-xs text-muted-foreground">{ingredient.safetyNotes}</p>
      )}
    </GlassCard>
  );
}

function UnmatchedBlock({
  tokens,
  onReport,
}: {
  tokens: string[];
  onReport: (token: string) => void;
}) {
  return (
    <GlassCard className="space-y-3 p-6">
      <h2 className="font-display text-xl font-bold">
        Не распознано ({tokens.length})
      </h2>
      <p className="text-sm text-muted-foreground">
        Этих токенов пока нет в нашем словаре. Сообщите — и мы добавим ингредиент.
      </p>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token) => (
          <Button
            key={token}
            variant="secondary"
            size="sm"
            onClick={() => onReport(token)}
            title="Сообщить об ингредиенте"
          >
            <MessageSquarePlus className="h-3 w-3" />
            {token}
          </Button>
        ))}
      </div>
    </GlassCard>
  );
}

function FeedbackDialog({
  token,
  onClose,
}: {
  token: string | null;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setEmail("");
      setSent(false);
      setError(null);
    }
  }, [token]);

  async function submit() {
    if (!token) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, email: email.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Ошибка отправки");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={token !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сообщить об ингредиенте</DialogTitle>
          <DialogDescription>
            Токен «{token}» отсутствует в словаре. Мы проверим и добавим его.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <p className="text-sm text-lavender-700">
            Спасибо! Мы получили сообщение и разберёмся с этим ингредиентом.
          </p>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (необязательно — для ответа)"
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm backdrop-blur placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
            />
            {error && <p className="text-sm text-coral-700">{error}</p>}
          </>
        )}
        <DialogFooter>
          {sent ? (
            <Button onClick={onClose}>Закрыть</Button>
          ) : (
            <Button onClick={() => void submit()} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Отправить
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
