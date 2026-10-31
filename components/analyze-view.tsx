"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Camera,
  FlaskConical,
  Loader2,
  Lock,
  MessageSquarePlus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import type {
  AnalysisResult,
  AnalysisTeaser,
  AnalyzedIngredient,
  CompositionSummary,
  ConflictInfo,
} from "@/lib/analysis/types";
import { getOcrProvider, OcrNotReadyError } from "@/lib/ocr";
import { takePendingPhoto } from "@/lib/pending-photo";
import { trackEvent } from "@/lib/analytics/mixpanel";
import { GOALS, trackGoal } from "@/lib/analytics/goals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeSignIn } from "@/components/code-sign-in";
import { Container } from "@/components/ui/container";
import { IngredientFlags } from "@/components/ingredients/ingredient-flags";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { inciTitle } from "@/lib/seo/site";
import { AI_SUMMARY_REPORT_PREFIX, AiSummaryBlock } from "@/components/ai-summary-block";

const EVIDENCE_LABEL: Record<string, { label: string; variant: "success" | "brand" | "amber" | "coral" | "outline" }> = {
  STRONG: { label: "Сильная доказательная база", variant: "success" },
  MODERATE: { label: "Умеренная доказательная база", variant: "amber" },
  LIMITED: { label: "Ограниченная доказательная база", variant: "coral" },
  ANECDOTAL: { label: "Без качественных данных", variant: "outline" },
};

const CATEGORY_LABEL: Record<string, string> = {
  active: "Актив",
  "uv-filter": "UV-фильтр",
  humectant: "Увлажнитель",
  barrier: "Барьерный компонент",
  antioxidant: "Антиоксидант",
  emollient: "Эмолент",
  silicone: "Силикон",
  botanical: "Растительный экстракт",
  soothing: "Успокаивающий",
  fragrance: "Отдушка",
  alcohol: "Спирт",
  texture: "Загуститель",
  "ph-buffer": "Регулятор pH",
  emulsifier: "Эмульгатор",
  surfactant: "ПАВ",
  peptide: "Пептид",
  preservative: "Консервант",
};

const SEVERITY_STYLE: Record<string, { label: string; variant: "coral" | "amber" | "outline" }> = {
  high: { label: "Высокий риск", variant: "coral" },
  medium: { label: "Умеренный риск", variant: "amber" },
  low: { label: "Низкий риск", variant: "outline" },
};

type InputMethod = "text" | "photo" | "product";

/**
 * Страница разбора состава: форма ввода, результат анализа, OCR.
 * Разбор доступен только вошедшим (ANALYZE_GATE): гость упирается в окно входа
 * на месте — введённый состав и выбранное фото не теряются.
 */
