import { afterEach, describe, expect, it } from "vitest";

import { countProductView, resetProductViewDedupe } from "./views";

const DAY_MS = 24 * 60 * 60 * 1000;
// 2026-10-31T12:00:00+03:00
const NOON_MSK = Date.UTC(2026, 9, 31, 9, 0, 0);

afterEach(() => resetProductViewDedupe());

describe("countProductView", () => {
  it("первый просмотр пары (IP, продукт) засчитывается, повторный — нет", () => {
    expect(countProductView("1.1.1.1", "p1", NOON_MSK)).toBe(true);
    expect(countProductView("1.1.1.1", "p1", NOON_MSK + 60_000)).toBe(false);
  });

  it("другой продукт с того же IP — отдельный просмотр", () => {
    countProductView("1.1.1.1", "p1", NOON_MSK);
    expect(countProductView("1.1.1.1", "p2", NOON_MSK)).toBe(true);
  });

  it("другой IP на тот же продукт — отдельный просмотр", () => {
    countProductView("1.1.1.1", "p1", NOON_MSK);
    expect(countProductView("2.2.2.2", "p1", NOON_MSK)).toBe(true);
  });

  it("новые сутки по МСК — счётчик обнуляется", () => {
    countProductView("1.1.1.1", "p1", NOON_MSK);
    const nextDayNoon = NOON_MSK + DAY_MS;
    expect(countProductView("1.1.1.1", "p1", nextDayNoon)).toBe(true);
  });

  it("смена дня по МСК в полночь: 23:59 и 00:01 — разные сутки", () => {
    // 2026-10-31T23:59:00+03:00 и 2026-11-01T00:01:00+03:00
    const late = Date.UTC(2026, 9, 31, 20, 59, 0);
    const early = Date.UTC(2026, 10, 1, 21, 1, 0) - DAY_MS; // = 2026-11-01T00:01+03:00
    expect(countProductView("1.1.1.1", "p1", late)).toBe(true);
    expect(countProductView("1.1.1.1", "p1", early)).toBe(true);
  });
});
