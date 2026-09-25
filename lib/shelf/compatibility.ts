/**
 * Логика «Моей полки» (часть 6/8): матрица совместимости активов,
 * порядок нанесения (утро/вечер) и поиск дублей.
 * Чистые функции — тестируются без БД.
 */

export interface ShelfActive {
  id: string;
  slug: string;
  displayName: string;
  category: string; // active, uv-filter, peeling, ...
}

export interface ShelfProductInput {
  id: string;
  title: string;
  category: string; // категория продукта (serum, cream, spf, toner, ...) или "custom"
  actives: ShelfActive[];
}

export interface ConflictEdge {
  ingredientAId: string;
  ingredientBId: string;
  severity: string; // high | medium | low
  reason: string;
  aName: string;
  bName: string;
}

export type PairStatus = "conflict" | "spread" | "ok";

export interface PairResult {
  productAId: string;
  productBId: string;
  aTitle: string;
  bTitle: string;
  status: PairStatus;
  conflicts: {
    severity: string;
    reason: string;
    aName: string;
    bName: string;
  }[];
  note: string | null;
}

export interface DuplicateGroup {
  productIds: string[];
  titles: string[];
  sharedActives: { slug: string; displayName: string }[];
}

export interface RoutineStep {
  order: number;
  productId: string;
  title: string;
  why: string;
}

export interface Routine {
  morning: RoutineStep[];
  evening: RoutineStep[];
  notes: string[];
}

/** Активы, которые нельзя оставлять в одном приёме с ретиноидами. */
const RETINOID_SLUGS = new Set(["retinol", "adapalene", "tretinoin"]);
const ACID_SLUGS = new Set([
  "glycolic-acid",
  "lactic-acid",
  "salicylic-acid",
  "mandelic-acid",
]);

const SEVERITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function activesKey(set: Set<string>): string {
  return [...set].sort().join("|");
}

/**
 * Попарная проверка всех средств «использую».
 * Статус пары: conflict — есть записи IngredientConflict;
 * spread — в паре нет активов с обеих сторон (правило «разнести по времени суток»);
 * ok — активы есть, конфликтов не найдено.
 */
export function buildCompatibilityMatrix(
  products: ShelfProductInput[],
  edges: ConflictEdge[],
): PairResult[] {
  const results: PairResult[] = [];
  for (let i = 0; i < products.length; i += 1) {
    for (let j = i + 1; j < products.length; j += 1) {
      const a = products[i];
      const b = products[j];
      const aIds = new Set(a.actives.map((x) => x.id));
      const bIds = new Set(b.actives.map((x) => x.id));

      const hits = edges
        .filter(
          (e) =>
            (aIds.has(e.ingredientAId) && bIds.has(e.ingredientBId)) ||
            (aIds.has(e.ingredientBId) && bIds.has(e.ingredientAId)),
        )
        .sort(
          (x, y) =>
            (SEVERITY_RANK[y.severity] ?? 0) - (SEVERITY_RANK[x.severity] ?? 0),
        )
        .map((e) => ({
          severity: e.severity,
          reason: e.reason,
          aName: e.aName,
          bName: e.bName,
        }));

      let status: PairStatus = "ok";
      let note: string | null = null;
      if (hits.length > 0) {
        status = "conflict";
        note = hits.some((h) => h.severity === "high")
          ? "Есть критичный конфликт активов — не наносите в один приём."
          : "Есть умеренный конфликт — разнесите по времени или дням.";
      } else if (a.actives.length === 0 || b.actives.length === 0) {
        status = "spread";
        note =
          "Активы не распознаны у одного из средств — на всякий случай разнесите по времени суток.";
      }

      results.push({
        productAId: a.id,
        productBId: b.id,
        aTitle: a.title,
        bTitle: b.title,
        status,
        conflicts: hits,
        note,
      });
    }
  }
  return results;
}

