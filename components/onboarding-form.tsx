"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Info, Lock, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ALLERGEN_GROUPS,
  ALLERGENS,
  CONCERN_GROUPS,
  CONDITIONS,
  MAX_CUSTOM_LENGTH,
  SKIN_TYPES,
  SKIN_TYPE_QUIZ,
  SKIN_TYPE_VALUES,
  labelFor,
  migrateLegacy,
  type ReactionLevel,
  type SkinTypeValue,
} from "@/lib/skin-profile/options";
import { cn } from "@/lib/utils";

export interface OnboardingInitial {
  skinType: string;
  sensitive: boolean;
  concerns: string[];
  conditions: string[];
  allergies: string[];
  intolerances: string[];
  /** Профиль заполнен в текущей версии онбординга (есть согласие). */
  complete: boolean;
}

interface OnboardingFormProps {
  initial?: OnboardingInitial | null;
}

interface Reaction {
  id: string;
  level: ReactionLevel;
}

const STEPS = [
  {
    label: "Тип кожи",
    title: "Какой у вас тип кожи?",
    lead: "От типа зависит, какие текстуры и активы подойдут. Всё займёт около минуты.",
  },
  {
    label: "Задачи",
    title: "Что хочется улучшить?",
    lead: "Выберите всё, что актуально, — подскажем, какие ингредиенты работают на эти задачи.",
  },
  {
    label: "Особые периоды",
    title: "Есть ли что-то из этого сейчас?",
    lead: "Некоторые ингредиенты в эти периоды нежелательны — будем предупреждать о них в разборах и на полке.",
  },
  {
    label: "Реакции",
    title: "На что кожа реагирует?",
    lead: "Отметим эти компоненты в составах. Не уверены — пропустите, список можно дополнить позже.",
  },
  {
    label: "Проверка",
    title: "Проверьте профиль",
    lead: "Всё верно? Любой пункт можно изменить.",
  },
] as const;

const REVIEW = STEPS.length - 1;
const DEFAULT_LEVEL = new Map(ALLERGENS.map((a) => [a.id, a.defaultLevel]));

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
}

