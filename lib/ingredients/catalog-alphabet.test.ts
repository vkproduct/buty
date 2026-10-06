import { describe, expect, it } from "vitest";

import {
  catalogEntries,
  groupByLetter,
  letterAnchor,
  letterOf,
  sortLetters,
} from "./catalog-alphabet";

const water = {
  displayName: "Вода листьев чайного дерева",
  inciName: "MELALEUCA ALTERNIFOLIA LEAF WATER",
};
const sls = { displayName: "SLS", inciName: "SODIUM LAURYL SULFATE" };
const acid = { displayName: "10-гидроксидекановая кислота", inciName: "10-HYDROXYDECANOIC ACID" };

describe("letterOf", () => {
  it("берёт первую букву в верхнем регистре", () => {
    expect(letterOf("Вода листьев чайного дерева")).toBe("В");
    expect(letterOf("melaleuca")).toBe("M");
  });

  it("сводит Ё к Е, а цифры — в группу 0–9", () => {
    expect(letterOf("Ёдоксан")).toBe("Е");
    expect(letterOf("10-HYDROXYDECANOIC ACID")).toBe("0–9");
  });
});

describe("letterAnchor", () => {
  it("различает кириллическую и латинскую похожие буквы", () => {
    expect(letterAnchor("Р")).toBe("letter-ru-Р");
    expect(letterAnchor("P")).toBe("letter-en-P");
    expect(letterAnchor("0–9")).toBe("letter-digits");
  });
});

describe("catalogEntries", () => {
  it("даёт карточку и под русским, и под латинским названием", () => {
    const entries = catalogEntries([water]);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.letter)).toEqual(["M", "В"]);
    // Заголовок — всегда INCI, русское название — вторым.
    for (const entry of entries) {
      expect(entry).toMatchObject({ title: water.inciName, subtitle: water.displayName });
    }
    expect(entries.map((e) => e.sortKey)).toEqual([water.inciName, water.displayName]);
    expect(entries[0].ingredient).toBe(water);
    expect(entries[1].ingredient).toBe(water);
  });

  it("не дублирует карточку, если оба названия в одной букве", () => {
    const entries = catalogEntries([sls]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ letter: "S", title: sls.inciName, subtitle: "SLS" });
  });

  it("цифровые названия попадают в общую группу один раз", () => {
    expect(catalogEntries([acid]).map((e) => e.letter)).toEqual(["0–9"]);
  });

  it("не падает на пустом названии", () => {
    const entries = catalogEntries([{ displayName: "Ниацинамид", inciName: "" }]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ letter: "Н", title: "Ниацинамид", subtitle: "" });
  });
});

describe("groupByLetter", () => {
  it("складывает ингредиент в обе буквы и сортирует внутри группы", () => {
    const groups = groupByLetter(catalogEntries([water, sls, { displayName: "Аллантоин", inciName: "ALLANTOIN" }]));
    expect(groups.get("В")?.map((e) => e.sortKey)).toEqual([water.displayName]);
    expect(groups.get("M")?.map((e) => e.sortKey)).toEqual([water.inciName]);
    expect(groups.get("A")?.map((e) => e.sortKey)).toEqual(["ALLANTOIN"]);
    expect(groups.get("S")?.map((e) => e.sortKey)).toEqual([sls.inciName]);
    expect(groups.get("А")?.map((e) => e.sortKey)).toEqual(["Аллантоин"]);
    // Под любой буквой заголовок — INCI.
    expect(groups.get("А")?.map((e) => e.title)).toEqual(["ALLANTOIN"]);
  });
});

describe("sortLetters", () => {
  it("ставит цифры первыми, кириллицу — перед латиницей", () => {
    expect(sortLetters(["M", "В", "0–9", "A", "А"])).toEqual(["0–9", "А", "В", "A", "M"]);
  });
});
