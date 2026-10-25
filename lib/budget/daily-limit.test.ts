import { beforeEach, describe, expect, it } from "vitest";

import {
  dailyRetryAfter,
  getDailyUsage,
  mskDayStart,
  peekDaily,
  resetDailyLimits,
  takeDaily,
  takePerIpDaily,
} from "./daily-limit";

// Фиксированные моменты: 2026-10-25T20:59:00Z = 23:59 по МСК,
// 2026-10-25T21:01:00Z = 00:01 МСК следующих суток.
const MSK_2359 = Date.parse("2026-10-25T20:59:00Z");
const MSK_0001_NEXT = Date.parse("2026-10-25T21:01:00Z");

beforeEach(() => {
  resetDailyLimits();
});

describe("takeDaily", () => {
  it("лимит срабатывает на N+1-м запросе", () => {
    for (let i = 0; i < 3; i++) expect(takeDaily("k", 3, MSK_2359)).toBe(true);
    expect(takeDaily("k", 3, MSK_2359)).toBe(false);
    expect(getDailyUsage("k").used).toBe(3); // отказ счётчик не растит
  });

  it("счётчики разных ключей независимы", () => {
    takeDaily("a", 1, MSK_2359);
    expect(takeDaily("a", 1, MSK_2359)).toBe(false);
    expect(takeDaily("b", 1, MSK_2359)).toBe(true);
  });

  it("сброс в 00:00 МСК (23:59 → 00:01)", () => {
    for (let i = 0; i < 5; i++) expect(takeDaily("k", 5, MSK_2359)).toBe(true);
    expect(takeDaily("k", 5, MSK_2359)).toBe(false);
    // Новые сутки по МСК — счётчик снова доступен, хотя прошло 2 минуты.
    expect(takeDaily("k", 5, MSK_0001_NEXT)).toBe(true);
  });

  it("не «24 часа от первого запроса»: тот же счётчик внутри тех же суток", () => {
    expect(takeDaily("k", 1, MSK_2359 - 60_000)).toBe(true); // 23:58
    expect(takeDaily("k", 1, MSK_2359)).toBe(false); // 23:59 — те же сутки
  });
});

describe("takePerIpDaily", () => {
  it("лимиты на IP независимы", () => {
    expect(takePerIpDaily("ocr", "1.1.1.1", 1, MSK_2359)).toBe(true);
    expect(takePerIpDaily("ocr", "1.1.1.1", 1, MSK_2359)).toBe(false);
    expect(takePerIpDaily("ocr", "2.2.2.2", 1, MSK_2359)).toBe(true);
  });

  it("общий и пер-IP счётчики с одним префиксом не пересекаются", () => {
    takeDaily("ocr", 1, MSK_2359);
    expect(takeDaily("ocr", 1, MSK_2359)).toBe(false);
    expect(takePerIpDaily("ocr", "1.1.1.1", 1, MSK_2359)).toBe(true);
  });
});

describe("peekDaily", () => {
  it("не увеличивает счётчик", () => {
    expect(peekDaily("k", 2, MSK_2359)).toBe(true);
    expect(getDailyUsage("k").used).toBe(0);
    takeDaily("k", 2, MSK_2359);
    expect(peekDaily("k", 2, MSK_2359)).toBe(true);
    takeDaily("k", 2, MSK_2359);
    expect(peekDaily("k", 2, MSK_2359)).toBe(false);
    expect(getDailyUsage("k").used).toBe(2);
  });
});

describe("getDailyUsage / dailyRetryAfter / mskDayStart", () => {
  it("resetsAt — ближайшие 00:00 МСК", () => {
    takeDaily("k", 10, MSK_2359);
    const usage = getDailyUsage("k");
    expect(usage.used).toBe(1);
    expect(usage.limit).toBe(10);
    expect(usage.resetsAt.toISOString()).toBe("2026-10-25T21:00:00.000Z"); // 00:00 МСК
  });

  it("для пустого счётчика used = 0", () => {
    expect(getDailyUsage("nothing").used).toBe(0);
  });

  it("dailyRetryAfter — секунды до 00:00 МСК", () => {
    expect(dailyRetryAfter(MSK_2359)).toBe(60);
    expect(mskDayStart(MSK_0001_NEXT)).toBe(Date.parse("2026-10-25T21:00:00Z"));
  });
});
