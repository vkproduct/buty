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
    const r = matchTokens(["niacinamide", "aqua", "parfum"], DICTIONARY);
    expect(slugs(r)).toEqual(["niacinamide"]);
    expect(r.unmatched).toEqual(["aqua", "parfum"]);
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
});
