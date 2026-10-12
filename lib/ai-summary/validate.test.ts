import { describe, expect, it } from "vitest";

import { parseSummary } from "./validate";

const good = {
  verdict: "Лёгкий увлажняющий крем с ниацинамидом",
  inside: "Основа на глицерине и сквалане удерживает воду в коже. Ниацинамид стоит в начале списка.",
  suits: "Обезвоженной и комбинированной коже, в том числе утром под SPF.",
  caution: "",
};

describe("parseSummary", () => {
  it("принимает корректный JSON и чистит пробелы", () => {
    const parsed = parseSummary(JSON.stringify({ ...good, verdict: "  Лёгкий   увлажняющий крем с ниацинамидом " }));
    expect(parsed).toEqual(good);
  });

  it("снимает обёртку ```json", () => {
    expect(parseSummary("```json\n" + JSON.stringify(good) + "\n```")).toEqual(good);
  });

  it("отклоняет не-JSON и неполный ответ", () => {
    expect(parseSummary("Вот резюме: крем хороший")).toBeNull();
    expect(parseSummary(JSON.stringify({ verdict: good.verdict }))).toBeNull();
    expect(parseSummary(JSON.stringify({ ...good, suits: 42 }))).toBeNull();
  });

  it("отклоняет слишком длинные поля", () => {
    expect(parseSummary(JSON.stringify({ ...good, verdict: "а".repeat(260) }))).toBeNull();
  });

  it.each([
    "Крем лечит акне за неделю.",
    "Избавит от морщин.",
    "Подходит при беременности.",
    "Содержит токсичный консервант.",
    "Безопасен для детей.",
    "Подробнее: https://example.com",
  ])("отклоняет запрещённую формулировку: %s", (phrase) => {
    expect(parseSummary(JSON.stringify({ ...good, caution: phrase }))).toBeNull();
  });

  it("не путает «неопасно» и похожие слова с запрещёнными", () => {
    const parsed = parseSummary(
      JSON.stringify({ ...good, caution: "Отдушка с аллергенами ЕС: при реактивной коже сначала проверьте на небольшом участке." }),
    );
    expect(parsed).not.toBeNull();
  });
});