/** Дубли: средства с пересечением ключевых активов ≥ 2. */
export function findDuplicates(
  products: ShelfProductInput[],
  minShared = 2,
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < products.length; i += 1) {
    for (let j = i + 1; j < products.length; j += 1) {
      const a = products[i];
      const b = products[j];
      const bSlugs = new Set(b.actives.map((x) => x.slug));
      const shared = a.actives.filter((x) => bSlugs.has(x.slug));
      if (shared.length >= minShared) {
        const key = activesKey(new Set([a.id, b.id]));
        if (seen.has(key)) continue;
        seen.add(key);
        groups.push({
          productIds: [a.id, b.id],
          titles: [a.title, b.title],
          sharedActives: shared.map((x) => ({
            slug: x.slug,
            displayName: x.displayName,
          })),
        });
      }
    }
  }
  return groups;
}

function hasAny(product: ShelfProductInput, slugs: Set<string>): boolean {
  return product.actives.some((x) => slugs.has(x.slug));
}

function isSpf(product: ShelfProductInput): boolean {
  return (
    product.category === "spf" ||
    product.actives.some((x) => x.category === "uv-filter")
  );
}

function isRetinoid(product: ShelfProductInput): boolean {
  return hasAny(product, RETINOID_SLUGS);
}

function isAcid(product: ShelfProductInput): boolean {
  return product.category === "peeling" || hasAny(product, ACID_SLUGS);
}

/** Порядок слоёв внутри одного приёма: от лёгких текстур к плотным. */
function layerRank(product: ShelfProductInput): number {
  switch (product.category) {
    case "toner":
      return 1;
    case "serum":
      return 2;
    case "treatment":
    case "peeling":
      return 3;
    case "cream":
      return 4;
    case "spf":
      return 5;
    default:
      return 3; // custom и прочие — как treatment
  }
}

function whyFor(product: ShelfProductInput, period: "morning" | "evening"): string {
  if (isSpf(product)) return "Завершает утренний уход — защита от УФ.";
  if (isRetinoid(product))
    return "Ретиноид: только вечером, фотосенсибилизирует.";
  if (isAcid(product))
    return "Кислоты: вечером, повышают фоточувствительность.";
  if (period === "morning" && hasAny(product, new Set(["ascorbic-acid"])))
    return "Витамин C работает в паре с SPF — утром.";
  if (product.category === "cream") return "Плотная текстура — после сывороток.";
  return period === "morning"
    ? "Поддерживающий шаг утреннего ухода."
    : "Поддерживающий шаг вечернего ухода.";
}

/**
 * Режим утро/вечер по средствам «использую».
 * SPF — утром последним; ретиноиды — вечером; кислоты — вечером,
 * но НЕ в один приём с ретиноидом (выносятся в notes с чередованием).
 */
export function buildRoutine(
  products: ShelfProductInput[],
  skinType?: string | null,
): Routine {
  const notes: string[] = [];
  const morningPool: ShelfProductInput[] = [];
  const eveningPool: ShelfProductInput[] = [];
  const acidAlternates: ShelfProductInput[] = [];

  const hasRetinoid = products.some(isRetinoid);

  for (const p of products) {
    if (isSpf(p)) {
      morningPool.push(p);
    } else if (isRetinoid(p)) {
      eveningPool.push(p);
    } else if (isAcid(p)) {
      if (hasRetinoid) acidAlternates.push(p);
      else eveningPool.push(p);
    } else {
      morningPool.push(p);
      eveningPool.push(p);
    }
  }

  if (acidAlternates.length > 0) {
    notes.push(
      `${acidAlternates.map((p) => p.title).join(", ")}: кислоты не сочетаются с ретиноидом в один приём — используйте в свободные от ретинола вечера (чередование).`,
    );
  }
  if (hasRetinoid && !products.some(isSpf)) {
    notes.push(
      "В уходе есть ретиноид, но нет SPF — утренняя защита от солнца обязательна.",
    );
  }
  if (skinType === "sensitive") {
    notes.push(
      "Чувствительная кожа: вводите активы по одному, 2–3 раза в неделю.",
    );
  }

  const toSteps = (pool: ShelfProductInput[], period: "morning" | "evening") =>
    [...pool]
      .sort((a, b) => layerRank(a) - layerRank(b))
      .map((p, i) => ({
        order: i + 1,
        productId: p.id,
        title: p.title,
        why: whyFor(p, period),
      }));

  return {
    morning: toSteps(morningPool, "morning"),
    evening: toSteps(eveningPool, "evening"),
    notes,
  };
}
