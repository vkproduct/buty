import { describe, expect, it } from "vitest";

import { isReplaySensitivePath } from "./mixpanel";

describe("isReplaySensitivePath", () => {
  it.each(["/shelf", "/shelf/export", "/profile", "/onboarding", "/onboarding/verify", "/brand", "/brand/stats", "/admin", "/admin/users"])(
    "чувствительный путь: %s",
    (p) => {
      expect(isReplaySensitivePath(p)).toBe(true);
    },
  );

  it.each(["/", "/analyze", "/ingredients", "/products", "/sostav", "/for-brands", "/auth/signin"])(
    "обычный путь: %s",
    (p) => {
      expect(isReplaySensitivePath(p)).toBe(false);
    },
  );

  it("не путает префиксы: /brands нет, а /brand есть", () => {
    expect(isReplaySensitivePath("/brands")).toBe(false);
  });
});
