import { describe, expect, it } from "vitest";

import { brandRu, brandWithRu } from "./brands";

describe("brandRu / brandWithRu", () => {
  it("находит русское написание с учётом диакритики и апострофов", () => {
    expect(brandWithRu("L'Oréal Paris")).toBe("L'Oréal Paris (Лореаль)");
    expect(brandWithRu("Avène")).toBe("Avène (Авен)");
    expect(brandRu("VICHY")).toBe("Виши");
  });

  it("Angiopharm → Ангиофарм", () => {
    expect(brandWithRu("Angiopharm")).toBe("Angiopharm (Ангиофарм)");
  });

  it("не переводит кириллические бренды", () => {
    expect(brandRu("Невская косметика")).toBeNull();
    expect(brandWithRu("Невская косметика")).toBe("Невская косметика");
  });

  it("null для неизвестных брендов и совпадающих написаний", () => {
    expect(brandRu("Somebrand")).toBeNull();
    expect(brandRu("MIXIT")).toBe("Миксит");
    expect(brandWithRu("MIXIT")).toBe("MIXIT (Миксит)");
  });
});
