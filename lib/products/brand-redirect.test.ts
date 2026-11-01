import { describe, expect, it } from "vitest";

import { brandRedirectSearch } from "./brand-redirect";

describe("brandRedirectSearch", () => {
  it("VICHY → Vichy (301)", () => {
    expect(brandRedirectSearch("?brand=VICHY")).toBe("brand=Vichy");
  });

  it("La Roche Posay → La Roche-Posay, category сохраняется", () => {
    expect(brandRedirectSearch("?brand=La+Roche+Posay&category=cream")).toBe(
      "brand=La+Roche-Posay&category=cream"
    );
  });

  it("два варианта L'Oréal схлопываются в один канонический бренд", () => {
    expect(brandRedirectSearch("?brand=Loreal&brand=L%27Or%C3%A9al+Paris")).toBe(
      "brand=L%27Or%C3%A9al+Paris"
    );
  });

  it("Eau Thermale Avene → Avène (алиас)", () => {
    expect(brandRedirectSearch("?brand=Eau+Thermale+Avene")).toBe("brand=Av%C3%A8ne");
  });

  it("каноническое написание не редиректится", () => {
    expect(brandRedirectSearch("?brand=Vichy")).toBeNull();
  });

  it("без параметра brand редиректа нет", () => {
    expect(brandRedirectSearch("?q=vichy")).toBeNull();
    expect(brandRedirectSearch("")).toBeNull();
  });

  it("q и page сохраняются, бренды сортируются compareNames", () => {
    expect(brandRedirectSearch("?q=крем&brand=VICHY&page=2")).toBe("q=%D0%BA%D1%80%D0%B5%D0%BC&brand=Vichy&page=2");
    expect(brandRedirectSearch("?brand=VICHY&brand=avene")).toBe("brand=Av%C3%A8ne&brand=Vichy");
  });

  it("неизвестный бренд не редиректится", () => {
    expect(brandRedirectSearch("?brand=Неизвестный+бренд")).toBeNull();
  });
});
