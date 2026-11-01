import { describe, expect, it } from "vitest";

import {
  aliasCanonical,
  brandKey,
  canonicalBrand,
  chooseCanonicalName,
  cleanBrand,
  resolveCanonicalGroups,
} from "./brand-canonical";

describe("brandKey", () => {
  it("стирает регистр, дефисы и лишние пробелы", () => {
    expect(brandKey("La Roche Posay")).toBe("larocheposay");
    expect(brandKey("La roche - posay")).toBe("larocheposay");
    expect(brandKey("Laroche-posay")).toBe("larocheposay");
    expect(brandKey("La Roche-Posay")).toBe("larocheposay");
  });

  it("снимает диакритику и нормализует апострофы", () => {
    expect(brandKey("L’Oréal")).toBe("loreal");
    expect(brandKey("L'oreal")).toBe("loreal");
    expect(brandKey("l-oreal")).toBe("loreal");
    expect(brandKey("Loreal")).toBe("loreal");
  });

  it("& и and — один ключ", () => {
    expect(brandKey("Head & Shoulders")).toBe("headandshoulders");
    expect(brandKey("head&shoulders")).toBe("headandshoulders");
    expect(brandKey("Head and Shoulders")).toBe("headandshoulders");
  });

  it("кириллица и ё → е", () => {
    expect(brandKey("Невская Косметика")).toBe("невскаякосметика");
    expect(brandKey("Невская косметика")).toBe("невскаякосметика");
  });

  it("плюс значим: BIO и Bio+ — разные, Eco+ и Eco + — одинаковые", () => {
    expect(brandKey("BIO")).toBe("bio");
    expect(brandKey("Bio+")).toBe("bio+");
    expect(brandKey("Eco+")).toBe(brandKey("Eco +"));
  });
});

describe("cleanBrand", () => {
  it("чистит пробелы, типографские апострофы и хвостовые многоточия", () => {
    expect(cleanBrand("  La   Roche-Posay ")).toBe("La Roche-Posay");
    expect(cleanBrand("L’Oréal")).toBe("L'Oréal");
    expect(cleanBrand("Johnson’s")).toBe("Johnson's");
    expect(cleanBrand("Some brand…")).toBe("Some brand");
    expect(cleanBrand("Some brand...")).toBe("Some brand");
  });
});

describe("aliasCanonical", () => {
  it("склеивает написания, которые ключ не ловит", () => {
    expect(aliasCanonical("Eau Thermale Avene")).toBe("Avène");
    expect(aliasCanonical("EAU THERMALE AVENE")).toBe("Avène");
    expect(aliasCanonical("L'Oreal Paris")).toBe("L'Oréal Paris");
    expect(aliasCanonical("Loreal norge as / slt")).toBe("L'Oréal Paris");
    expect(aliasCanonical("Ангиофарм")).toBe("Angiopharm");
    expect(aliasCanonical("Невская Косметика")).toBe("Невская косметика");
  });

  it("не склеивает L'Oréal Professionnel с L'Oréal Paris", () => {
    expect(aliasCanonical("LOreal professionnel")).toBe("L'Oréal Professionnel");
    expect(aliasCanonical("L'Oréal Professionnel")).toBe("L'Oréal Professionnel");
  });

  it("возвращает null для неизвестных брендов", () => {
    expect(aliasCanonical("Somebrand")).toBeNull();
    expect(aliasCanonical("BIO")).toBeNull();
    expect(aliasCanonical("Bio+")).toBeNull();
  });
});

describe("resolveCanonicalGroups / chooseCanonicalName", () => {
  it("выбирает вариант со строчными буквами важнее КАПСА", () => {
    expect(
      chooseCanonicalName([
        { name: "KLORANE", products: 3 },
        { name: "Klorane", products: 1 },
      ])
    ).toBe("Klorane");
  });

  it("при равных правилах — больше средств, затем алфавит", () => {
    expect(
      chooseCanonicalName([
        { name: "Zeta", products: 5 },
        { name: "Alpha", products: 5 },
      ])
    ).toBe("Alpha");
    expect(
      chooseCanonicalName([
        { name: "Alpha", products: 2 },
        { name: "Zeta", products: 9 },
      ])
    ).toBe("Zeta");
  });

  it("склеивает варианты через ключ и через алиасы", () => {
    const groups = resolveCanonicalGroups([
      { name: "VICHY", products: 28 },
      { name: "Vichy", products: 32 },
      { name: "Avene", products: 6 },
      { name: "EAU THERMALE AVENE", products: 38 },
    ]);
    const byCanonical = new Map(groups.map((g) => [g.canonical, g]));
    expect(byCanonical.get("Vichy")?.products).toBe(60);
    expect(byCanonical.get("Avène")?.products).toBe(44);
  });

  it("не склеивает BIO с Bio+ и Johnson & Johnson с Johnson's", () => {
    const groups = resolveCanonicalGroups([
      { name: "BIO", products: 1 },
      { name: "Bio+", products: 1 },
      { name: "Johnson & Johnson", products: 1 },
      { name: "Johnson's", products: 1 },
    ]);
    expect(groups).toHaveLength(4);
  });
});

describe("canonicalBrand", () => {
  it("NO_BRAND и пустую строку возвращает без изменений", () => {
    expect(canonicalBrand("Без бренда")).toBe("Без бренда");
    expect(canonicalBrand("")).toBe("");
    expect(canonicalBrand("   ")).toBe("   ");
  });

  it("применяет алиасы и cleanBrand", () => {
    expect(canonicalBrand("L’Oréal")).toBe("L'Oréal Paris");
    expect(canonicalBrand("  eau   thermale avene ")).toBe("Avène");
    expect(canonicalBrand("Невская Косметика")).toBe("Невская косметика");
  });

  it("использует knownByKey для существующих групп", () => {
    const knownByKey = new Map([["somebrand", "SomeBrand"]]);
    expect(canonicalBrand("SOMEBRAND", knownByKey)).toBe("SomeBrand");
    expect(canonicalBrand("Newbrand", knownByKey)).toBe("Newbrand");
  });
});
