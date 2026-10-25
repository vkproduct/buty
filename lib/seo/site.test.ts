import { describe, expect, it } from "vitest";
import { webApplicationJsonLd, withFreeNote } from "./site";

describe("withFreeNote", () => {
  it("дописывает полную пометку к короткому тексту", () => {
    expect(withFreeNote("Короткий текст.")).toBe("Короткий текст. Бесплатно, без регистрации.");
  });

  it("текст на 150 символов получает короткую пометку", () => {
    const text = "А".repeat(150);
    expect(withFreeNote(text)).toBe(`${text} Бесплатно.`);
  });

  it("текст на 165 символов остаётся без изменений", () => {
    const text = "Б".repeat(165);
    expect(withFreeNote(text)).toBe(text);
  });

  it("текст, где уже есть «бесплатн», не меняется", () => {
    const text = "Проверка состава косметики бесплатно онлайн без регистрации и подписок.";
    expect(withFreeNote(text)).toBe(text);
  });
});

describe("webApplicationJsonLd", () => {
  it("сервис бесплатный: offers.price = 0 и isAccessibleForFree = true", () => {
    const jsonLd = webApplicationJsonLd();
    expect(jsonLd.offers.price).toBe("0");
    expect(jsonLd.isAccessibleForFree).toBe(true);
  });
});
