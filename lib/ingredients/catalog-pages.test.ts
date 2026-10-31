import { describe, expect, it } from "vitest";

import { EMPTY_FILTERS } from "./catalog-filters";
import {
  catalogPageHref,
  defaultLetter,
  letterParam,
  letterPhrase,
  pageWindow,
  parseLetterParam,
  parsePageParam,
} from "./catalog-pages";

describe("parseLetterParam", () => {
  it("нормализует регистр и Ё", () => {
    expect(parseLetterParam("б")).toBe("Б");
    expect(parseLetterParam("c")).toBe("C");
    expect(parseLetterParam("ё")).toBe("Е");
  });

  it("различает латинскую C и кириллическую С", () => {
    expect(parseLetterParam("C")).not.toBe(parseLetterParam("С"));
  });

  it("понимает группу цифр в обоих написаниях", () => {
    expect(parseLetterParam("0-9")).toBe("0–9");
    expect(parseLetterParam("0–9")).toBe("0–9");
  });

  it("отбрасывает пустое, длинное и не-буквы", () => {
    expect(parseLetterParam(undefined)).toBeNull();
    expect(parseLetterParam("")).toBeNull();
    expect(parseLetterParam("ab")).toBeNull();
    expect(parseLetterParam("1")).toBeNull();
    expect(parseLetterParam("%")).toBeNull();
  });

  it("берёт первое значение повторяющегося параметра", () => {
    expect(parseLetterParam(["д", "e"])).toBe("Д");
  });
});

describe("parsePageParam", () => {
  it("принимает только целые ≥ 1", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("2.5")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
  });

  it("ограничивает мусорно большие номера", () => {
    expect(parsePageParam("999999")).toBe(1000);
  });
});

describe("defaultLetter", () => {
  it("пропускает цифры и берёт первую кириллическую", () => {
    expect(defaultLetter(["0–9", "А", "Б", "A"])).toBe("А");
  });

  it("без кириллицы — первая латинская, без букв — что есть", () => {
    expect(defaultLetter(["0–9", "A", "B"])).toBe("A");
    expect(defaultLetter(["0–9"])).toBe("0–9");
    expect(defaultLetter([])).toBeUndefined();
  });
});

describe("catalogPageHref", () => {
  it("не пишет букву по умолчанию и первую страницу", () => {
    expect(catalogPageHref(EMPTY_FILTERS, { letter: "А", page: 1 }, { defaultLetter: "А" })).toBe(
      "/ingredients#catalog"
    );
    expect(
      catalogPageHref(EMPTY_FILTERS, { letter: "А" }, { defaultLetter: "А", anchor: false })
    ).toBe("/ingredients");
  });

  it("добавляет букву и страницу к фильтрам", () => {
    const href = catalogPageHref(
      { ...EMPTY_FILTERS, categories: ["humectant"] },
      { letter: "Б", page: 2 },
      { defaultLetter: "А", anchor: false }
    );
    expect(href).toBe(`/ingredients?category=humectant&letter=${encodeURIComponent("Б")}&page=2`);
  });

  it("страница буквы по умолчанию — без буквы, но с номером", () => {
    expect(
      catalogPageHref(EMPTY_FILTERS, { letter: "А", page: 3 }, { defaultLetter: "А", anchor: false })
    ).toBe("/ingredients?page=3");
  });

  it("группа цифр пишется как 0-9", () => {
    expect(letterParam("0–9")).toBe("0-9");
    expect(
      catalogPageHref(EMPTY_FILTERS, { letter: "0–9" }, { defaultLetter: "А", anchor: false })
    ).toBe("/ingredients?letter=0-9");
  });
});

describe("pageWindow", () => {
  it("одна страница", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });

  it("короткий список — без разрывов", () => {
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("длинный список — первая, соседи текущей, последняя", () => {
    expect(pageWindow(6, 11)).toEqual([1, "gap", 5, 6, 7, "gap", 11]);
    expect(pageWindow(1, 11)).toEqual([1, 2, "gap", 11]);
    expect(pageWindow(11, 11)).toEqual([1, "gap", 10, 11]);
  });

  it("вместо разрыва в одну страницу показывает саму страницу", () => {
    expect(pageWindow(4, 11)).toEqual([1, 2, 3, 4, 5, "gap", 11]);
  });
});

describe("letterPhrase", () => {
  it("помечает латинские группы как INCI", () => {
    expect(letterPhrase("Б")).toBe("на букву Б");
    expect(letterPhrase("C")).toBe("на букву C (INCI)");
    expect(letterPhrase("0–9")).toBe("с цифрой в начале названия");
  });
});
