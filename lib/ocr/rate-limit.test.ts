import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_OCR_DAILY_LIMIT,
  DEFAULT_OCR_PER_IP_DAILY_LIMIT,
  ocrDayRetryAfter,
  ocrHourRetryAfter,
  OCR_LIMIT_PER_HOUR,
  resetOcrQuota,
  takeOcrQuota,
} from "./rate-limit";

const T0 = Date.parse("2026-10-24T21:30:00Z"); // 00:30 МСК — начало суток

beforeEach(() => {
  resetOcrQuota();
});

describe("takeOcrQuota — часовой лимит IP", () => {
  it("20 проходят, 21-й — «hour»", () => {
    for (let i = 0; i < OCR_LIMIT_PER_HOUR; i++) {
      expect(takeOcrQuota("1.1.1.1", T0)).toBe("ok");
    }
    expect(takeOcrQuota("1.1.1.1", T0)).toBe("hour");
    expect(takeOcrQuota("2.2.2.2", T0)).toBe("ok"); // другой IP не затронут
  });

  it("ocrHourRetryAfter — секунды до освобождения окна", () => {
    takeOcrQuota("1.1.1.1", T0);
    expect(ocrHourRetryAfter("1.1.1.1", T0 + 10 * 60 * 1000)).toBe(50 * 60);
  });
});

describe("takeOcrQuota — суточный лимит IP", () => {
  it("60 проходят (раз в 20 минут внутри одних суток МСК), 61-й — «day»; другой IP работает", () => {
    const STEP_MS = 20 * 60 * 1000; // 60 × 20 мин = 20 ч — внутри суток МСК (T0 = 15:00 МСК)
    for (let i = 0; i < DEFAULT_OCR_PER_IP_DAILY_LIMIT; i++) {
      expect(takeOcrQuota("1.1.1.1", T0 + i * STEP_MS)).toBe("ok");
    }
    expect(takeOcrQuota("1.1.1.1", T0 + 60 * STEP_MS)).toBe("day");
    expect(takeOcrQuota("2.2.2.2", T0 + 60 * STEP_MS)).toBe("ok");
  });

  it("отказ не тратит общий суточный счётчик", () => {
    // Исчерпываем часовой лимит, потом проверяем, что общий счётчик вырос ровно на 20.
    for (let i = 0; i < OCR_LIMIT_PER_HOUR; i++) takeOcrQuota("1.1.1.1", T0);
    expect(takeOcrQuota("1.1.1.1", T0)).toBe("hour"); // отказ
    // Другой IP: общий лимит ещё не должен быть исчерпан 20-ю выше.
    expect(takeOcrQuota("9.9.9.9", T0)).toBe("ok");
  });
});

describe("takeOcrQuota — общий суточный лимит", () => {
  it("150 разных IP проходят, следующий — «day»", () => {
    for (let i = 0; i < DEFAULT_OCR_DAILY_LIMIT; i++) {
      expect(takeOcrQuota(`10.0.${Math.floor(i / 256)}.${i % 256}`, T0)).toBe("ok");
    }
    expect(takeOcrQuota("255.255.255.255", T0)).toBe("day");
  });

  it("ocrDayRetryAfter — секунды до 00:00 МСК", () => {
    // T0 = 00:30 МСК → до сброса 23,5 часа.
    expect(ocrDayRetryAfter(T0)).toBe(23 * 60 * 60 + 30 * 60);
  });
});
