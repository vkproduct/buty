import { describe, expect, it } from "vitest";

import {
  baseProductName,
  classifyInputLine,
  decideType,
  NON_COSMETIC_TYPE,
  normalizeTypeResult,
  PRODUCT_TYPE_CATEGORIES,
  type TypeCacheRow,
  typeFingerprint,
  validateTypeResult,
} from "./product-type";

describe("PRODUCT_TYPE_CATEGORIES", () => {
  it("содержит все категории из PRODUCT_CATEGORY_ORDER", () => {
    expect(PRODUCT_TYPE_CATEGORIES).toContain("cleanser");
    expect(PRODUCT_TYPE_CATEGORIES).toContain("other");
    expect(PRODUCT_TYPE_CATEGORIES).toHaveLength(13);
  });
});

describe("classifyInputLine", () => {
  it("формат: sku | brand | name без бренда | первые 15 токенов", () => {
    const line = classifyInputLine({
      sku: "ga123",
      brand: "TEFIA",
      name: "TEFIA AMBIENT ANTI YELLOW Cool Violet",
      inci: "Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine",
    });
    expect(line).toBe(
      "ga123 | TEFIA | AMBIENT ANTI YELLOW Cool Violet | aqua, sodium laureth sulfate, cocamidopropyl betaine",
    );
  });

  it("берёт только первые 15 токенов INCI", () => {
    const inci = Array.from({ length: 20 }, (_, i) => `ingredient${i}`).join(", ");
    const line = classifyInputLine({ sku: "s", brand: "B", name: "N", inci });
    expect(line.split(" | ")[3]).toBe(
      Array.from({ length: 15 }, (_, i) => `ingredient${i}`).join(", "),
    );
  });

  it("заменяет | внутри полей на / и обрезает до 600 символов", () => {
    const line = classifyInputLine({
      sku: "s|1",
      brand: "B|B",
      name: `B|B ${"длинное название ".repeat(100)}`,
      inci: "aqua",
    });
    expect(line).not.toContain("s|1");
    expect(line).toContain("s/1");
    expect(line.length).toBeLessThanOrEqual(600);
  });

  it("не дублирует бренд в названии", () => {
    const line = classifyInputLine({ sku: "s", brand: "Styx", name: "Styx Жожоба", inci: "" });
    expect(line.split(" | ")[2]).toBe("Жожоба");
  });
});

describe("validateTypeResult", () => {
  const ok = { sku: "ga1", type: "Шампунь", category: "hair", confidence: 0.9 };

  it("принимает валидный результат, type в нижнем регистре", () => {
    expect(validateTypeResult(ok, "TEFIA")).toEqual({
      sku: "ga1",
      type: "шампунь",
      category: "hair",
      confidence: 0.9,
    });
  });

  it("отклоняет категорию не из списка", () => {
    expect(validateTypeResult({ ...ok, category: "body" }, "B")).toBeNull();
  });

  it("отклоняет пустой и слишком длинный type", () => {
    expect(validateTypeResult({ ...ok, type: "  " }, "B")).toBeNull();
    expect(validateTypeResult({ ...ok, type: "средство ".repeat(10) }, "B")).toBeNull();
  });

  it("отклоняет type с латиницей, цифрами и кавычками", () => {
    expect(validateTypeResult({ ...ok, type: "shampoo" }, "B")).toBeNull();
    expect(validateTypeResult({ ...ok, type: "крем 2 в 1" }, "B")).toBeNull();
    expect(validateTypeResult({ ...ok, type: 'крем "эффект"' }, "B")).toBeNull();
  });

  it("отклоняет type с брендом продукта без учёта регистра", () => {
    expect(validateTypeResult({ ...ok, type: "шампунь tefia" }, "TEFIA")).toBeNull();
    expect(validateTypeResult({ ...ok, type: "шампунь матрикс" }, "Матрикс")).toBeNull();
  });

  it("отклоняет запрещённые обещания эффекта", () => {
    for (const type of ["лечит кожу", "избавит от акне", "средство от прыщей", "маска от выпадения"]) {
      expect(validateTypeResult({ ...ok, type }, "B")).toBeNull();
    }
  });

  it("отклоняет confidence вне [0, 1] или не число", () => {
    expect(validateTypeResult({ ...ok, confidence: 1.5 }, "B")).toBeNull();
    expect(validateTypeResult({ ...ok, confidence: -0.1 }, "B")).toBeNull();
    expect(validateTypeResult({ ...ok, confidence: "0.9" }, "B")).toBeNull();
    expect(validateTypeResult({ ...ok, confidence: Number.NaN }, "B")).toBeNull();
  });

  it("отклоняет не-объекты и отсутствующий sku", () => {
    expect(validateTypeResult(null, "B")).toBeNull();
    expect(validateTypeResult("строка", "B")).toBeNull();
    expect(validateTypeResult({ ...ok, sku: "" }, "B")).toBeNull();
    expect(validateTypeResult({ type: "крем", category: "cream", confidence: 0.5 }, "B")).toBeNull();
  });
});

