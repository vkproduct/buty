import { beforeEach, describe, expect, it } from "vitest";

import { getDailyUsage, resetDailyLimits } from "@/lib/budget/daily-limit";

import {
  AI_DAILY_COUNTER_KEY,
  AI_LIMIT_PER_IP_PER_HOUR,
  DEFAULT_AI_DAILY_LIMIT,
  DEFAULT_AI_PER_IP_DAILY_LIMIT,
  resetAiQuota,
  takeAiQuota,
} from "./rate-limit";

const T0 = Date.parse("2026-10-24T21:30:00Z"); // 00:30 МСК — начало суток

beforeEach(() => {
  resetAiQuota();
  resetDailyLimits();
});

describe("takeAiQuota", () => {
  it("часовой лимит IP: 30 проходят, 31-й — false; другой IP не затронут", () => {
    for (let i = 0; i < AI_LIMIT_PER_IP_PER_HOUR; i++) {
      expect(takeAiQuota("1.1.1.1", T0)).toBe(true);
    }
    expect(takeAiQuota("1.1.1.1", T0)).toBe(false);
    expect(takeAiQuota("2.2.2.2", T0)).toBe(true);
  });

  it("суточный лимит IP: 60 проходят (раз в 20 минут), 61-й — false", () => {
    const STEP_MS = 20 * 60 * 1000; // 20 ч суммарно — внутри одних суток МСК
    for (let i = 0; i < DEFAULT_AI_PER_IP_DAILY_LIMIT; i++) {
      expect(takeAiQuota("1.1.1.1", T0 + i * STEP_MS)).toBe(true);
    }
    expect(takeAiQuota("1.1.1.1", T0 + 60 * STEP_MS)).toBe(false);
    expect(takeAiQuota("2.2.2.2", T0 + 60 * STEP_MS)).toBe(true);
  });

  it("общий суточный лимит: 200 разных IP проходят, следующий — false", () => {
    for (let i = 0; i < DEFAULT_AI_DAILY_LIMIT; i++) {
      expect(takeAiQuota(`10.0.${Math.floor(i / 256)}.${i % 256}`, T0)).toBe(true);
    }
    expect(takeAiQuota("255.255.255.255", T0)).toBe(false);
  });

  it("отказ по часовому лимиту не тратит суточную квоту", () => {
    for (let i = 0; i < AI_LIMIT_PER_IP_PER_HOUR; i++) takeAiQuota("1.1.1.1", T0);
    expect(takeAiQuota("1.1.1.1", T0)).toBe(false); // часовой отказ
    // Общий счётчик вырос ровно на 30 — не на 31.
    expect(getDailyUsage(AI_DAILY_COUNTER_KEY).used).toBe(AI_LIMIT_PER_IP_PER_HOUR);
  });

  it("env переопределяет лимиты", () => {
    process.env.AI_SUMMARY_DAILY_LIMIT = "2";
    process.env.AI_SUMMARY_PER_IP_DAILY_LIMIT = "1";
    expect(takeAiQuota("1.1.1.1", T0)).toBe(true);
    expect(takeAiQuota("1.1.1.1", T0 + 60 * 60 * 1000)).toBe(false); // per-IP daily 1
    expect(takeAiQuota("2.2.2.2", T0 + 60 * 60 * 1000)).toBe(true); // общий ещё 1 из 2
    expect(takeAiQuota("3.3.3.3", T0 + 2 * 60 * 60 * 1000)).toBe(false); // общий 2 из 2
    delete process.env.AI_SUMMARY_DAILY_LIMIT;
    delete process.env.AI_SUMMARY_PER_IP_DAILY_LIMIT;
  });
});
