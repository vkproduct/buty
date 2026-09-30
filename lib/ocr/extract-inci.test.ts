import { describe, expect, it } from "vitest";

import { extractInci, MAX_INCI_LENGTH } from "./extract-inci";

describe("extractInci", () => {
  it("берёт текст после маркера Ingredients и склеивает строки", () => {
    const raw = "Hydrating Serum\n30 ml\nIngredients: Aqua, Glycerin,\nNiacinamide, Sodium\nHyaluronate";
    expect(extractInci(raw)).toBe("Aqua, Glycerin, Niacinamide, Sodium Hyaluronate");
  });

  it("понимает русский маркер «Состав:»", () => {
    expect(extractInci("Крем для лица\nСостав: Aqua, Squalane")).toBe("Aqua, Squalane");
  });

  it("склеивает перенос слова по дефису, но не трогает PEG-40", () => {
    const raw = "INCI: Sodium Acrylates Cross-\npolymer, PEG-\n40 Hydrogenated Castor Oil";
    expect(extractInci(raw)).toBe("Sodium Acrylates Crosspolymer, PEG-40 Hydrogenated Castor Oil");
  });

  it("без маркера возвращает весь текст одной строкой", () => {
    expect(extractInci("Aqua,\n  Glycerin\r\n")).toBe("Aqua, Glycerin");
  });

  it("пустой ввод → пустая строка, длинный — обрезается", () => {
    expect(extractInci("   \n ")).toBe("");
    expect(extractInci("a".repeat(MAX_INCI_LENGTH + 50))).toHaveLength(MAX_INCI_LENGTH);
  });
});
