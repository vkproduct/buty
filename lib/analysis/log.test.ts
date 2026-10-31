import { describe, expect, it } from "vitest";

import { analysisTextHash } from "./log";

describe("analysisTextHash", () => {
  it("одинаковые составы в разном порядке дают один хэш", () => {
    const a = analysisTextHash(["aqua", "glycerin", "niacinamide"]);
    const b = analysisTextHash(["niacinamide", "aqua", "glycerin"]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("разные составы дают разные хэши", () => {
    expect(analysisTextHash(["aqua", "glycerin"])).not.toBe(analysisTextHash(["aqua", "retinol"]));
  });

  it("не мутирует входной массив", () => {
    const ids = ["b", "a"];
    analysisTextHash(ids);
    expect(ids).toEqual(["b", "a"]);
  });
});
