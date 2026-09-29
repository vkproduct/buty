"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

import {
  PRODUCTS_PATH,
  CATALOG_ANCHOR,
  compareNames,
  countMatching,
  facetCounts,
  productFiltersHref,
  toggleValue,
  type FacetRow,
  type ProductFilters,
} from "@/lib/products/catalog-filters";
import { cn, pluralRu } from "@/lib/utils";

/** С какого числа брендов список делится на буквенные группы. */
const BRAND_GROUPING_THRESHOLD = 12;
const DESKTOP_QUERY = "(min-width: 1024px)";

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * Панель фильтров каталога продуктов.
 *
 * Один компонент — два режима:
 * • мобильный (< lg): кнопка «Фильтры» открывает нижний лист на всю ширину
 *   с категориями и брендами, липкой кнопкой «Показать N средств» и затемнением;
 * • десктоп (≥ lg): кнопка «Бренд» открывает выпадающую панель только с брендами —
 *   категории на десктопе вынесены чипами прямо в панель инструментов.
 *
 * Построено на нативном <details> + GET-форме с повторяющимися параметрами
 * (?brand=A&brand=B): без JS фильтр работает как обычная форма. С JS —
 * мультивыбор без перезагрузок, живой счётчик результатов, поиск по брендам,
 * закрытие по Escape / клику вне панели / затемнению, блокировка прокрутки
 * страницы под листом на мобильных.
 *
 * Состояние локальное до нажатия «Показать»: закрыли без применения — выбор
 * откатывается к применённому. Родитель передаёт key по применённым фильтрам,
 * чтобы после навигации компонент смонтировался заново с новым состоянием.
 */
