"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { EvidenceLevel } from "@prisma/client";
import { Check, ChevronDown, Flag, LayoutGrid, ShieldCheck, SlidersHorizontal, X } from "lucide-react";

import {
  CATALOG_ANCHOR,
  EVIDENCE_KEYS,
  FLAG_KEYS,
  INGREDIENTS_PATH,
  activeFilterCount,
  countMatching,
  facetCounts,
  ingredientFiltersHref,
  toggleValue,
  type FlagKey,
  type IngredientFacetRow,
  type IngredientFilters,
} from "@/lib/ingredients/catalog-filters";
import { FLAG_META } from "@/lib/ingredients/flags";
import { EVIDENCE_META } from "@/lib/seo/labels";
import { categoryStyle } from "@/lib/seo/ingredient-categories";
import { EvidenceMeter } from "@/components/ingredients/evidence-meter";
import { cn, pluralRu } from "@/lib/utils";

export interface CategoryGroupOption {
  id: string;
  title: string;
  categories: { value: string; label: string }[];
}

type Section = "evidence" | "category" | "flags";

/** Короткие пояснения к флагам для панели (полные тексты — в FLAG_META.note, во всплывающей подсказке). */
const FLAG_HINT: Record<FlagKey, string> = {
  comedogenic: "Есть данные о закупорке пор",
  feedsMalassezia: "Субстрат для дрожжей Malassezia",
  fragranceAllergen: "Отдушечный аллерген из списка ЕС",
};

/**
 * Панель фильтров каталога ингредиентов.
 *
 * Два варианта одного компонента:
 * • `sheet` — мобильный нижний лист со всеми измерениями (доказательность,
 *   флаги, категории), липкой кнопкой «Показать N ингредиентов», затемнением
 *   и блокировкой прокрутки страницы;
 * • `popover` — выпадающая панель одного измерения для десктопного тулбара.
 *
 * Построено на нативном <details> + GET-форме с повторяющимися параметрами:
 * без JS фильтр работает как обычная форма (остальные измерения передаются
 * скрытыми полями). С JS — мультивыбор без перезагрузок, живой фасетный
 * счётчик, закрытие по Escape / клику вне панели / затемнению.
 *
 * Выбор черновой до «Показать»: закрыли без применения — откат к применённому.
 * Родитель передаёт key по применённым фильтрам, чтобы после навигации
 * компонент смонтировался заново с новым состоянием.
 */
