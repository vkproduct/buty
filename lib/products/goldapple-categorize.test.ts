import { describe, expect, it } from "vitest";

import { PRODUCT_CATEGORY_ORDER } from "@/lib/seo/product-categories";
import { categorizeGoldapple } from "./goldapple-categorize";

describe("categorizeGoldapple", () => {
  it("парфюм по флагу fragrance имеет приоритет над текстом", () => {
    expect(categorizeGoldapple("Skin Food", "fragrance")).toBe("perfume");
  });

  it("парфюм по названию", () => {
    expect(categorizeGoldapple("Aroma Eau de Parfum", "")).toBe("perfume");
    expect(categorizeGoldapple("Туалетная вода Blue", "")).toBe("perfume");
    expect(categorizeGoldapple("Духи Noire", "")).toBe("perfume");
  });

  it("spf", () => {
    expect(categorizeGoldapple("Sun Cream SPF 50", "")).toBe("spf");
    expect(categorizeGoldapple("Солнцезащитное молочко", "")).toBe("spf");
  });

  it("makeup", () => {
    expect(categorizeGoldapple("Помада матовая", "")).toBe("makeup");
    expect(categorizeGoldapple("Mascara Volume", "")).toBe("makeup");
    expect(categorizeGoldapple("Тональный крем", "")).toBe("makeup");
    expect(categorizeGoldapple("Лак для ногтей", "")).toBe("makeup");
  });

  it("hair", () => {
    expect(categorizeGoldapple("Шампунь увлажняющий", "")).toBe("hair");
    expect(categorizeGoldapple("Conditioner Repair", "")).toBe("hair");
    expect(categorizeGoldapple("Масло для волос", "")).toBe("hair");
  });

  it("hygiene", () => {
    expect(categorizeGoldapple("Гель для душа", "")).toBe("hygiene");
    expect(categorizeGoldapple("Дезодорант спрей", "")).toBe("hygiene");
    expect(categorizeGoldapple("Зубная паста", "")).toBe("hygiene");
  });

  it("cleanser", () => {
    expect(categorizeGoldapple("Пенка для умывания", "")).toBe("cleanser");
    expect(categorizeGoldapple("Micellar Water", "")).toBe("cleanser");
    expect(categorizeGoldapple("Гидрофильное масло", "")).toBe("cleanser");
  });

  it("peeling", () => {
    expect(categorizeGoldapple("Пилинг с кислотами", "")).toBe("peeling");
    expect(categorizeGoldapple("Scrub для тела", "")).toBe("peeling");
  });

  it("mask", () => {
    expect(categorizeGoldapple("Маска ночная", "")).toBe("mask");
    expect(categorizeGoldapple("Патчи для глаз", "")).toBe("mask");
  });

  it("serum", () => {
    expect(categorizeGoldapple("Сыворотка с витамином C", "")).toBe("serum");
    expect(categorizeGoldapple("Anti-Aging Serum", "")).toBe("serum");
  });

  it("toner", () => {
    expect(categorizeGoldapple("Тоник успокаивающий", "")).toBe("toner");
    expect(categorizeGoldapple("Hydrating Toner", "")).toBe("toner");
  });

  it("cream", () => {
    expect(categorizeGoldapple("Крем для лица", "")).toBe("cream");
    expect(categorizeGoldapple("Body Lotion", "")).toBe("cream");
    expect(categorizeGoldapple("Бальзам для губ", "")).toBe("cream");
  });

  it("other — всё остальное", () => {
    expect(categorizeGoldapple("Мицеллярная вода Extra", "")).toBe("cleanser");
    expect(categorizeGoldapple("Набор подарочный", "")).toBe("other");
  });

  it("порядок правил: spf важнее cream", () => {
    expect(categorizeGoldapple("Крем SPF 30", "")).toBe("spf");
  });

  it("порядок правил: cleanser важнее cream", () => {
    expect(categorizeGoldapple("Крем для умывания", "")).toBe("cleanser");
  });

  it("регистронезависимо", () => {
    expect(categorizeGoldapple("КРЕМ ДЛЯ ЛИЦА", "")).toBe("cream");
  });

  it("флаги через ; с пробелами", () => {
    expect(categorizeGoldapple("Помада", "has_cyrillic; fragrance")).toBe("perfume");
  });

  it("все категории входят в PRODUCT_CATEGORY_ORDER", () => {
    const categories = [
      "парфюмерная вода",
      "spf 50",
      "помада",
      "шампунь",
      "гель для душа",
      "пенка",
      "пилинг",
      "маска",
      "сыворотка",
      "тоник",
      "крем",
      "набор",
    ].map((n) => categorizeGoldapple(n, ""));
    for (const c of categories) {
      expect(PRODUCT_CATEGORY_ORDER).toContain(c);
    }
  });
});
