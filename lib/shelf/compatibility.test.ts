import { describe, expect, it } from "vitest";

import {
  buildCompatibilityMatrix,
  buildRoutine,
  findDuplicates,
  type ConflictEdge,
  type ShelfProductInput,
} from "./compatibility";

function active(id: string, slug: string, category = "active") {
  return { id, slug, displayName: slug, category };
}

const spf: ShelfProductInput = {
  id: "p-spf",
  title: "SPF 50",
  category: "spf",
  actives: [active("i-uv", "uv-filter-x", "uv-filter")],
};

const retinolSerum: ShelfProductInput = {
  id: "p-ret",
  title: "Ретинол 0.5%",
  category: "serum",
  actives: [active("i-ret", "retinol"), active("i-nia", "niacinamide")],
};

const ahaToner: ShelfProductInput = {
  id: "p-aha",
  title: "AHA-тонер",
  category: "toner",
  actives: [active("i-aha", "glycolic-acid")],
};

const niaSerum: ShelfProductInput = {
  id: "p-nia",
  title: "Ниацинамид 10%",
  category: "serum",
  actives: [active("i-nia", "niacinamide")],
};

const creamNoActives: ShelfProductInput = {
  id: "p-cream",
  title: "Крем",
  category: "cream",
  actives: [],
};

const retCream: ShelfProductInput = {
  id: "p-ret-cream",
  title: "Крем с ретинолом",
  category: "cream",
  actives: [active("i-ret", "retinol"), active("i-nia", "niacinamide")],
};

const RET_AHA_EDGE: ConflictEdge = {
  ingredientAId: "i-aha",
  ingredientBId: "i-ret",
  severity: "high",
  reason: "Суммарное раздражение, риск повреждения барьера",
  aName: "Гликолевая кислота",
  bName: "Ретинол",
};

describe("buildCompatibilityMatrix", () => {
  it("находит конфликт пары по IngredientConflict", () => {
    const pairs = buildCompatibilityMatrix([retinolSerum, ahaToner], [
      RET_AHA_EDGE,
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].status).toBe("conflict");
    expect(pairs[0].conflicts).toHaveLength(1);
    expect(pairs[0].conflicts[0].severity).toBe("high");
  });

  it("пара, где у средства нет сильных активов, — ok с пояснением", () => {
    const pairs = buildCompatibilityMatrix([niaSerum, creamNoActives], []);
    expect(pairs[0].status).toBe("ok");
    expect(pairs[0].note).toContain("можно сочетать");
  });

  it("неизвестный состав — «разнести по времени суток»", () => {
    const unknown: ShelfProductInput = {
      id: "p-unknown",
      title: "Без состава",
      category: "custom",
      actives: [],
      hasComposition: false,
    };
    const pairs = buildCompatibilityMatrix([niaSerum, unknown], []);
    expect(pairs[0].status).toBe("spread");
    expect(pairs[0].note).toContain("«Без состава»");
    expect(pairs[0].note).toContain("разнесите средства по времени суток");
  });

  it("пара с активами без конфликтов — ok", () => {
    const pairs = buildCompatibilityMatrix([niaSerum, spf], []);
    expect(pairs[0].status).toBe("ok");
    expect(pairs[0].conflicts).toHaveLength(0);
  });

  it("матрица покрывает все пары без повторов", () => {
    const pairs = buildCompatibilityMatrix(
      [spf, retinolSerum, ahaToner, niaSerum],
      [RET_AHA_EDGE],
    );
    expect(pairs).toHaveLength(6); // C(4,2)
    expect(pairs.filter((p) => p.status === "conflict")).toHaveLength(1);
  });

  it("неполный состав (< 80% распознано) — вывод помечается оговоркой", () => {
    const partial: ShelfProductInput = {
      id: "p-partial",
      title: "Крем из INCIDB",
      category: "cream",
      actives: [active("i-nia", "niacinamide")],
      compositionComplete: false,
    };
    const pairs = buildCompatibilityMatrix([niaSerum, partial], []);
    expect(pairs[0].status).toBe("ok");
    expect(pairs[0].note).toContain("распознан не полностью");
    // конфликт тоже дополняется оговоркой
    const conflictPairs = buildCompatibilityMatrix(
      [{ ...ahaToner }, { ...partial, actives: [active("i-ret", "retinol")] }],
      [RET_AHA_EDGE],
    );
    expect(conflictPairs[0].status).toBe("conflict");
    expect(conflictPairs[0].note).toContain("распознан не полностью");
    // состав без распознанного ни одного ингредиента — прежнее правило spread
    const unknown: ShelfProductInput = {
      ...partial,
      id: "p-unknown-2",
      hasComposition: false,
    };
    const spreadPairs = buildCompatibilityMatrix([niaSerum, unknown], []);
    expect(spreadPairs[0].note).not.toContain("распознан не полностью");
  });
});

