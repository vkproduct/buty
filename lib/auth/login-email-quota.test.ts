import { describe, expect, it } from "vitest";

import {
  checkLoginEmailQuota,
  LOGIN_EMAIL_COOLDOWN_MS,
  LOGIN_EMAIL_MAX_PER_HOUR,
  LOGIN_EMAIL_TOKEN_MAX_AGE_MS,
} from "./login-email-quota";

/** expires токена, созданного в момент createdAt. */
const expiresOf = (createdMs: number) => new Date(createdMs + LOGIN_EMAIL_TOKEN_MAX_AGE_MS);

const NOW = new Date("2026-10-31T12:00:00Z");

describe("checkLoginEmailQuota", () => {
  it("без токенов — можно отправлять", () => {
    expect(checkLoginEmailQuota([], NOW)).toEqual({ ok: true });
  });

  it("последнее письмо меньше минуты назад — отказ (cooldown)", () => {
    const created = NOW.getTime() - 10_000;
    const result = checkLoginEmailQuota([expiresOf(created)], NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("cooldown");
      expect(result.retryAfterSec).toBeGreaterThan(0);
      expect(result.retryAfterSec).toBeLessThanOrEqual(60);
    }
  });

  it("после истечения cooldown — можно", () => {
    const created = NOW.getTime() - LOGIN_EMAIL_COOLDOWN_MS - 1;
    expect(checkLoginEmailQuota([expiresOf(created)], NOW)).toEqual({ ok: true });
  });

  it("5 писем в час — шестой отказан (hourly)", () => {
    const created = [
      NOW.getTime() - 10 * 60_000,
      NOW.getTime() - 20 * 60_000,
      NOW.getTime() - 30 * 60_000,
      NOW.getTime() - 40 * 60_000,
      NOW.getTime() - 50 * 60_000,
    ];
    const result = checkLoginEmailQuota(created.map(expiresOf), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hourly");
  });

  it("старые токены (старше часа) не считаются", () => {
    const created = [
      NOW.getTime() - 2 * 60 * 60_000,
      NOW.getTime() - 90 * 60_000,
      NOW.getTime() - 50 * 60_000,
      NOW.getTime() - 40 * 60_000,
      NOW.getTime() - 30 * 60_000,
      NOW.getTime() - 20 * 60_000,
    ];
    expect(checkLoginEmailQuota(created.map(expiresOf), NOW)).toEqual({ ok: true });
  });

  it("ровно на границе лимита — ещё можно", () => {
    const created = Array.from(
      { length: LOGIN_EMAIL_MAX_PER_HOUR - 1 },
      (_, i) => NOW.getTime() - (i + 1) * 5 * 60_000,
    );
    expect(checkLoginEmailQuota(created.map(expiresOf), NOW)).toEqual({ ok: true });
  });
});
