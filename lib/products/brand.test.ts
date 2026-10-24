import { describe, expect, it } from "vitest";

import { displayBrand, NO_BRAND } from "./brand";

describe("displayBrand", () => {
  it("возвращает бренд как есть для обычных брендов", () => {
    expect(displayBrand("Nivea")).toBe("Nivea");
    expect(displayBrand("La Roche-Posay")).toBe("La Roche-Posay");
  });

  it("возвращает null для заглушки «Без бренда»", () => {
    expect(displayBrand(NO_BRAND)).toBeNull();
  });

  it("возвращает null для пустой строки и пробелов", () => {
    expect(displayBrand("")).toBeNull();
    expect(displayBrand("   ")).toBeNull();
  });
});
