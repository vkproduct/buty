import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); }, redirect: () => { throw new Error("redirect"); } }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  brandIsPaid,
  brandProductsWhere,
  effectiveProductLimit,
  productBelongsToBrand,
  type BrandForAccess,
} from "./access";

const DAY = 86_400_000;
const NOW = new Date("2026-10-26T12:00:00Z").getTime();

function brand(overrides: Partial<BrandForAccess> = {}): BrandForAccess {
  return {
    tariff: "basic",
    paidUntil: new Date(NOW + 10 * DAY),
    productLimit: null,
    catalogBrands: ["La Roche-Posay"],
    ...overrides,
  };
}

describe("brandIsPaid", () => {
  it("free никогда не оплачен", () => {
    expect(brandIsPaid(brand({ tariff: "free", paidUntil: new Date(NOW + DAY) }), NOW)).toBe(false);
  });

  it("null — не оплачен", () => {
    expect(brandIsPaid(brand({ paidUntil: null }), NOW)).toBe(false);
  });

  it("будущее — оплачен", () => {
    expect(brandIsPaid(brand(), NOW)).toBe(true);
  });

  it("прошлое больше льготы — не оплачен", () => {
    expect(brandIsPaid(brand({ paidUntil: new Date(NOW - (3 * DAY + 1)) }), NOW)).toBe(false);
  });

  it("прошлое в пределах льготы (3 дня) — ещё оплачен", () => {
    expect(brandIsPaid(brand({ paidUntil: new Date(NOW - 2 * DAY) }), NOW)).toBe(true);
    expect(brandIsPaid(brand({ paidUntil: new Date(NOW - 3 * DAY) }), NOW)).toBe(true);
  });
});

describe("effectiveProductLimit", () => {
  it("по тарифу, если переопределения нет", () => {
    expect(effectiveProductLimit(brand({ tariff: "basic" }))).toBe(30);
    expect(effectiveProductLimit(brand({ tariff: "pro" }))).toBe(200);
    expect(effectiveProductLimit(brand({ tariff: "network" }))).toBeNull();
  });

  it("ручное переопределение побеждает тариф", () => {
    expect(effectiveProductLimit(brand({ tariff: "basic", productLimit: 1 }))).toBe(1);
  });
});

describe("productBelongsToBrand", () => {
  it("регистр и пробелы по краям не важны", () => {
    const b = brand({ catalogBrands: ["La Roche-Posay"] });
    expect(productBelongsToBrand({ brand: "la roche-posay" }, b)).toBe(true);
    expect(productBelongsToBrand({ brand: " LA ROCHE-POSAY " }, b)).toBe(true);
  });

  it("другой бренд — false", () => {
    expect(productBelongsToBrand({ brand: "Vichy" }, brand())).toBe(false);
  });

  it("пустой catalogBrands — ничего не принадлежит", () => {
    expect(productBelongsToBrand({ brand: "La Roche-Posay" }, brand({ catalogBrands: [] }))).toBe(false);
  });
});

describe("brandProductsWhere", () => {
  it("OR по каждому варианту без учёта регистра, скрытые исключены", () => {
    const where = brandProductsWhere(brand({ catalogBrands: ["A", "B"] }));
    expect(where.hidden).toBe(false);
    expect(where.OR).toEqual([
      { brand: { equals: "A", mode: "insensitive" } },
      { brand: { equals: "B", mode: "insensitive" } },
    ]);
  });

  it("пустые значения catalogBrands отбрасываются", () => {
    const where = brandProductsWhere(brand({ catalogBrands: [" ", "A"] }));
    expect(where.OR).toEqual([{ brand: { equals: "A", mode: "insensitive" } }]);
  });

  it("пустой catalogBrands — where не находит ничего", () => {
    const where = brandProductsWhere(brand({ catalogBrands: [] }));
    expect(where.OR).toBeUndefined();
    expect(where.brand).toEqual({ in: [] });
  });
});
