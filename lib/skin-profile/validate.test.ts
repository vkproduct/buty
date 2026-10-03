import { describe, expect, it } from "vitest";

import { migrateLegacy } from "./options";
import { parseSkinProfile } from "./validate";

const base = {
  skinType: "dry",
  sensitive: true,
  concerns: ["acne", "rosacea"],
  conditions: ["pregnancy"],
  allergies: ["fragrance", "кокосовое масло"],
  intolerances: ["acids"],
  consent: true,
};

describe("parseSkinProfile", () => {
  it("принимает корректный профиль", () => {
    const r = parseSkinProfile(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.allergies).toEqual(["fragrance", "кокосовое масло"]);
  });

  it("без согласия не сохраняет", () => {
    expect(parseSkinProfile({ ...base, consent: false }).ok).toBe(false);
  });

  it("«Чувствительная» больше не тип кожи", () => {
    expect(parseSkinProfile({ ...base, skinType: "sensitive" }).ok).toBe(false);
  });

  it("отклоняет неизвестные задачи и состояния", () => {
    expect(parseSkinProfile({ ...base, concerns: ["что-то"] }).ok).toBe(false);
    expect(parseSkinProfile({ ...base, conditions: ["x"] }).ok).toBe(false);
  });

  it("пункт не может быть одновременно аллергией и раздражением", () => {
    const r = parseSkinProfile({ ...base, intolerances: ["fragrance", "acids"] });
    expect(r.ok && r.data.intolerances).toEqual(["acids"]);
  });

  it("ограничивает длину своего пункта", () => {
    expect(parseSkinProfile({ ...base, allergies: ["x".repeat(61)] }).ok).toBe(false);
  });
});

describe("migrateLegacy", () => {
  it("переводит старые подписи в id и делит консерванты", () => {
    expect(migrateLegacy(["Атопичность", "Консерванты (феноксиэтанол, MI/MCI)"])).toEqual([
      "atopic",
      "mi-mci",
      "phenoxyethanol",
    ]);
  });
});