/** Онбординг профиля кожи: мастер из 5 шагов → POST /api/skin-profile. */
export function OnboardingForm({ initial }: OnboardingFormProps) {
  const router = useRouter();

  const initialType = SKIN_TYPE_VALUES.includes(initial?.skinType as SkinTypeValue)
    ? (initial?.skinType as SkinTypeValue)
    : "";
  const resume = Boolean(initial?.complete && initialType);

  const [step, setStep] = useState(resume ? REVIEW : 0);
  const [fromReview, setFromReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [skinType, setSkinType] = useState<SkinTypeValue | "">(initialType);
  const [quizOpen, setQuizOpen] = useState(false);
  const [sensitive, setSensitive] = useState<boolean | null>(
    initial ? initial.sensitive || initial.skinType === "sensitive" : null,
  );
  const [concerns, setConcerns] = useState<string[]>(migrateLegacy(initial?.concerns ?? []));
  const [conditions, setConditions] = useState<string[]>(initial?.conditions ?? []);
  const [conditionsNone, setConditionsNone] = useState(
    resume && (initial?.conditions.length ?? 0) === 0,
  );
  const [reactions, setReactions] = useState<Reaction[]>(() => {
    const allergies = migrateLegacy(initial?.allergies ?? []);
    const intolerances = migrateLegacy(initial?.intolerances ?? []);
    return [
      ...allergies.map((id) => ({ id, level: "allergy" as const })),
      ...intolerances
        .filter((id) => !allergies.includes(id))
        .map((id) => ({ id, level: "intolerance" as const })),
    ];
  });
  const [query, setQuery] = useState("");
  const [consent, setConsent] = useState(resume);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // При смене шага — фокус на заголовок (для скринридеров) и прокрутка к началу формы.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  function stepError(s: number): string | null {
    if (s === 0 && !skinType) return "Выберите тип кожи или нажмите «Не знаю».";
    if (s === 0 && sensitive === null) return "Ответьте, часто ли кожа реагирует на новые средства.";
    if (s === 2 && conditions.length === 0 && !conditionsNone)
      return "Отметьте подходящее или выберите «Ничего из этого».";
    if (s === REVIEW && !consent) return "Чтобы сохранить профиль, нужно согласие.";
    return null;
  }

  function goTo(next: number) {
    setError(null);
    setQuery("");
    setStep(next);
  }

  function next() {
    const err = stepError(step);
    if (err) {
      setError(err);
      return;
    }
    if (fromReview) {
      setFromReview(false);
      goTo(REVIEW);
      return;
    }
    goTo(Math.min(step + 1, REVIEW));
  }

  function back() {
    if (fromReview) {
      setFromReview(false);
      goTo(REVIEW);
      return;
    }
    goTo(Math.max(step - 1, 0));
  }

  function editFromReview(s: number) {
    setFromReview(true);
    goTo(s);
  }

  async function save() {
    const firstInvalid = [0, 2, REVIEW].find((s) => stepError(s));
    if (firstInvalid !== undefined) {
      if (firstInvalid !== REVIEW) {
        setFromReview(true);
        setStep(firstInvalid);
      } else {
        consentRef.current?.focus({ preventScroll: true });
        consentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setError(stepError(firstInvalid));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/skin-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skinType,
          sensitive,
          concerns,
          conditions: conditionsNone ? [] : conditions,
          allergies: reactions.filter((r) => r.level === "allergy").map((r) => r.id),
          intolerances: reactions.filter((r) => r.level === "intolerance").map((r) => r.id),
          consent,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/shelf");
      router.refresh();
    } catch {
      setPending(false);
      setError("Не удалось сохранить профиль. Проверьте интернет и попробуйте ещё раз.");
    }
  }

  // --- Реакции ---
  function toggleReaction(id: string) {
    setReactions((list) =>
      list.some((r) => r.id === id)
        ? list.filter((r) => r.id !== id)
        : [...list, { id, level: DEFAULT_LEVEL.get(id) ?? "allergy" }],
    );
  }

  function setLevel(id: string, level: ReactionLevel) {
    setReactions((list) => list.map((r) => (r.id === id ? { ...r, level } : r)));
  }

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(
    () =>
      ALLERGEN_GROUPS.map((g) => ({
        ...g,
        options: q
          ? g.options.filter((o) =>
              `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q),
            )
          : g.options,
      })).filter((g) => g.options.length > 0),
    [q],
  );
  const customText = query.trim().replace(/\s+/g, " ").slice(0, MAX_CUSTOM_LENGTH);
  const canAddCustom =
    customText.length >= 2 &&
    !ALLERGENS.some((o) => o.label.toLowerCase() === customText.toLowerCase()) &&
    !reactions.some((r) => labelFor(r.id).toLowerCase() === customText.toLowerCase());

  function addCustom() {
    if (!canAddCustom) return;
    setReactions((list) => [...list, { id: customText, level: "allergy" }]);
    setQuery("");
  }

  // --- Подпись основной кнопки ---
  let primaryLabel: React.ReactNode = "Далее";
  if (fromReview) primaryLabel = "Готово";
  else if (step === 1 && concerns.length === 0) primaryLabel = "Пропустить";
  else if (step === 3 && reactions.length === 0) primaryLabel = "Реакций нет";
  if (step === REVIEW)
    primaryLabel = pending ? (
      "Сохраняем…"
    ) : (
      <>
        Сохранить<span className="hidden sm:inline"> и перейти к полке</span>
      </>
    );

  const current = STEPS[step];
  const errorId = "onboarding-error";

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* Прогресс */}
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          Шаг {step + 1} из {STEPS.length}
          <span className="hidden sm:inline"> · {current.label}</span>
        </span>
        {step > 0 && !fromReview ? (
          <span className="hidden sm:inline">Можно вернуться к любому шагу</span>
        ) : null}
      </div>
      <div
        className="mt-3 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-label="Прогресс заполнения профиля"
      >
        {STEPS.map((s, i) => (
          <span
            key={s.label}
            className={cn(
              "h-1.5 rounded-full transition-colors duration-300",
              i <= step ? "bg-gradient-cta" : "bg-ink-hair",
            )}
          />
        ))}
      </div>

      <div
        key={step}
        className="mt-8 duration-200 animate-in fade-in slide-in-from-right-2 motion-reduce:animate-none"
      >
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] outline-none sm:text-[28px]"
        >
          {current.title}
        </h1>
        <p className="mt-2 text-ink-muted">{current.lead}</p>

        <div className="mt-7">
          {step === 0 ? (
            <StepSkinType
              skinType={skinType}
              setSkinType={(v) => {
                setSkinType(v);
                setError(null);
              }}
              quizOpen={quizOpen}
              setQuizOpen={setQuizOpen}
              sensitive={sensitive}
              setSensitive={(v) => {
                setSensitive(v);
                setError(null);
              }}
            />
          ) : null}

          {step === 1 ? (
            <div className="space-y-7">
              {CONCERN_GROUPS.map((g) => (
                <fieldset key={g.title}>
                  <legend className="text-[15px] font-semibold">{g.title}</legend>
                  {g.note ? <p className="mt-1 text-sm text-ink-muted">{g.note}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.options.map((o) => (
                      <Chip
                        key={o.id}
                        label={o.label}
                        checked={concerns.includes(o.id)}
                        onChange={() => setConcerns((l) => toggleIn(l, o.id))}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <fieldset>
              <legend className="sr-only">Особые периоды</legend>
              <div className="grid gap-3">
                {CONDITIONS.map((o) => (
                  <OptionCard
                    key={o.id}
                    type="checkbox"
                    name="conditions"
                    label={o.label}
                    hint={o.hint}
                    checked={conditions.includes(o.id)}
                    onChange={() => {
                      setConditions((l) => toggleIn(l, o.id));
                      setConditionsNone(false);
                      setError(null);
                    }}
                  />
                ))}
                <OptionCard
                  type="checkbox"
                  name="conditions"
                  label="Ничего из этого"
                  checked={conditionsNone}
                  onChange={() => {
                    setConditionsNone((v) => !v);
                    setConditions([]);
                    setError(null);
                  }}
                />
              </div>
              <PrivacyNote />
            </fieldset>
          ) : null}

          {step === 3 ? (
            <div>
              <div className="rounded-xl bg-ink-wash p-4 text-sm leading-relaxed text-ink-soft">
                <p>
                  <span className="font-semibold text-foreground">Аллергия</span> — зуд, сыпь,
                  отёк. В составах отметим как риск.
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-foreground">Раздражение</span> — жжение,
                  покраснение, шелушение. Отметим мягким предупреждением.
                </p>
              </div>

              <div className="relative mt-5">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  maxLength={MAX_CUSTOM_LENGTH}
                  placeholder="Найти или добавить своё"
                  aria-label="Найти или добавить ингредиент"
                  className="h-12 w-full rounded-lg border border-ink-line bg-white pl-12 pr-4 text-base placeholder:text-ink-muted focus-visible:border-foreground focus-visible:shadow-[0_0_0_1px_#222] focus-visible:outline-none"
                />
              </div>

              {canAddCustom ? (
                <button
                  type="button"
                  onClick={addCustom}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-ink-line px-4 text-sm font-medium hover:border-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Добавить «{customText}»
                </button>
              ) : null}

              <div className="mt-6 space-y-6">
                {filteredGroups.map((g) => (
                  <fieldset key={g.title}>
                    <legend className="text-[15px] font-semibold">{g.title}</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {g.options.map((o) => (
                        <Chip
                          key={o.id}
                          label={o.label}
                          hint={o.hint}
                          checked={reactions.some((r) => r.id === o.id)}
                          onChange={() => toggleReaction(o.id)}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
                {filteredGroups.length === 0 && !canAddCustom ? (
                  <p className="text-sm text-ink-muted">Ничего не нашлось.</p>
                ) : null}
              </div>

              {reactions.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-[15px] font-semibold">
                    Ваш список · {reactions.length}
                  </h2>
                  <ul className="mt-3 divide-y divide-ink-hair rounded-xl border border-ink-hair">
                    {reactions.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3"
                      >
                        <span className="min-w-0 flex-1 text-sm font-medium">{labelFor(r.id)}</span>
                        <div className="flex items-center gap-2">
                          <LevelSwitch
                            name={`level-${r.id}`}
                            value={r.level}
                            onChange={(level) => setLevel(r.id, level)}
                          />
                          <button
                            type="button"
                            onClick={() => toggleReaction(r.id)}
                            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-ink-wash hover:text-foreground"
                            aria-label={`Убрать «${labelFor(r.id)}»`}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === REVIEW ? (
            <div>
              <dl className="divide-y divide-ink-hair rounded-xl border border-ink-hair">
                <ReviewRow
                  term="Тип кожи"
                  value={
                    skinType
                      ? `${labelFor(skinType)}${sensitive ? ", склонна к чувствительности" : ""}`
                      : "Не выбран"
                  }
                  onEdit={() => editFromReview(0)}
                />
                <ReviewRow
                  term="Задачи"
                  value={concerns.length ? concerns.map(labelFor).join(", ") : "Не выбраны"}
                  onEdit={() => editFromReview(1)}
                />
                <ReviewRow
                  term="Особые периоды"
                  value={
                    conditions.length
                      ? conditions.map(labelFor).join(", ")
                      : conditionsNone
                        ? "Нет"
                        : "Не указано"
                  }
                  onEdit={() => editFromReview(2)}
                />
                <ReviewRow
                  term="Аллергия"
                  value={
                    reactions.filter((r) => r.level === "allergy").map((r) => labelFor(r.id)).join(", ") ||
                    "Нет"
                  }
                  onEdit={() => editFromReview(3)}
                />
                <ReviewRow
                  term="Раздражение"
                  value={
                    reactions
                      .filter((r) => r.level === "intolerance")
                      .map((r) => labelFor(r.id))
                      .join(", ") || "Нет"
                  }
                  onEdit={() => editFromReview(3)}
                />
              </dl>

              <div className="mt-6 flex gap-3 rounded-xl bg-ink-wash p-4 text-sm leading-relaxed text-ink-soft">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
                <p>
                  Buty не ставит диагнозы и не заменяет врача. При розацеа, атопическом
                  дерматите, беременности и лечении у дерматолога согласуйте уход со специалистом.
                </p>
              </div>

              <label className="mt-5 flex cursor-pointer gap-3 text-sm leading-relaxed">
                <input
                  ref={consentRef}
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setError(null);
                  }}
                  aria-describedby={error ? errorId : undefined}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand"
                />
                <span>
                  Согласна(ен) на обработку данных о состоянии кожи, аллергиях и особых периодах,
                  чтобы Buty персонализировал разборы составов. Данные видны только вам; профиль
                  можно изменить или удалить в разделе «Профиль».
                </span>
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {/* Панель действий: на мобильных прилипает к низу экрана */}
      <div className="sticky bottom-0 -mx-6 mt-10 border-t border-ink-hair bg-white/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
        <p
          id={errorId}
          role="alert"
          aria-live="assertive"
          className={cn("text-sm font-medium text-coral-700", error ? "mb-3" : "sr-only")}
        >
          {error}
        </p>
        <div className="flex items-center gap-3">
          {step > 0 && !(step === REVIEW && resume && !fromReview) ? (
            <Button type="button" variant="ghost" onClick={back} className="h-12 px-4">
              <ChevronLeft className="h-5 w-5" aria-hidden />
              {fromReview ? "К проверке" : "Назад"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={step === REVIEW ? save : next}
            disabled={pending}
            className="ml-auto w-full sm:w-auto"
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Шаг 1: тип кожи и чувствительность ---------- */

function StepSkinType({
  skinType,
  setSkinType,
  quizOpen,
  setQuizOpen,
  sensitive,
  setSensitive,
}: {
  skinType: SkinTypeValue | "";
  setSkinType: (v: SkinTypeValue) => void;
  quizOpen: boolean;
  setQuizOpen: (v: boolean) => void;
  sensitive: boolean | null;
  setSensitive: (v: boolean) => void;
}) {
  const [quizResult, setQuizResult] = useState<SkinTypeValue | null>(null);

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="sr-only">Тип кожи</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SKIN_TYPES.map((t) => (
            <OptionCard
              key={t.id}
              type="radio"
              name="skinType"
              label={t.label}
              hint={t.hint}
              checked={skinType === t.id}
              onChange={() => {
                setSkinType(t.id);
                setQuizResult(null);
              }}
            />
          ))}
        </div>

        {!quizOpen ? (
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className="mt-3 min-h-11 text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Не знаю — помогите определить
          </button>
        ) : (
          <div className="mt-4 rounded-xl border border-ink-hair bg-ink-wash p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold">
                Умойтесь мягким средством и ничего не наносите. Как ощущается кожа через 2–3 часа?
              </p>
              <button
                type="button"
                onClick={() => setQuizOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-white"
                aria-label="Скрыть подсказку"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {SKIN_TYPE_QUIZ.map((a) => (
                <button
                  key={a.type}
                  type="button"
                  onClick={() => {
                    setSkinType(a.type);
                    setQuizResult(a.type);
                  }}
                  className={cn(
                    "min-h-11 rounded-lg border bg-white px-4 py-2.5 text-left text-sm transition-colors",
                    quizResult === a.type
                      ? "border-foreground font-semibold"
                      : "border-ink-line hover:border-foreground",
                  )}
                >
                  {a.answer}
                </button>
              ))}
            </div>
            {quizResult ? (
              <p className="mt-3 text-sm" aria-live="polite">
                Похоже, у вас <span className="font-semibold">{labelFor(quizResult).toLowerCase()}</span>{" "}
                кожа — мы отметили её выше. Можно поменять в любой момент.
              </p>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">
                Нет времени проверять? Выберите самый похожий вариант — тип можно изменить позже.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-[15px] font-semibold">Кожа часто реагирует на новые средства?</legend>
        <p className="mt-1 text-sm text-ink-muted">
          Щиплет, краснеет или чешется после нанесения. Чувствительной бывает кожа любого типа.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <OptionCard
            type="radio"
            name="sensitive"
            label="Да, часто"
            checked={sensitive === true}
            onChange={() => setSensitive(true)}
            compact
          />
          <OptionCard
            type="radio"
            name="sensitive"
            label="Нет, редко"
            checked={sensitive === false}
            onChange={() => setSensitive(false)}
            compact
          />
        </div>
      </fieldset>
    </div>
  );
}

/* ---------- Примитивы ---------- */

/** Карточка-вариант на нативном input: клавиатура, скринридеры и стрелки для radio — из коробки. */
function OptionCard({
  type,
  name,
  label,
  hint,
  checked,
  onChange,
  compact,
}: {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border bg-white transition-[border-color,box-shadow] has-[:focus-visible]:shadow-[0_0_0_2px_#222]",
        compact ? "min-h-12 items-center px-4 py-3" : "min-h-[72px] p-4",
        checked
          ? "border-foreground shadow-[0_0_0_1px_#222]"
          : "border-ink-line hover:border-ink-faint",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center border transition-colors",
          type === "radio" ? "rounded-full" : "rounded-md",
          compact && "mt-0",
          checked ? "border-transparent bg-gradient-cta text-white" : "border-ink-faint bg-white",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-snug">{label}</span>
        {hint ? <span className="mt-1 block text-sm leading-snug text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Чип множественного выбора (checkbox). */
function Chip({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      title={hint}
      className={cn(
        "inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:shadow-[0_0_0_2px_#222]",
        checked
          ? "border-brand bg-brand-50 font-semibold text-brand-800"
          : "border-ink-line bg-white text-ink-soft hover:border-ink-faint",
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {checked ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : null}
      <span>
        {label}
        {hint ? <span className="sr-only">: {hint}</span> : null}
      </span>
    </label>
  );
}

/** Переключатель «Аллергия / Раздражение» (сегментированный radio). */
function LevelSwitch({
  name,
  value,
  onChange,
}: {
  name: string;
  value: ReactionLevel;
  onChange: (v: ReactionLevel) => void;
}) {
  const items: { v: ReactionLevel; label: string }[] = [
    { v: "allergy", label: "Аллергия" },
    { v: "intolerance", label: "Раздражение" },
  ];
  return (
    <div role="radiogroup" aria-label="Тип реакции" className="inline-flex rounded-full bg-ink-wash p-1">
      {items.map((it) => (
        <label
          key={it.v}
          className={cn(
            "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors has-[:focus-visible]:shadow-[0_0_0_2px_#222]",
            value === it.v
              ? it.v === "allergy"
                ? "bg-coral-500 text-white"
                : "bg-white text-foreground shadow-glass"
              : "text-ink-muted hover:text-foreground",
          )}
        >
          <input
            type="radio"
            name={name}
            checked={value === it.v}
            onChange={() => onChange(it.v)}
            className="sr-only"
          />
          {it.label}
        </label>
      ))}
    </div>
  );
}

function ReviewRow({ term, value, onEdit }: { term: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <dt className="text-sm text-ink-muted">{term}</dt>
        <dd className="mt-0.5 text-[15px] font-medium leading-snug">{value}</dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="min-h-11 shrink-0 text-sm font-semibold underline underline-offset-4 hover:text-brand-700"
        aria-label={`Изменить: ${term}`}
      >
        Изменить
      </button>
    </div>
  );
}

function PrivacyNote() {
  return (
    <p className="mt-5 flex gap-2 text-sm text-ink-muted">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      Эти данные видны только вам и используются только для предупреждений в разборах.
    </p>
  );
}