describe("typeFingerprint", () => {
  it("стабилен для одинаковых входных данных", () => {
    const p = { sku: "ga1", brand: "TEFIA", name: "Cool Violet", inci: "Aqua, Parfum" };
    expect(typeFingerprint(p)).toBe(typeFingerprint({ ...p }));
    expect(typeFingerprint(p)).toMatch(/^[0-9a-f]{40}$/);
  });

  it("меняется при изменении состава или названия, не зависит от sku", () => {
    const p = { sku: "ga1", brand: "TEFIA", name: "Cool Violet", inci: "Aqua, Parfum" };
    const base = typeFingerprint(p);
    expect(typeFingerprint({ ...p, inci: "Aqua, Alcohol" })).not.toBe(base);
    expect(typeFingerprint({ ...p, name: "Other Name" })).not.toBe(base);
    expect(typeFingerprint({ ...p, sku: "ga2" })).toBe(base);
  });

  it("одинаков для «X», «X · вариант 2» и «X (маска для волос)» при одинаковом составе", () => {
    const p = { sku: "ga1", brand: "TEFIA", name: "Cool Violet", inci: "Aqua, Parfum" };
    const base = typeFingerprint(p);
    expect(typeFingerprint({ ...p, name: "Cool Violet · вариант 2" })).toBe(base);
    expect(typeFingerprint({ ...p, name: "Cool Violet · вариант 12" })).toBe(base);
    expect(typeFingerprint({ ...p, name: "Cool Violet (маска для волос)" })).toBe(base);
  });
});

describe("baseProductName", () => {
  it("отрезает суффиксы вариантов", () => {
    expect(baseProductName("11 PM · вариант 2")).toBe("11 PM");
    expect(baseProductName("ОМОЛОЖЕНИЕ И ЛИФТИНГ · вариант 2")).toBe("ОМОЛОЖЕНИЕ И ЛИФТИНГ");
    expect(baseProductName("Cool Violet (маска для волос)")).toBe("Cool Violet");
    expect(baseProductName("Обычное название")).toBe("Обычное название");
  });
});

describe("normalizeTypeResult", () => {
  const base = { sku: "ga1", type: "крем", category: "cream", confidence: 0.9 };

  it("приводит типы к каноническим", () => {
    const cases: Array<[string, string]> = [
      ["шампунь для волос", "шампунь"],
      ["кондиционер", "кондиционер для волос"],
      ["тоник для лица", "тоник"],
      ["тушь", "тушь для ресниц"],
      ["лак", "лак для ногтей"],
      ["гель для умывания лица", "гель для умывания"],
      ["пенка для умывания лица", "пенка для умывания"],
      ["мыло для рук", "мыло"],
    ];
    for (const [from, to] of cases) {
      expect(normalizeTypeResult({ ...base, type: from }).type).toBe(to);
    }
  });

  it("не трогает типы вне словаря", () => {
    expect(normalizeTypeResult(base).type).toBe("крем");
    expect(normalizeTypeResult({ ...base, type: "шампунь" }).type).toBe("шампунь");
  });

  it("скраб/пилинг/гоммаж с category other → peeling", () => {
    for (const type of ["скраб для тела", "пилинг для лица", "гоммаж"]) {
      const r = normalizeTypeResult({ ...base, type, category: "other" });
      expect(r.category).toBe("peeling");
    }
  });

  it("скраб с осмысленной категорией не трогает", () => {
    expect(normalizeTypeResult({ ...base, type: "скраб для тела", category: "peeling" }).category).toBe("peeling");
    expect(normalizeTypeResult({ ...base, type: "скраб для губ", category: "makeup" }).category).toBe("makeup");
  });
});

describe("decideType", () => {
  const fp = "f".repeat(40);
  const rec = (over: Partial<TypeCacheRow> = {}): TypeCacheRow => ({
    sku: "s1",
    fingerprint: fp,
    promptVersion: 3,
    type: "шампунь",
    category: "hair",
    confidence: 0.9,
    ...over,
  });

  it("ветка 1: запись есть, fingerprint совпадает, confidence ≥ 0.6 → ИИ", () => {
    expect(decideType(rec(), fp, "other")).toEqual({
      category: "hair",
      categorySource: "ai",
      productType: "шампунь",
      nonCosmetic: false,
    });
  });

  it("ветка 2: confidence < 0.6, категория записи совпала с правилами → тип сохраняется", () => {
    expect(decideType(rec({ confidence: 0.5, category: "hair", type: "маска для волос" }), fp, "hair")).toEqual({
      category: "hair",
      categorySource: "rules",
      productType: "маска для волос",
      nonCosmetic: false,
    });
  });

  it("ветка 3: confidence < 0.6, категория записи не совпала с правилами → типа нет", () => {
    expect(decideType(rec({ confidence: 0.5 }), fp, "other")).toEqual({
      category: "other",
      categorySource: "rules",
      productType: null,
      nonCosmetic: false,
    });
  });

  it("ветка 4: записи нет или fingerprint другой → правила, типа нет", () => {
    expect(decideType(undefined, fp, "cream")).toEqual({
      category: "cream",
      categorySource: "rules",
      productType: null,
      nonCosmetic: false,
    });
    expect(decideType(rec({ fingerprint: "0".repeat(40) }), fp, "cream")).toEqual({
      category: "cream",
      categorySource: "rules",
      productType: null,
      nonCosmetic: false,
    });
  });

  it("не-косметика с confidence ≥ 0.6 → nonCosmetic, типа нет, категория other", () => {
    expect(decideType(rec({ type: NON_COSMETIC_TYPE, category: "other" }), fp, "other")).toEqual({
      category: "other",
      categorySource: "ai",
      productType: null,
      nonCosmetic: true,
    });
  });

  it("не-косметика с confidence 0.5 остаётся видимой: nonCosmetic = false", () => {
    const d = decideType(rec({ type: NON_COSMETIC_TYPE, category: "other", confidence: 0.5 }), fp, "other");
    expect(d.nonCosmetic).toBe(false);
    expect(d.productType).toBeNull();
    expect(d.category).toBe("other");
  });
});
