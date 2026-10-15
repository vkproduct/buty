import { describe, expect, it } from "vitest";

import {
  ALL_BRANDS,
  countMatching,
  facetCounts,
  isIndexableFilterPage,
  parseProductFilters,
  productFiltersHref,
  toggleValue,
  type FacetRow,
} from "./catalog-filters";

const known = {
  brands: ["CeraVe", "La Roche-Posay", "Paula's Choice", "The Ordinary"],
  categories: ["cream", "serum", "spf"],
};

const facets: FacetRow[] = [
  { brand: "CeraVe", category: "cream", count: 2 },
  { brand: "CeraVe", category: "serum", count: 1 },
  { brand: "The Ordinary", category: "serum", count: 4 },
  { brand: "La Roche-Posay", category: "spf", count: 1 },
];

describe("parseProductFilters", () => {
  it("принимает одиночный параметр (старые ссылки ?brand=)", () => {
    expect(parseProductFilters({ brand: "CeraVe" }, known).brands).toEqual(["CeraVe"]);
  });

  it("принимает повторяющиеся параметры, убирает дубли и неизвестные значения", () => {
    const f = parseProductFilters(
      {
        brand: ["The Ordinary", "cerave", "Unknown", "CeraVe"],
        category: ["serum", "serum", "nope"],
      },
      known
    );
    expect(f.brands).toEqual(["CeraVe", "The Ordinary"]);
    expect(f.categories).toEqual(["serum"]);
  });

  it("обрезает поиск и берёт первое значение", () => {
    expect(parseProductFilters({ q: ["  крем  ", "x"] }, known).q).toBe("крем");
  });
});

describe("productFiltersHref", () => {
  const base = parseProductFilters({ brand: "Paula's Choice", category: "serum" }, known);

  it("кодирует бренды с апострофом и пробелами, добавляет якорь", () => {
    expect(productFiltersHref(base)).toBe(
      "/products?brand=Paula%27s+Choice&category=serum#catalog"
    );
  });

  it("без фильтров — чистый путь", () => {
    expect(productFiltersHref(base, { brands: [], categories: [] }, { anchor: false })).toBe(
      "/products"
    );
  });

  it("порядок выбора не влияет на URL", () => {
    const a = productFiltersHref(base, { brands: ["The Ordinary", "CeraVe"] });
    const b = productFiltersHref(base, { brands: ["CeraVe", "The Ordinary"] });
    expect(a).toBe(b);
  });
});

describe("toggleValue", () => {
  it("добавляет и убирает", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("countMatching / facetCounts", () => {
  it("пустой выбор — все продукты", () => {
    expect(countMatching(facets, [], [])).toBe(8);
  });

  it("ИЛИ внутри измерения, И между измерениями", () => {
    expect(countMatching(facets, ["CeraVe", "The Ordinary"], [])).toBe(7);
    expect(countMatching(facets, ["CeraVe"], ["serum"])).toBe(1);
    expect(countMatching(facets, ["La Roche-Posay"], ["serum"])).toBe(0);
  });

  it("счётчики брендов учитывают категории, но не выбранные бренды", () => {
    const { byBrand, byCategory } = facetCounts(facets, ["CeraVe"], ["serum"]);
    expect(byBrand.get("The Ordinary")).toBe(4);
    expect(byBrand.get("La Roche-Posay")).toBeUndefined();
    expect(byCategory.get("cream")).toBe(2);
    expect(byCategory.get("serum")).toBe(1);
  });
});

// Сокращённый набор для клиента: строки только показанных в панели брендов
// (топ-50 + выбранные) + строки ALL_BRANDS с итогами по категориям по всем
// брендам. Бренд вне топ-50 докидывается из ответа /api/brands.
describe("countMatching / facetCounts на сокращённом наборе (ALL_BRANDS)", () => {
  // Полная матрица: CeraVe cream 2 + serum 1, The Ordinary serum 4,
  // La Roche-Posay spf 1, Weleda cream 3 (вне топ-50, в панель не входит).
  // Клиенту отдали: итоги по категориям + строки топ-брендов (без Weleda).
  const reduced: FacetRow[] = [
    { brand: ALL_BRANDS, category: "cream", count: 5 },
    { brand: ALL_BRANDS, category: "serum", count: 5 },
    { brand: ALL_BRANDS, category: "spf", count: 1 },
    { brand: "CeraVe", category: "cream", count: 2 },
    { brand: "CeraVe", category: "serum", count: 1 },
    { brand: "The Ordinary", category: "serum", count: 4 },
    { brand: "La Roche-Posay", category: "spf", count: 1 },
  ];

  it("ничего не выбрано — итоги по строкам ALL_BRANDS, без двойного счёта", () => {
    expect(countMatching(reduced, [], [])).toBe(11);
    const { byCategory } = facetCounts(reduced, [], []);
    expect(byCategory.get("cream")).toBe(5);
    expect(byCategory.get("serum")).toBe(5);
    expect(byCategory.get("spf")).toBe(1);
  });

  it("выбран бренд из топ-50 — сумма его строк, счётчики брендов по категориям", () => {
    expect(countMatching(reduced, ["CeraVe"], [])).toBe(3);
    const { byBrand, byCategory } = facetCounts(reduced, ["CeraVe"], []);
    expect(byBrand.get("The Ordinary")).toBe(4);
    expect(byCategory.get("cream")).toBe(2);
    expect(byCategory.get("serum")).toBe(1);
  });

  it("выбран бренд вне топ-50 — его строки докинуты из /api/brands", () => {
    const withFetched: FacetRow[] = [...reduced, { brand: "Weleda", category: "cream", count: 3 }];
    expect(countMatching(withFetched, ["Weleda"], [])).toBe(3);
    expect(countMatching(withFetched, ["Weleda"], ["cream"])).toBe(3);
    expect(countMatching(withFetched, ["Weleda"], ["serum"])).toBe(0);
    const { byCategory } = facetCounts(withFetched, ["Weleda"], []);
    expect(byCategory.get("cream")).toBe(3);
    expect(byCategory.get("serum")).toBeUndefined();
  });

  it("выбраны бренд + категория — пересечение", () => {
    expect(countMatching(reduced, ["The Ordinary"], ["serum"])).toBe(4);
    expect(countMatching(reduced, ["CeraVe"], ["spf"])).toBe(0);
    const { byBrand } = facetCounts(reduced, ["CeraVe"], ["serum"]);
    expect(byBrand.get("CeraVe")).toBe(1);
    expect(byBrand.get("The Ordinary")).toBe(4);
  });
});

describe("isIndexableFilterPage", () => {
  it("индексируем бренд, категорию и их пару", () => {
    expect(isIndexableFilterPage({ q: "", brands: ["CeraVe"], categories: ["serum"] })).toBe(true);
  });
  it("мультивыбор и поиск — noindex", () => {
    expect(isIndexableFilterPage({ q: "", brands: ["a", "b"], categories: [] })).toBe(false);
    expect(isIndexableFilterPage({ q: "крем", brands: [], categories: [] })).toBe(false);
  });
});
