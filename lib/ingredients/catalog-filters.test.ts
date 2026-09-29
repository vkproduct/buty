import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  countMatching,
  facetCounts,
  ingredientFiltersHref,
  isIndexableFilterPage,
  parseIngredientFilters,
  toggleValue,
  type IngredientFacetRow,
} from "./catalog-filters";

const known = { categories: ["active", "barrier", "emollient", "humectant"] };

const row = (
  category: string,
  evidence: IngredientFacetRow["evidence"],
  count: number,
  flags: Partial<Pick<IngredientFacetRow, "comedogenic" | "feedsMalassezia" | "fragranceAllergen">> = {}
): IngredientFacetRow => ({
  category,
  evidence,
  comedogenic: false,
  feedsMalassezia: false,
  fragranceAllergen: false,
  ...flags,
  count,
});

const rows: IngredientFacetRow[] = [
  row("active", "STRONG", 5),
  row("active", "LIMITED", 2),
  row("humectant", "STRONG", 3),
  row("emollient", "MODERATE", 4, { comedogenic: true, feedsMalassezia: true }),
  row("emollient", "LIMITED", 6, { feedsMalassezia: true }),
  row("barrier", "MODERATE", 1),
];

describe("parseIngredientFilters", () => {
  it("принимает старые ссылки: одиночные параметры и флаги через запятую", () => {
    const f = parseIngredientFilters(
      { category: "humectant", evidence: "STRONG", flags: "fragranceAllergen,comedogenic" },
      known
    );
    expect(f).toEqual({
      q: "",
      categories: ["humectant"],
      evidence: ["STRONG"],
      flags: ["comedogenic", "fragranceAllergen"],
    });
  });

  it("принимает повторяющиеся параметры, убирает дубли и неизвестные значения", () => {
    const f = parseIngredientFilters(
      {
        category: ["emollient", "active", "emollient", "nope"],
        evidence: ["limited", "STRONG", "WRONG"],
        flag: ["feedsMalassezia", "hack"],
        flags: "comedogenic",
      },
      known
    );
    expect(f.categories).toEqual(["active", "emollient"]);
    expect(f.evidence).toEqual(["STRONG", "LIMITED"]);
    expect(f.flags).toEqual(["comedogenic", "feedsMalassezia"]);
  });

  it("обрезает поиск и берёт первое значение", () => {
    expect(parseIngredientFilters({ q: ["  ниацинамид ", "x"] }, known).q).toBe("ниацинамид");
  });
});

describe("ingredientFiltersHref", () => {
  const base = parseIngredientFilters(
    { q: "acid", category: ["humectant", "active"], evidence: "MODERATE", flag: "comedogenic" },
    known
  );

  it("собирает нормализованный URL с повторяющимися параметрами и якорем", () => {
    expect(ingredientFiltersHref(base)).toBe(
      "/ingredients?q=acid&category=active&category=humectant&evidence=MODERATE&flag=comedogenic#catalog"
    );
  });

  it("patch заменяет поля, пустой набор — чистый путь", () => {
    expect(
      ingredientFiltersHref(
        base,
        { q: "", categories: [], evidence: [], flags: [] },
        { anchor: false }
      )
    ).toBe("/ingredients");
  });
});

describe("countMatching / facetCounts", () => {
  const none = { categories: [], evidence: [], flags: [] };

  it("без фильтров — все ингредиенты", () => {
    expect(countMatching(rows, none)).toBe(21);
  });

  it("внутри измерения — ИЛИ, между измерениями — И", () => {
    expect(countMatching(rows, { ...none, categories: ["active", "humectant"] })).toBe(10);
    expect(
      countMatching(rows, { categories: ["active", "emollient"], evidence: ["LIMITED"], flags: [] })
    ).toBe(8);
    expect(countMatching(rows, { ...none, flags: ["comedogenic", "feedsMalassezia"] })).toBe(10);
    expect(countMatching(rows, { ...none, evidence: ["STRONG"], flags: ["comedogenic"] })).toBe(0);
  });

  it("выбор в измерении не обнуляет счётчики этого же измерения", () => {
    const { byCategory, byEvidence, byFlag } = facetCounts(rows, {
      categories: ["emollient"],
      evidence: ["MODERATE"],
      flags: [],
    });
    // категории считаются при evidence=MODERATE
    expect(byCategory.get("emollient")).toBe(4);
    expect(byCategory.get("barrier")).toBe(1);
    expect(byCategory.get("active")).toBeUndefined();
    // доказательность считается при category=emollient
    expect(byEvidence.get("MODERATE")).toBe(4);
    expect(byEvidence.get("LIMITED")).toBe(6);
    // флаги — при обоих фильтрах
    expect(byFlag.get("comedogenic")).toBe(4);
    expect(byFlag.get("feedsMalassezia")).toBe(4);
    expect(byFlag.get("fragranceAllergen")).toBeUndefined();
  });
});

describe("isIndexableFilterPage / activeFilterCount / toggleValue", () => {
  it("индексируем только каталог и посадочную одной категории", () => {
    const f = (p: object) => parseIngredientFilters(p, known);
    expect(isIndexableFilterPage(f({}))).toBe(true);
    expect(isIndexableFilterPage(f({ category: "humectant" }))).toBe(true);
    expect(isIndexableFilterPage(f({ category: ["humectant", "active"] }))).toBe(false);
    expect(isIndexableFilterPage(f({ category: "humectant", evidence: "STRONG" }))).toBe(false);
    expect(isIndexableFilterPage(f({ flag: "comedogenic" }))).toBe(false);
    expect(isIndexableFilterPage(f({ q: "acid" }))).toBe(false);
  });

  it("считает активные фильтры без поиска и переключает значения", () => {
    expect(
      activeFilterCount({ categories: ["a", "b"], evidence: ["STRONG"], flags: ["comedogenic"] })
    ).toBe(4);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
  });
});