export function ProductFilterSheet({
  applied,
  brands,
  categories,
  facets,
  className,
}: {
  applied: ProductFilters;
  /** Все бренды каталога (с учётом поиска), по алфавиту. */
  brands: string[];
  /** Категории в порядке шагов ухода. */
  categories: CategoryOption[];
  /** Матрица бренд × категория → число продуктов (с учётом поиска q). */
  facets: FacetRow[];
  className?: string;
}) {
  const router = useRouter();
  const detailsRef = React.useRef<HTMLDetailsElement>(null);
  const [selBrands, setSelBrands] = React.useState<string[]>(applied.brands);
  const [selCategories, setSelCategories] = React.useState<string[]>(applied.categories);
  const [brandQuery, setBrandQuery] = React.useState("");
  // На десктопе категории живут чипами в тулбаре — «Сбросить» в панели их не трогает.
  const [isDesktop, setIsDesktop] = React.useState(false);
  const idPrefix = React.useId();

  const close = React.useCallback(() => {
    detailsRef.current?.removeAttribute("open");
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Закрытие по клику вне панели (десктоп) и по Escape.
  React.useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const el = detailsRef.current;
      if (el?.open && !el.contains(e.target as Node)) close();
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
      document.body.style.overflow = "";
    };
  }, [close]);

  const onToggle = () => {
    const open = Boolean(detailsRef.current?.open);
    // Под нижним листом страница не должна прокручиваться.
    document.body.style.overflow = open && !isDesktop ? "hidden" : "";
    if (!open) {
      // Закрыли без применения — откатываем черновик.
      setSelBrands(applied.brands);
      setSelCategories(applied.categories);
      setBrandQuery("");
    }
  };

  const total = countMatching(facets, selBrands, selCategories);
  const { byBrand, byCategory } = facetCounts(facets, selBrands, selCategories);
  const dirty =
    selBrands.join("\u0000") !== applied.brands.join("\u0000") ||
    selCategories.join("\u0000") !== applied.categories.join("\u0000");

  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const href = productFiltersHref({
      q: applied.q,
      brands: selBrands,
      categories: selCategories,
    });
    document.body.style.overflow = "";
    close();
    router.push(href);
  };

  const reset = () => {
    setSelBrands([]);
    if (!isDesktop) setSelCategories([]);
  };

  // Поиск по брендам: подстрока без учёта регистра.
  const needle = brandQuery.trim().toLowerCase();
  const visibleBrands = needle
    ? brands.filter((b) => b.toLowerCase().includes(needle))
    : brands;
  const grouped = !needle && brands.length > BRAND_GROUPING_THRESHOLD;
  const brandGroups = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of visibleBrands) {
      const key = grouped ? b.charAt(0).toUpperCase() : "";
      const bucket = map.get(key);
      if (bucket) bucket.push(b);
      else map.set(key, [b]);
    }
    return [...map.entries()].sort(([a], [b]) => compareNames(a, b));
  }, [visibleBrands, grouped]);

  const mobileBadge = applied.brands.length + applied.categories.length;
  const desktopLabel =
    applied.brands.length === 0
      ? "Бренд"
      : applied.brands.length === 1
        ? applied.brands[0]
        : `Бренды · ${applied.brands.length}`;

  return (
    <details
      ref={detailsRef}
      onToggle={onToggle}
      data-filter-sheet
      className={cn("group/sheet lg:relative", className)}
    >
      <summary
        className={cn(
          "flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border bg-white px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground group-open/sheet:border-foreground [&::-webkit-details-marker]:hidden",
          mobileBadge > 0 ? "border-foreground" : "border-ink-line",
          applied.brands.length > 0 ? "lg:border-foreground" : "lg:border-ink-line"
        )}
        aria-label="Фильтры по бренду и категории"
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 lg:hidden" />
        <span className="lg:hidden">Фильтры</span>
        {mobileBadge > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1.5 text-xs font-semibold text-white lg:hidden">
            {mobileBadge}
          </span>
        )}
        <span className="hidden max-w-[200px] truncate lg:inline">{desktopLabel}</span>
        <ChevronDown className="hidden h-4 w-4 shrink-0 text-ink-muted transition-transform group-open/sheet:rotate-180 lg:block" />
      </summary>

      {/* Затемнение под нижним листом (только мобильные) */}
      <div
        aria-hidden
        onClick={close}
        className="fixed inset-0 z-0 bg-black/40 animate-in fade-in-0 lg:hidden"
      />

      <form
        action={`${PRODUCTS_PATH}${CATALOG_ANCHOR}`}
        method="get"
        onSubmit={apply}
        aria-label="Фильтры каталога"
        className={cn(
          // мобильный: нижний лист
          "fixed inset-x-0 bottom-0 z-10 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-pop animate-in slide-in-from-bottom-8 fade-in-0",
          // десктоп: выпадающая панель
          "lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-0 lg:top-full lg:mt-2 lg:max-h-[min(72vh,600px)] lg:w-[380px] lg:rounded-2xl lg:border lg:border-ink-hair lg:slide-in-from-bottom-0 lg:slide-in-from-top-1"
        )}
      >
        {applied.q && <input type="hidden" name="q" value={applied.q} />}

        {/* Шапка листа (мобильные) */}
        <div className="relative flex items-center justify-between border-b border-ink-hair px-5 pb-3 pt-5 lg:hidden">
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 lg:p-3">
          {/* Категории — в листе только на мобильных; на десктопе они чипами в тулбаре */}
          <fieldset className="mb-6 lg:hidden">
            <legend className="mb-3 text-sm font-semibold">Категория</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map(({ value, label }) => {
                const checked = selCategories.includes(value);
                const count = byCategory.get(value) ?? 0;
                return (
                  <label
                    key={value}
                    className={cn(
                      "inline-flex h-10 cursor-pointer select-none items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground has-[:focus-visible]:ring-offset-2",
                      checked
                        ? "border-foreground bg-foreground text-white"
                        : "border-ink-hair text-foreground hover:border-foreground",
                      !checked && count === 0 && "opacity-40"
                    )}
                  >
                    <input
                      type="checkbox"
                      name="category"
                      value={value}
                      checked={checked}
                      onChange={() => setSelCategories((s) => toggleValue(s, value))}
                      className="sr-only"
                    />
                    {label}
                    <span className={checked ? "text-white/70" : "text-ink-muted"}>{count}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold lg:sr-only">Бренд</legend>

            {brands.length > 6 && (
              <div className="relative mb-3">
                <label htmlFor={`${idPrefix}-brand-search`} className="sr-only">
                  Найти бренд
                </label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  id={`${idPrefix}-brand-search`}
                  type="search"
                  value={brandQuery}
                  onChange={(e) => setBrandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter в поиске бренда не должен применять фильтр
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Найти бренд"
                  autoComplete="off"
                  className="h-11 w-full rounded-lg border border-transparent bg-ink-wash pl-10 pr-4 text-[15px] text-foreground transition-colors placeholder:text-ink-muted hover:border-ink-line focus-visible:border-foreground focus-visible:bg-white focus-visible:outline-none"
                />
              </div>
            )}

            {/* Выбранные бренды — всегда на виду, даже если скрыты поиском */}
            {selBrands.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selBrands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelBrands((s) => s.filter((x) => x !== b))}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink-wash pl-3 pr-2 text-sm font-medium transition-colors hover:bg-ink-hair"
                  >
                    {b}
                    <X className="h-3.5 w-3.5 text-ink-muted" aria-label={`Убрать ${b}`} />
                  </button>
                ))}
              </div>
            )}

            {visibleBrands.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-muted">
                Бренд «{brandQuery.trim()}» не найден
              </p>
            ) : (
              <div className="-mx-2">
                {brandGroups.map(([letter, items]) => (
                  <div key={letter || "all"}>
                    {letter && (
                      <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        {letter}
                      </p>
                    )}
                    <ul>
                      {items.map((b) => {
                        const checked = selBrands.includes(b);
                        const count = byBrand.get(b) ?? 0;
                        return (
                          <li key={b}>
                            <label
                              className={cn(
                                "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-2 text-[15px] transition-colors hover:bg-ink-wash lg:min-h-10 lg:text-sm",
                                checked && "font-semibold",
                                !checked && count === 0 && "opacity-40"
                              )}
                            >
                              <input
                                type="checkbox"
                                name="brand"
                                value={b}
                                checked={checked}
                                onChange={() => setSelBrands((s) => toggleValue(s, b))}
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
                              <span className="flex-1 truncate">{b}</span>
                              <span className="font-normal text-ink-muted">{count}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        </div>

        {/* Подвал: сброс + применение с живым счётчиком */}
        <div className="flex items-center gap-3 border-t border-ink-hair px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-3">
          <button
            type="button"
            onClick={reset}
            disabled={selBrands.length === 0 && (isDesktop || selCategories.length === 0)}
            className="h-11 shrink-0 rounded-lg px-3 text-sm font-semibold underline underline-offset-4 transition-colors hover:bg-ink-wash disabled:cursor-default disabled:text-ink-faint disabled:no-underline disabled:hover:bg-transparent"
          >
            Сбросить
          </button>
          <button
            type="submit"
            disabled={total === 0}
            className={cn(
              "ml-auto inline-flex h-11 flex-1 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition-opacity lg:flex-none",
              total === 0 ? "cursor-not-allowed bg-ink-faint" : "bg-foreground hover:opacity-90",
              dirty && total > 0 && "bg-gradient-cta"
            )}
          >
            {total === 0
              ? "Ничего не найдено"
              : `Показать ${total} ${pluralRu(total, "средство", "средства", "средств")}`}
          </button>
        </div>
      </form>
    </details>
  );
}