describe("findDuplicates", () => {
  it("находит дубли при пересечении активов ≥ 2", () => {
    const dups = findDuplicates([retinolSerum, retCream, niaSerum]);
    expect(dups).toHaveLength(1);
    expect(dups[0].productIds).toEqual([retinolSerum.id, retCream.id]);
    expect(dups[0].sharedActives).toHaveLength(2);
  });

  it("не считает дублем пересечение в 1 актив", () => {
    const dups = findDuplicates([retinolSerum, niaSerum]);
    expect(dups).toHaveLength(0);
  });

  it("дубль с неполным составом помечается incomplete", () => {
    const partial = { ...retCream, compositionComplete: false };
    expect(findDuplicates([retinolSerum, partial])[0].incomplete).toBe(true);
    expect(findDuplicates([retinolSerum, retCream])[0].incomplete).toBe(false);
  });
});

describe("buildRoutine", () => {
  it("утро: SPF последним шагом", () => {
    const routine = buildRoutine([niaSerum, spf, retinolSerum]);
    const morningTitles = routine.morning.map((s) => s.productId);
    expect(morningTitles[morningTitles.length - 1]).toBe("p-spf");
    expect(routine.morning.some((s) => s.productId === "p-ret")).toBe(false);
  });

  it("вечер: ретинол есть, AHA в том же приёме нет", () => {
    const routine = buildRoutine([ahaToner, retinolSerum, niaSerum]);
    const eveningIds = routine.evening.map((s) => s.productId);
    expect(eveningIds).toContain("p-ret");
    expect(eveningIds).not.toContain("p-aha");
    expect(routine.notes.join(" ")).toContain("чередование");
  });

  it("без ретинола кислоты идут в вечерний приём", () => {
    const routine = buildRoutine([ahaToner, niaSerum]);
    const eveningIds = routine.evening.map((s) => s.productId);
    expect(eveningIds).toContain("p-aha");
  });

  it("предупреждает о ретиноиде без SPF", () => {
    const routine = buildRoutine([retinolSerum]);
    expect(routine.notes.join(" ")).toContain("SPF");
  });

  it("сортирует слои: тонер раньше крема", () => {
    const routine = buildRoutine([creamNoActives, niaSerum]);
    // niaSerum (serum, rank 2) раньше cream (rank 4) в утреннем приёме
    const morningIds = routine.morning.map((s) => s.productId);
    expect(morningIds.indexOf("p-nia")).toBeLessThan(
      morningIds.indexOf("p-cream"),
    );
  });

  it("чувствительность — флаг профиля, а не только тип кожи", () => {
    const routine = buildRoutine([niaSerum], { skinType: "dry", sensitive: true });
    expect(routine.notes.join(" ")).toContain("Чувствительная кожа");
    expect(buildRoutine([niaSerum], "sensitive").notes.join(" ")).toContain(
      "Чувствительная кожа",
    );
  });

  it("беременность + ретиноид → предупреждение", () => {
    const routine = buildRoutine([retinolSerum, spf], {
      skinType: "normal",
      conditions: ["pregnancy"],
    });
    expect(routine.notes.join(" ")).toContain("беременности");
  });

  it("изотретиноин + кислоты → предупреждение", () => {
    const routine = buildRoutine([ahaToner], {
      skinType: "oily",
      conditions: ["isotretinoin"],
    });
    expect(routine.notes.join(" ")).toContain("изотретиноина");
  });

  it("без особых периодов лишних предупреждений нет", () => {
    const routine = buildRoutine([retinolSerum, spf], { skinType: "normal" });
    expect(routine.notes.join(" ")).not.toContain("беременности");
  });
});