export function AnalyzeView({
  initialText,
  fromPhoto = false,
  productId = null,
}: {
  initialText: string;
  /** Переход с формы «Загрузить фото» (?photo=1) */
  fromPhoto?: boolean;
  /** Переход со страницы продукта (?product=<id>) — inputMethod "product" */
  productId?: string | null;
}) {
  const { status: sessionStatus } = useSession();
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Гостевая сводка (ANALYZE_GATE=teaser)
  const [teaser, setTeaser] = useState<AnalysisTeaser | null>(null);
  // Текст, по которому построен текущий результат: по нему же запрашивается резюме ИИ
  const [analyzedText, setAnalyzedText] = useState("");
  // Есть ли анкета кожи у вошедшего (поле hasSkinProfile ответа /api/analyze)
  const [hasSkinProfile, setHasSkinProfile] = useState<boolean | null>(null);
  const [ocrNotice, setOcrNotice] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [feedbackToken, setFeedbackToken] = useState<string | null>(null);
  // Окно входа (стена разбора)
  const [gateOpen, setGateOpen] = useState(false);
  // Режим гейта "off" узнали из ответа API — гостю можно показывать разбор без входа
  const [gateOff, setGateOff] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoButtonRef = useRef<HTMLButtonElement>(null);
  const autoRan = useRef(false);
  const photoRan = useRef(false);
  const [photoHint, setPhotoHint] = useState(false);
  // Состав, ожидающий запуска после входа
  const pendingAnalysisRef = useRef<{ text: string; method: InputMethod } | null>(null);
  // Фото, ожидающее распознавания после входа
  const pendingPhotoRef = useRef<File | null>(null);
  // Вход только что прошёл в этом окне: useSession() ещё не успел обновиться
  const authedJustNowRef = useRef(false);

  async function runAnalysis(raw: string, inputMethod?: "text" | "photo") {
    if (!raw.trim() || loading) return;
    const method: InputMethod = productId ? "product" : inputMethod ?? "text";
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: raw, inputMethod: method, productId }),
      });
      const data = await res.json();
      if (res.status === 401 && data?.code === "auth_required") {
        // Не ошибка: сохраняем состав, открываем окно входа на месте
        pendingAnalysisRef.current = { text: raw, method };
        setGateOpen(true);
        trackEvent("analysis_gate_shown", { gate_mode: "hard", input_method: method });
        trackGoal(GOALS.analyzeGate, { input_method: method });
        return;
      }
      if (!res.ok) throw new Error(data?.error ?? "Ошибка анализа");
      if (data?.gate === "teaser") {
        setTeaser(data as AnalysisTeaser);
        setResult(null);
        setHasSkinProfile(null);
        trackEvent("analysis_gate_shown", { gate_mode: "teaser", input_method: method });
        trackGoal(GOALS.analyzeGate, { input_method: method });
        return;
      }
      const full = data as AnalysisResult & { hasSkinProfile?: boolean };
      setResult(full);
      setAnalyzedText(raw);
      setTeaser(null);
      setHasSkinProfile(full.hasSkinProfile ?? null);
      // Гость при ANALYZE_GATE=off получил полный разбор — больше не показываем подсказку про вход
      if (sessionStatus === "unauthenticated") setGateOff(true);
      // Value Moment: состав успешно разобран (только полный разбор)
      const summary = full.summary;
      trackEvent("composition_analyzed", {
        input_method: method,
        recognized: summary.recognized,
        total: summary.total,
        actives: summary.actives,
        fragrances: summary.fragrances,
        alcohols: summary.alcohols,
        spf_filters: summary.spfFilters,
        conflicts: full.conflicts.length,
      });
      trackGoal(GOALS.analyzeSuccess, { input_method: method });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось разобрать состав");
    } finally {
      setLoading(false);
    }
  }

  // Авто-запуск при переходе с лендинга через ?text= или со страницы продукта
  useEffect(() => {
    if (!autoRan.current && initialText.trim()) {
      autoRan.current = true;
      void runAnalysis(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Переход с главной/лендинга по кнопке «Загрузить фото»: забираем выбранный там файл
  // и сразу распознаём. Если файла нет (перезагрузка, прямая ссылка) — подсвечиваем кнопку.
  useEffect(() => {
    if (!fromPhoto || photoRan.current) return;
    photoRan.current = true;
    const file = takePendingPhoto();
    if (file) {
      void handlePhoto(file, { autoAnalyze: true });
    } else {
      setPhotoHint(true);
      photoButtonRef.current?.focus();
    }
    // Убираем служебный ?photo=1, чтобы при обновлении страницы не было повторной реакции
    window.history.replaceState(window.history.state, "", "/analyze");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Вход в окне гейта прошёл: продолжаем сценарий, который был до стены. */
  function onGateSuccess() {
    authedJustNowRef.current = true;
    setGateOpen(false);
    setGateOff(false);
    const photo = pendingPhotoRef.current;
    if (photo) {
      pendingPhotoRef.current = null;
      void handlePhoto(photo, { autoAnalyze: true });
      return;
    }
    const pending = pendingAnalysisRef.current;
    if (pending) {
      pendingAnalysisRef.current = null;
      void runAnalysis(pending.text, pending.method === "photo" ? "photo" : "text");
    }
  }

  /**
   * Распознать фото. autoAnalyze — сразу запустить разбор распознанного текста
   * (переход с главной/лендинга, где пользователь уже нажал «Загрузить фото»).
   * У гостя сначала окно входа: файл держим в pendingPhotoRef и распознаём после входа.
   */
  async function handlePhoto(file: File, { autoAnalyze = false }: { autoAnalyze?: boolean } = {}) {
    const guestBlocked =
      sessionStatus === "unauthenticated" && !gateOff && !authedJustNowRef.current;
    if (guestBlocked) {
      pendingPhotoRef.current = file;
      setGateOpen(true);
      trackEvent("analysis_gate_shown", { gate_mode: "hard", input_method: "photo" });
      trackGoal(GOALS.analyzeGate, { input_method: "photo" });
      return;
    }
    setPhotoHint(false);
    setError(null);
    setOcrLoading(true);
    try {
      const extracted = await getOcrProvider().extractText(file);
      setText(extracted);
      if (autoAnalyze && extracted.trim()) void runAnalysis(extracted, "photo");
    } catch (e) {
      if (e instanceof OcrNotReadyError) {
        setOcrNotice(true);
      } else if (e instanceof Error && /войдите/i.test(e.message)) {
        // Сессия истекла посреди сценария — тот же путь, что у гостя
        pendingPhotoRef.current = file;
        setGateOpen(true);
        trackEvent("analysis_gate_shown", { gate_mode: "hard", input_method: "photo" });
        trackGoal(GOALS.analyzeGate, { input_method: "photo" });
      } else {
        setError(e instanceof Error ? e.message : "Не удалось обработать фото");
      }
    } finally {
      setOcrLoading(false);
    }
  }

  const guestHint = sessionStatus === "unauthenticated" && !gateOff;

  return (
    <main className="bg-gradient-hero min-h-screen py-16">
      <Container className="space-y-10">
        <div className="space-y-3 text-center">
          <Badge variant="teal" className="mx-auto">
            <FlaskConical className="mr-1 h-3 w-3" /> Доказательный разбор
          </Badge>
          <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[36px]">
            Разбор состава косметики онлайн
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Вставьте INCI-список — покажем функцию каждого ингредиента,
            типичную рабочую концентрацию, уровень доказательности и конфликты активов.
          </p>
        </div>

        <GlassCard className="space-y-4 p-6 sm:p-8">
          {guestHint && (
            <p className="text-xs text-muted-foreground">
              Разбор бесплатный, нужен только вход по email
            </p>
          )}
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
              className="w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                ref={photoButtonRef}
                type="button"
                variant="secondary"
                size="lg"
                disabled={ocrLoading}
                className={photoHint ? "ring-2 ring-brand ring-offset-2" : undefined}
                onClick={() => fileInputRef.current?.click()}
              >
                {ocrLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {ocrLoading ? "Распознаём фото…" : "Загрузить фото"}
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
          {ocrLoading && (
            <p className="text-sm text-muted-foreground">
              Распознаём состав с фото — это займёт несколько секунд.
            </p>
          )}
          {photoHint && !ocrLoading && (
            <p className="text-sm text-muted-foreground">
              Нажмите «Загрузить фото» и выберите снимок состава с упаковки.
            </p>
          )}
          {error && <p className="text-sm text-coral-700">{error}</p>}
        </GlassCard>

        {/* Постоянная подсказка гостю над результатом */}
        {guestHint && !result && !teaser && (
          <AnalyzeGateCard onSignIn={() => setGateOpen(true)} />
        )}

        {teaser && (
          <>
            <SummaryBlock summary={teaser.summary} />
            <AnalyzeGateCard onSignIn={() => setGateOpen(true)} />
          </>
        )}

        {result && (
          <>
            <SummaryBlock summary={result.summary} />
            {hasSkinProfile === false && sessionStatus === "authenticated" && (
              <GlassCard className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Расскажите о своей коже — подсветим, что вам подходит, а что лучше обойти.
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/onboarding">Заполнить анкету</Link>
                </Button>
              </GlassCard>
            )}
            <AiSummaryBlock
              key={analyzedText}
              text={analyzedText}
              result={result}
              onReport={(token) => setFeedbackToken(token)}
            />
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

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Разбор готов — осталось войти</DialogTitle>
            <DialogDescription>
              Buty бесплатный. Вход нужен, чтобы сохранить историю разборов и подсказывать,
              что подходит именно вашей коже. Только email, без пароля.
            </DialogDescription>
          </DialogHeader>
          <CodeSignIn source="analyze_gate" cta="Получить код" onSuccess={onGateSuccess} />
        </DialogContent>
      </Dialog>

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

/** Карточка-стена для гостя: что внутри полного разбора и вход на месте. */
function AnalyzeGateCard({ onSignIn }: { onSignIn: () => void }) {
  return (
    <GlassCard className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-sm text-muted-foreground">
          Полный разбор: функция каждого ингредиента, конфликты активов, советы и резюме ИИ.{" "}
          <span className="font-medium text-foreground">Бесплатно после входа.</span>
        </p>
      </div>
      <Button onClick={onSignIn}>Войти и посмотреть</Button>
    </GlassCard>
  );
}

function SummaryBlock({ summary }: { summary: CompositionSummary }) {
  const items = [
    { label: "Распознано", value: `${summary.recognized} из ${summary.total}` },
    { label: "Активы", value: summary.actives },
    { label: "Отдушки", value: summary.fragrances },
    { label: "Спирты", value: summary.alcohols },
    { label: "SPF-фильтры", value: summary.spfFilters },
    ...(summary.comedogenic > 0
      ? [{ label: "Комедогенные", value: summary.comedogenic }]
      : []),
    ...(summary.malassezia > 0
      ? [{ label: "Кормят малассезию", value: summary.malassezia }]
      : []),
    ...(summary.fragranceAllergens > 0
      ? [{ label: "Аллергены-отдушки", value: summary.fragranceAllergens }]
      : []),
  ];
  return (
    <GlassCard className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="font-display text-2xl font-bold text-brand-700">
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
                  className="font-semibold text-brand-700 underline-offset-4 hover:underline"
                >
                  {c.a.displayName}
                </Link>
                <span className="text-muted-foreground">+</span>
                <Link
                  href={`/ingredients/${c.b.slug}`}
                  className="font-semibold text-brand-700 underline-offset-4 hover:underline"
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

/**
 * Имя с этикетки, если мы нашли ингредиент по синониму (Sodium Hyaluronate → Hyaluronic Acid):
 * иначе пользователь не узнаёт в карточке то, что читает на упаковке.
 */
function showLabelName(ingredient: AnalyzedIngredient): boolean {
  const via = ingredient.matchedVia.trim().toLowerCase();
  if (via.length < 4 || !/^[a-z0-9 ,()/'-]+$/.test(via)) return false;
  return (
    via !== ingredient.inciName.trim().toLowerCase() &&
    via !== ingredient.displayName.trim().toLowerCase()
  );
}

function IngredientCard({ ingredient }: { ingredient: AnalyzedIngredient }) {
  const evidence = EVIDENCE_LABEL[ingredient.evidenceLevel] ?? EVIDENCE_LABEL.ANECDOTAL;
  return (
    <GlassCard className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/ingredients/${ingredient.slug}`}
          className="font-display text-lg font-bold text-brand-700 underline-offset-4 hover:underline"
        >
          {inciTitle(ingredient.inciName)}
        </Link>
        <Badge variant="outline">
          {CATEGORY_LABEL[ingredient.category] ?? ingredient.category}
        </Badge>
        <IngredientFlags
          flags={{
            comedogenic: ingredient.comedogenic,
            feedsMalassezia: ingredient.feedsMalassezia,
            fragranceAllergen: ingredient.fragranceAllergen,
          }}
        />
      </div>
      {ingredient.displayName.trim().toLowerCase() !==
        ingredient.inciName.trim().toLowerCase() && (
        <p className="text-sm text-muted-foreground">{ingredient.displayName}</p>
      )}
      {showLabelName(ingredient) && (
        <p className="text-xs text-muted-foreground">
          На этикетке: {inciTitle(ingredient.matchedVia)}
        </p>
      )}
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
          {token?.startsWith(AI_SUMMARY_REPORT_PREFIX) ? (
            <>
              <DialogTitle>Неточность в резюме</DialogTitle>
              <DialogDescription>
                Мы перепроверим резюме по базе и исправим его. Оставьте email, если хотите получить ответ.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Сообщить об ингредиенте</DialogTitle>
              <DialogDescription>
                Токен «{token}» отсутствует в словаре. Мы проверим и добавим его.
              </DialogDescription>
            </>
          )}
        </DialogHeader>
        {sent ? (
          <p className="text-sm text-brand-700">
            {token?.startsWith(AI_SUMMARY_REPORT_PREFIX)
              ? "Спасибо! Мы получили сообщение и перепроверим резюме."
              : "Спасибо! Мы получили сообщение и разберёмся с этим ингредиентом."}
          </p>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (необязательно — для ответа)"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
