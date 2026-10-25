import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { subscription: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { getUserPlan, isProActive, USER_FEATURES_FREE } from "./billing";

const findUnique = vi.mocked(prisma.subscription.findUnique);

const future = new Date(Date.now() + 86400_000);
const past = new Date(Date.now() - 86400_000);

describe("isProActive", () => {
  it("pro + active + период в будущем → true", () => {
    expect(
      isProActive({ plan: "pro", status: "active", currentPeriodEnd: future }),
    ).toBe(true);
  });

  it("истёкший период, отмена и free → false", () => {
    expect(
      isProActive({ plan: "pro", status: "active", currentPeriodEnd: past }),
    ).toBe(false);
    expect(
      isProActive({ plan: "pro", status: "canceled", currentPeriodEnd: future }),
    ).toBe(false);
    expect(
      isProActive({ plan: "free", status: "active", currentPeriodEnd: null }),
    ).toBe(false);
    expect(isProActive(null)).toBe(false);
  });
});

describe("getUserPlan при USER_FEATURES_FREE", () => {
  it("возвращает полный доступ (isPro: true) всем, без запроса в БД", async () => {
    expect(USER_FEATURES_FREE).toBe(true);
    const plan = await getUserPlan("u1");
    expect(plan).toEqual({ plan: "free", isPro: true, currentPeriodEnd: null });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
