import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { matchTokens } from "./match";

const entry = (inciName: string, aliases: string[] = []) => ({
  id: inciName,
  inciName,
  slug: inciName.toLowerCase().replace(/\W+/g, "-"),
  displayName: inciName,
  aliases,
});

const DICT = [
  entry("GLYCINE SOJA STEROLS"),
  entry("BUTYLENE GLYCOL"),
  entry("BENZOIC ACID"),
  entry("TOCOPHEROL"),
  entry("CREAM"),
  entry("HYALURONIC ACID", ["sodium hyaluronate"]),
  entry("ZEA MAYS STARCH", ["corn starch"]),
];

describe("matchTokens", () => {
  it("вторая половина «X/Y» — синоним, а не нераспознанный ингредиент", () => {
    const r = matchTokens(["glycine soja sterols/soybean sterols"], DICT);
    expect(r.matched.map((m) => m.ingredient.inciName)).toEqual(["GLYCINE SOJA STEROLS"]);
    expect(r.unmatched).toEqual([]);
  });

  it("разрезает склейку без запятой", () => {
    const r = matchTokens(["butylene glycol benzoic acid"], DICT);
    expect(r.matched.map((m) => m.matchedVia)).toEqual(["butylene glycol", "benzoic acid"]);
    expect(r.unmatched).toEqual([]);
  });

  it("вытаскивает ингредиент из фрагмента с чужим текстом, но не «cream» с упаковки", () => {
    const r = matchTokens(["renewing peptide cream. tocopherol"], DICT);
    expect(r.matched.map((m) => m.ingredient.inciName)).toEqual(["TOCOPHEROL"]);
    expect(r.unmatched).toEqual([]);
  });

  it("одно знакомое слово в длинной неизвестной фразе не выдаём за ингредиент", () => {
    const r = matchTokens(["skin renewing tocopherol complex blend"], DICT);
    expect(r.matched).toEqual([]);
    expect(r.unmatched).toEqual(["skin renewing tocopherol complex blend"]);
  });

  it("находит по синониму и запоминает имя с этикетки", () => {
    const r = matchTokens(["sodium hyaluronate"], DICT);
    expect(r.matched[0].ingredient.inciName).toBe("HYALURONIC ACID");
    expect(r.matched[0].matchedVia).toBe("sodium hyaluronate");
  });
});
