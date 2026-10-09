import { describe, it, expect } from "vitest";
import { normalizeInci } from "./normalize";
import { matchTokens, type IngredientHit } from "./match";

const aliases = {
  "ниацинамид": "niacinamide",
  "vitamin b3": "niacinamide",
  "витамин c": "ascorbic acid",
  "vitamin c": "ascorbic acid",
  "салициловая кислота": "salicylic acid",
  "bha": "salicylic acid",
  "гликолевая кислота": "glycolic acid",
  "ретинол": "retinol",
  "гиалуроновая кислота": "hyaluronic acid",
  "sodium hyaluronate": "hyaluronic acid",
};

const DICTIONARY = [
  { id: "1", inciName: "NIACINAMIDE", slug: "niacinamide", displayName: "Ниацинамид", aliases: ["ниацинамид", "vitamin b3"] },
  { id: "2", inciName: "ASCORBIC ACID", slug: "ascorbic-acid", displayName: "Витамин C", aliases: ["витамин c", "vitamin c"] },
  { id: "3", inciName: "SALICYLIC ACID", slug: "salicylic-acid", displayName: "Салициловая кислота", aliases: ["салициловая кислота", "bha"] },
  { id: "4", inciName: "RETINOL", slug: "retinol", displayName: "Ретинол", aliases: ["ретинол"] },
  { id: "5", inciName: "HYALURONIC ACID", slug: "hyaluronic-acid", displayName: "Гиалуроновая кислота", aliases: ["гиалуроновая кислота", "sodium hyaluronate"] },
  { id: "6", inciName: "CAPRYLIC/CAPRIC TRIGLYCERIDE", slug: "caprylic-capric-triglyceride", displayName: "Триглицериды каприлик/каприковой кислоты", aliases: [] },
  { id: "7", inciName: "WATER", slug: "water", displayName: "Вода", aliases: ["aqua", "purified water", "eau"] },
  { id: "8", inciName: "GLYCERIN", slug: "glycerin", displayName: "Глицерин", aliases: [] },
];

describe("normalizeInci", () => {
  it("1. режет по запятым и приводит к нижнему регистру", () => {
    expect(normalizeInci("Aqua, NIACINAMIDE, Glycerin")).toEqual(["aqua", "niacinamide", "glycerin"]);
  });

  it("2. обрабатывает точку с запятой и звёздочки", () => {
    expect(normalizeInci("aqua; niacinamide * glycerin*")).toEqual(["aqua", "niacinamide", "glycerin"]);
  });

  it("3. вырезает скобки с содержимым", () => {
    expect(normalizeInci("Aqua (Water), Glycerin (растительный)")).toEqual(["aqua", "glycerin"]);
  });

  it("4. мапит русские синонимы на INCI", () => {
    expect(normalizeInci("Ниацинамид, Ретинол", aliases)).toEqual(["niacinamide", "retinol"]);
  });

  it("5. мапит латинские алиасы и убирает дубли после маппинга", () => {
    expect(normalizeInci("Vitamin C, Ascorbic Acid, витамин C", aliases)).toEqual(["ascorbic acid"]);
  });

  it("6. схлопывает лишние пробелы и переносы строк", () => {
    expect(normalizeInci("sodium   hyaluronate,\nhyaluronic  acid", aliases)).toEqual(["hyaluronic acid"]);
  });

  it("7. не режет по запятой перед цифрой (1,2-Hexanediol)", () => {
    expect(normalizeInci("1,2-Hexanediol, Glycerin")).toEqual(["1,2-hexanediol", "glycerin"]);
    expect(normalizeInci("Butylene Glycol, 1,2-Hexanediol, Panthenol")).toEqual([
      "butylene glycol",
      "1,2-hexanediol",
      "panthenol",
    ]);
  });

  it("8. запятая перед буквой по-прежнему разделяет", () => {
    expect(normalizeInci("Aqua, Glycerin")).toEqual(["aqua", "glycerin"]);
  });

  it("9. слэш внутри INCI-имени не разрезает токен на этапе нормализации", () => {
    expect(normalizeInci("Caprylic/Capric Triglyceride")).toEqual(["caprylic/capric triglyceride"]);
    expect(normalizeInci("Dimethicone/Vinyl Dimethicone Crosspolymer")).toEqual([
      "dimethicone/vinyl dimethicone crosspolymer",
    ]);
  });
});

