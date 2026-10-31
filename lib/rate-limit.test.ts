import { afterEach, describe, expect, it } from "vitest";

import { clientIp, resetQuota, takeQuota } from "./rate-limit";

afterEach(() => resetQuota());

describe("takeQuota", () => {
  it("пропускает до лимита и режет сверх него", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(takeQuota("ip:a", 3, t + i)).toBe(true);
    }
    expect(takeQuota("ip:a", 3, t + 10)).toBe(false);
  });

  it("ключи независимы", () => {
    const t = 1_000_000;
    takeQuota("ip:a", 1, t);
    expect(takeQuota("ip:b", 1, t)).toBe(true);
  });

  it("окно скользящее: час после последнего запроса квота снова есть", () => {
    const t = 1_000_000;
    takeQuota("ip:a", 1, t);
    expect(takeQuota("ip:a", 1, t + 60_000)).toBe(false);
    expect(takeQuota("ip:a", 1, t + 60 * 60 * 1000)).toBe(true);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost/api", { headers });

  it("берёт первый IP из X-Forwarded-For", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });

  it("fallback на X-Real-IP и unknown", () => {
    expect(clientIp(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
