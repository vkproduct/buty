import { describe, expect, it } from "vitest";

import { adminEmails, slugify } from "./admin";

describe("slugify", () => {
  it("транслитерирует кириллицу и нормализует", () => {
    expect(slugify("Гиалуроновая Кислота")).toBe("gialuronovaya-kislota");
  });

  it("оставляет латиницу и цифры, заменяет прочее на дефис", () => {
    expect(slugify("NIACINAMIDE 10% + Zinc 1%")).toBe("niacinamide-10-zinc-1");
  });

  it("обрезает дефисы по краям", () => {
    expect(slugify("  The Ordinary — AHA 30%  ")).toBe("the-ordinary-aha-30");
  });
});

describe("adminEmails", () => {
  it("парсит список email из env", () => {
    process.env.ADMIN_EMAILS = "Admin@Buty.ru, second@buty.ru ";
    expect(adminEmails()).toEqual(["admin@buty.ru", "second@buty.ru"]);
    delete process.env.ADMIN_EMAILS;
  });

  it("пустое значение — пустой список", () => {
    delete process.env.ADMIN_EMAILS;
    expect(adminEmails()).toEqual([]);
  });
});