describe("matchTokens", () => {
  const slugs = (r: { matched: { ingredient: IngredientHit }[] }) =>
    r.matched.map((m) => m.ingredient.slug);

  it("7. находит по INCI-имени в любом регистре", () => {
    const r = matchTokens(["niacinamide"], DICTIONARY);
    expect(slugs(r)).toEqual(["niacinamide"]);
    expect(r.matched[0].matchedVia).toBe("niacinamide");
  });

  it("8. находит по русскому синониму", () => {
    const r = matchTokens(["ретинол", "салициловая кислота"], DICTIONARY);
    expect(slugs(r)).toEqual(["retinol", "salicylic-acid"]);
  });

  it("9. находит по латинскому алиасу (bha)", () => {
    const r = matchTokens(["bha"], DICTIONARY);
    expect(slugs(r)).toEqual(["salicylic-acid"]);
    expect(r.matched[0].matchedVia).toBe("bha");
  });

  it("10. нераспознанные токены возвращаются отдельно", () => {
    const r = matchTokens(["niacinamide", "parfum", "unknownin"], DICTIONARY);
    expect(slugs(r)).toEqual(["niacinamide"]);
    expect(r.unmatched).toEqual(["parfum", "unknownin"]);
  });

  it("11. смешанный ввод ru/latin с дублями — один hit на ингредиент", () => {
    const r = matchTokens(["витамин c", "ascorbic acid", "hyaluronic acid"], DICTIONARY);
    expect(slugs(r)).toEqual(["ascorbic-acid", "hyaluronic-acid"]);
    expect(r.unmatched).toEqual([]);
  });

  it("12. полный пайплайн: сырая строка → normalize → match", () => {
    const tokens = normalizeInci("Вода; Ниацинамид; BHA, неизвестный-компонент*", aliases);
    const r = matchTokens(tokens, DICTIONARY);
    expect(slugs(r)).toEqual(["niacinamide", "salicylic-acid"]);
    expect(r.unmatched).toEqual(["вода", "неизвестный-компонент"]);
  });

  it("13. матчит целый токен со слэшем по INCI-имени", () => {
    const r = matchTokens(["caprylic/capric triglyceride"], DICTIONARY);
    expect(slugs(r)).toEqual(["caprylic-capric-triglyceride"]);
    expect(r.matched[0].matchedVia).toBe("caprylic/capric triglyceride");
    expect(r.unmatched).toEqual([]);
  });

  it("14. при промахе режет по слэшу; вторая половина узнанной пары — синоним", () => {
    const r = matchTokens(["aqua/eau", "glycerin/unknown-part"], DICTIONARY);
    expect(slugs(r)).toEqual(["water", "glycerin"]);
    expect(r.matched.map((m) => m.matchedVia)).toEqual(["aqua", "glycerin"]);
    // «X/Y» на этикетке — одно вещество под двумя именами, поэтому «unknown-part»
    // не считается отдельным нераспознанным ингредиентом
    expect(r.unmatched).toEqual([]);
  });

  it("15. слэш-фолбэк не дублирует ингредиент, уже найденный ранее", () => {
    const r = matchTokens(["water", "aqua/purified water"], DICTIONARY);
    expect(slugs(r)).toEqual(["water"]);
    expect(r.unmatched).toEqual([]);
  });

  it("16. часть со слэшем без словарной записи уходит в unmatched по частям", () => {
    const r = matchTokens(["dimethicone/vinyl dimethicone crosspolymer"], DICTIONARY);
    expect(r.matched).toEqual([]);
    expect(r.unmatched).toEqual(["dimethicone", "vinyl dimethicone crosspolymer"]);
  });
});
