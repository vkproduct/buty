import { describe, expect, it } from "vitest";

import { jaccard, resolveVariants, type VariantRow } from "./goldapple-dedupe";

const LABEL: Record<string, string> = { hair: "Шампунь", mask: "Маска", cream: "Крем" };
const label = (c: string) => LABEL[c];

const row = (
  sku: string,
  tokens: string[],
  category = "hair",
  name = "AMBIENT ANTI YELLOW",
  brand = "TEFIA"
): VariantRow => ({ sku, brand, name, tokens, category });

describe("jaccard", () => {
  it("идентичные множества → 1, непересекающиеся → 0, дубли токенов не считаются", () => {
    expect(jaccard(["a", "b"], ["b", "a", "a"])).toBe(1);
    expect(jaccard(["a"], ["b"])).toBe(0);
    expect(jaccard(["a", "b", "c"], ["a", "b"])).toBeCloseTo(2 / 3);
    expect(jaccard([], [])).toBe(1);
  });
});

describe("resolveVariants", () => {
  it("одинаковый состав (≥0.8) → дубль, импортируется только первый sku", () => {
    const base = Array.from({ length: 10 }, (_, i) => `t${i}`);
    const nearSame = [...base.slice(0, 9), "t99"]; // 10 из 11 общих ≈ 0.9
    const res = resolveVariants([row("1002", nearSame), row("1001", base)], label);
    expect(res.get("1001")!.duplicateOf).toBeNull();
    expect(res.get("1002")!.duplicateOf).toBe("1001");
  });

  it("разный состав и разные категории → суффикс категории у второго", () => {
    const a = row("1", ["a", "b", "c"], "hair");
    const b = row("2", ["x", "y", "z"], "mask");
    const res = resolveVariants([a, b], label);
    expect(res.get("1")!.finalName).toBe("AMBIENT ANTI YELLOW");
    expect(res.get("2")!.finalName).toBe("AMBIENT ANTI YELLOW (Маска)");
    expect(res.get("2")!.duplicateOf).toBeNull();
  });

  it("разный состав и одинаковая категория → « · вариант N»", () => {
    const a = row("1", ["a", "b"], "hair");
    const b = row("2", ["x", "y"], "hair");
    const c = row("3", ["p", "q"], "other");
    const res = resolveVariants([a, b, c], label);
    expect(res.get("2")!.finalName).toBe("AMBIENT ANTI YELLOW · вариант 2");
    expect(res.get("3")!.finalName).toBe("AMBIENT ANTI YELLOW · вариант 3");
  });

  it("стабильность при перестановке строк: варианты и суффиксы привязаны к sku", () => {
    const rows = [
      row("10", ["a", "b", "c"], "hair"),
      row("20", ["x", "y", "z"], "mask"),
      row("30", ["a", "b", "c", "d"], "hair"), // дубль sku 10 (3 из 4 общих = 0.75 → не дубль)
      row("40", ["a", "b", "c"], "hair"), // дубль sku 10 (1.0)
    ];
    const direct = resolveVariants(rows, label);
    const shuffled = resolveVariants([rows[2], rows[0], rows[3], rows[1]], label);
    for (const sku of ["10", "20", "30", "40"]) {
      expect(shuffled.get(sku)).toEqual(direct.get(sku));
    }
    expect(direct.get("10")!.finalName).toBe("AMBIENT ANTI YELLOW");
    expect(direct.get("20")!.finalName).toBe("AMBIENT ANTI YELLOW (Маска)");
    expect(direct.get("40")!.duplicateOf).toBe("10");
  });

  it("неизвестная категория без подписи → «вариант N»", () => {
    const res = resolveVariants(
      [row("1", ["a"], "hair"), row("2", ["x"], "weird")],
      () => undefined
    );
    expect(res.get("2")!.finalName).toBe("AMBIENT ANTI YELLOW · вариант 2");
  });
});