export function IngredientFilterPanel({
  variant,
  section,
  applied,
  facets,
  categoryGroups,
  align = "left",
  className,
}: {
  variant: "sheet" | "popover";
  /** Для popover — какое измерение показывать. */
  section?: Section;
  applied: IngredientFilters;
  /** Матрица признаков ингредиентов (с учётом поиска q). */
  facets: IngredientFacetRow[];
  categoryGroups: CategoryGroupOption[];
  /** К какому краю кнопки прижата выпадающая панель. */
  align?: "left" | "right";
  className?: string;
}) {
  const router = useRouter();
  const detailsRef = React.useRef<HTMLDetailsElement>(null);
  const [categories, setCategories] = React.useState<string[]>(applied.categories);
  const [evidence, setEvidence] = React.useState<EvidenceLevel[]>(applied.evidence);
  const [flags, setFlags] = React.useState<FlagKey[]>(applied.flags);

  const isSheet = variant === "sheet";
  const shows = (s: Section) => isSheet || section === s;

  const close = React.useCallback(() => {
    detailsRef.current?.removeAttribute("open");
  }, []);

  React.useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const el = detailsRef.current;
      // Лист закрывается затемнением/крестиком; клик вне — только для выпадающей панели.
      if (!isSheet && el?.open && !el.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      const el = detailsRef.current;
      if (e.key === "Escape" && el?.open) {
        close();
        el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      if (isSheet) document.body.style.overflow = "";
    };
  }, [close, isSheet]);

  // Лист живёт только на мобильных: если окно расширили до десктопа — закрываем.
  React.useEffect(() => {
    if (!isSheet) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && close();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [close, isSheet]);

  const onToggle = () => {
    const open = Boolean(detailsRef.current?.open);
    if (isSheet) document.body.style.overflow = open ? "hidden" : "";
    if (!open) {
      // Закрыли без применения — откатываем черновик.
      setCategories(applied.categories);
      setEvidence(applied.evidence);
      setFlags(applied.flags);
    }
  };

  const selection = { categories, evidence, flags };
  // Уровни, которых нет в базе (и в выдаче поиска), не показываем — кроме выбранных.
  const evidenceLevels = EVIDENCE_KEYS.filter(
    (level) => evidence.includes(level) || facets.some((r) => r.evidence === level)
  );
  const total = countMatching(facets, selection);
  const { byCategory, byEvidence, byFlag } = facetCounts(facets, selection);
  const dirty =
    categories.join() !== applied.categories.join() ||
    evidence.join() !== applied.evidence.join() ||
    flags.join() !== applied.flags.join();

  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSheet) document.body.style.overflow = "";
    close();
    router.push(ingredientFiltersHref(applied, selection));
  };

  const reset = () => {
    if (shows("category")) setCategories([]);
    if (shows("evidence")) setEvidence([]);
    if (shows("flags")) setFlags([]);
  };
  const canReset =
    (shows("category") && categories.length > 0) ||
    (shows("evidence") && evidence.length > 0) ||
    (shows("flags") && flags.length > 0);

  const title =
    section === "evidence"
      ? "Доказательная база"
      : section === "flags"
        ? "Флаги безопасности"
        : section === "category"
          ? "Категория"
          : "Фильтры";

  return (
    <details
      ref={detailsRef}
      onToggle={onToggle}
      className={cn("group/panel", !isSheet && "relative", className)}
    >
      <summary
        className={cn(
          "flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border bg-white px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground group-open/panel:border-foreground [&::-webkit-details-marker]:hidden",
          isActive(applied, variant, section) ? "border-foreground" : "border-ink-line"
        )}
      >
        <TriggerLabel variant={variant} section={section} applied={applied} groups={categoryGroups} />
        {!isSheet && (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open/panel:rotate-180" />
        )}
      </summary>

      {isSheet && (
        <div
          aria-hidden
          onClick={close}
          className="fixed inset-0 z-0 bg-black/40 animate-in fade-in-0"
        />
      )}

      <form
        action={`${INGREDIENTS_PATH}${CATALOG_ANCHOR}`}
        method="get"
        onSubmit={apply}
        aria-label={title}
        className={cn(
          isSheet
            ? "fixed inset-x-0 bottom-0 z-10 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-pop animate-in slide-in-from-bottom-8 fade-in-0"
            : cn(
                "absolute top-full z-40 mt-2 flex max-h-[min(72vh,620px)] flex-col rounded-2xl border border-ink-hair bg-white shadow-pop animate-in fade-in-0 slide-in-from-top-1",
                align === "right" ? "right-0" : "left-0",
                section === "category" ? "w-[600px] max-w-[calc(100vw-5rem)]" : "w-[360px]"
              )
        )}
      >
        {/* Без JS: поиск и измерения, которых нет в этой панели, уходят скрытыми полями */}
        {applied.q && <input type="hidden" name="q" value={applied.q} />}
        {!shows("category") &&
          applied.categories.map((c) => <input key={c} type="hidden" name="category" value={c} />)}
        {!shows("evidence") &&
          applied.evidence.map((v) => <input key={v} type="hidden" name="evidence" value={v} />)}
        {!shows("flags") &&
          applied.flags.map((f) => <input key={f} type="hidden" name="flag" value={f} />)}

        {isSheet && (
          <div className="relative flex items-center justify-between border-b border-ink-hair px-5 pb-3 pt-5">
            <span
              aria-hidden
              className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-ink-line"
            />
            <h2 className="text-lg font-semibold">Фильтры</h2>
            <button
              type="button"
              onClick={close}
              className="-mr-2 grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-ink-wash"
              aria-label="Закрыть фильтры"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            isSheet ? "space-y-7 px-5 py-5" : "p-2"
          )}
        >
          {/* ── Доказательная база ─────────────────────────────── */}
          {shows("evidence") && (
            <fieldset>
              <legend className={cn("text-sm font-semibold", isSheet ? "mb-3" : "sr-only")}>
                Доказательная база
              </legend>
              {isSheet ? (
                <div className="flex flex-wrap gap-2">
                  {evidenceLevels.map((level) => (
                    <PillCheckbox
                      key={level}
                      name="evidence"
                      value={level}
                      checked={evidence.includes(level)}
                      count={byEvidence.get(level) ?? 0}
                      onChange={() => setEvidence((s) => toggleValue(s, level))}
                    >
                      <EvidenceMeter level={level} inverted={evidence.includes(level)} />
                      {EVIDENCE_META[level].short}
                    </PillCheckbox>
                  ))}
                </div>
              ) : (
                <ul>
                  {evidenceLevels.map((level) => (
                    <li key={level}>
                      <RowCheckbox
                        name="evidence"
                        value={level}
                        checked={evidence.includes(level)}
                        count={byEvidence.get(level) ?? 0}
                        onChange={() => setEvidence((s) => toggleValue(s, level))}
                        hint={EVIDENCE_META[level].note}
                      >
                        <EvidenceMeter level={level} />
                        {EVIDENCE_META[level].short}
                      </RowCheckbox>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          )}

          {/* ── Флаги безопасности ─────────────────────────────── */}
          {shows("flags") && (
            <fieldset>
              <legend className={cn("text-sm font-semibold", isSheet ? "mb-1" : "sr-only")}>
                Флаги безопасности
              </legend>
              {isSheet && (
                <p className="mb-3 text-[13px] leading-snug text-ink-muted">
                  Покажем ингредиенты хотя бы с одним из выбранных флагов
                </p>
              )}
              {isSheet ? (
                <div className="flex flex-wrap gap-2">
                  {FLAG_KEYS.map((key) => (
                    <PillCheckbox
                      key={key}
                      name="flag"
                      value={key}
                      checked={flags.includes(key)}
                      count={byFlag.get(key) ?? 0}
                      onChange={() => setFlags((s) => toggleValue(s, key))}
                      title={FLAG_META[key].note}
                    >
                      {FLAG_META[key].label}
                    </PillCheckbox>
                  ))}
                </div>
              ) : (
                <>
                  <ul>
                    {FLAG_KEYS.map((key) => (
                      <li key={key}>
                        <RowCheckbox
                          name="flag"
                          value={key}
                          checked={flags.includes(key)}
                          count={byFlag.get(key) ?? 0}
                          onChange={() => setFlags((s) => toggleValue(s, key))}
                          hint={FLAG_HINT[key]}
                          title={FLAG_META[key].note}
                        >
                          {FLAG_META[key].label}
                        </RowCheckbox>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 border-t border-ink-hair px-2 pb-1 pt-2.5 text-xs leading-relaxed text-ink-muted">
                    Покажем ингредиенты хотя бы с одним из выбранных флагов.
                  </p>
                </>
              )}
            </fieldset>
          )}

          {/* ── Категории ──────────────────────────────────────── */}
          {shows("category") && (
            <fieldset>
              <legend className={cn("text-sm font-semibold", isSheet ? "mb-1" : "sr-only")}>
                Категория
              </legend>
              <div className={cn(!isSheet && "grid gap-x-3 sm:grid-cols-2")}>
                {categoryGroups.map((group) => (
                  <div
                    key={group.id}
                    className={cn(!isSheet && group.id === "base" && "sm:col-span-2")}
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider text-ink-muted",
                        isSheet ? "mb-2 mt-3" : "px-2 pb-1 pt-2.5"
                      )}
                    >
                      {group.title}
                    </p>
                    {isSheet ? (
                      <div className="flex flex-wrap gap-2">
                        {group.categories.map(({ value, label }) => (
                          <PillCheckbox
                            key={value}
                            name="category"
                            value={value}
                            checked={categories.includes(value)}
                            count={byCategory.get(value) ?? 0}
                            onChange={() => setCategories((s) => toggleValue(s, value))}
                            withIcon
                          >
                            <CategoryDot category={value} />
                            {label}
                          </PillCheckbox>
                        ))}
                      </div>
                    ) : (
                      <ul className={cn(group.id === "base" && "grid sm:grid-cols-2 sm:gap-x-3")}>
                        {group.categories.map(({ value, label }) => (
                          <li key={value}>
                            <RowCheckbox
                              name="category"
                              value={value}
                              checked={categories.includes(value)}
                              count={byCategory.get(value) ?? 0}
                              onChange={() => setCategories((s) => toggleValue(s, value))}
                            >
                              <CategoryDot category={value} />
                              <span className="truncate">{label}</span>
                            </RowCheckbox>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        {/* Подвал: сброс + применение с живым счётчиком */}
        <div
          className={cn(
            "flex items-center gap-3 border-t border-ink-hair",
            isSheet ? "px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "px-3 py-2.5"
          )}
        >
          <button
            type="button"
            onClick={reset}
            disabled={!canReset}
            className="h-11 shrink-0 rounded-lg px-2 text-sm font-semibold underline underline-offset-4 transition-colors hover:bg-ink-wash disabled:cursor-default disabled:text-ink-faint disabled:no-underline disabled:hover:bg-transparent"
          >
            Сбросить
          </button>
          <button
            type="submit"
            disabled={total === 0}
            className={cn(
              "ml-auto inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-white transition-opacity sm:px-5",
              isSheet && "flex-1",
              total === 0 ? "cursor-not-allowed bg-ink-faint" : "bg-foreground hover:opacity-90",
              dirty && total > 0 && "bg-gradient-cta"
            )}
          >
            {total === 0 ? (
              "Ничего не найдено"
            ) : (
              <>
                Показать {total}
                {/* На самых узких экранах слово не помещается в одну строку */}
                <span className="max-[359px]:hidden">
                  &nbsp;{pluralRu(total, "ингредиент", "ингредиента", "ингредиентов")}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </details>
  );
}

/** Активна ли кнопка (есть применённые значения в её измерениях). */
function isActive(
  applied: IngredientFilters,
  variant: "sheet" | "popover",
  section?: Section
): boolean {
  if (variant === "sheet") return activeFilterCount(applied) > 0;
  if (section === "category") return applied.categories.length > 0;
  if (section === "evidence") return applied.evidence.length > 0;
  return applied.flags.length > 0;
}

/** Подпись кнопки: что выбрано сейчас — видно без открытия панели. */
function TriggerLabel({
  variant,
  section,
  applied,
  groups,
}: {
  variant: "sheet" | "popover";
  section?: Section;
  applied: IngredientFilters;
  groups: CategoryGroupOption[];
}) {
  if (variant === "sheet") {
    const n = activeFilterCount(applied);
    return (
      <>
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        <span>Фильтры</span>
        {n > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1.5 text-xs font-semibold text-white">
            {n}
          </span>
        )}
      </>
    );
  }

  if (section === "evidence") {
    const [first] = applied.evidence;
    if (applied.evidence.length === 1 && first) {
      return (
        <>
          <EvidenceMeter level={first} />
          <span>{EVIDENCE_META[first].short}</span>
        </>
      );
    }
    return (
      <>
        <ShieldCheck className="h-4 w-4 shrink-0 text-ink-muted" />
        <span>Доказательность</span>
        <Counter n={applied.evidence.length} />
      </>
    );
  }

  if (section === "category") {
    const [first] = applied.categories;
    if (applied.categories.length === 1 && first) {
      const label =
        groups.flatMap((g) => g.categories).find((c) => c.value === first)?.label ?? first;
      return (
        <>
          <CategoryDot category={first} />
          <span className="max-w-[170px] truncate">{label}</span>
        </>
      );
    }
    return (
      <>
        <LayoutGrid className="h-4 w-4 shrink-0 text-ink-muted" />
        <span>Категории</span>
        <Counter n={applied.categories.length} />
      </>
    );
  }

  return (
    <>
      <Flag className="h-4 w-4 shrink-0 text-ink-muted" />
      <span>Флаги</span>
      <Counter n={applied.flags.length} />
    </>
  );
}

function Counter({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1.5 text-xs font-semibold text-white">
      {n}
    </span>
  );
}

/** Маленькая плашка-иконка категории. */
function CategoryDot({ category }: { category: string }) {
  const { icon: Icon, tint } = categoryStyle(category);
  return (
    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", tint)} aria-hidden>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}

/** Чип-чекбокс для нижнего листа: крупная зона касания, счётчик внутри. */
function PillCheckbox({
  name,
  value,
  checked,
  count,
  onChange,
  title,
  withIcon = false,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  count: number;
  onChange: () => void;
  title?: string;
  withIcon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      title={title}
      className={cn(
        "inline-flex h-10 cursor-pointer select-none items-center gap-2 rounded-full border pr-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground has-[:focus-visible]:ring-offset-2",
        withIcon ? "pl-2" : "pl-3.5",
        checked
          ? "border-foreground bg-foreground text-white"
          : "border-ink-hair text-foreground hover:border-foreground",
        !checked && count === 0 && "opacity-40"
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
      <span className={checked ? "text-white/70" : "text-ink-muted"}>{count}</span>
    </label>
  );
}

/** Строка-чекбокс для выпадающей панели. */
function RowCheckbox({
  name,
  value,
  checked,
  count,
  onChange,
  hint,
  title,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  count: number;
  onChange: () => void;
  hint?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      title={title}
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-ink-wash",
        checked && "font-semibold",
        !checked && count === 0 && "opacity-40"
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2",
          checked ? "border-foreground bg-foreground text-white" : "border-ink-line bg-white"
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">{children}</span>
        {hint && (
          <span className="mt-0.5 block text-xs font-normal leading-snug text-ink-muted">
            {hint}
          </span>
        )}
      </span>
      <span className={cn("font-normal text-ink-muted", hint && "self-start pt-0.5")}>{count}</span>
    </label>
  );
}
