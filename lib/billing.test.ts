import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { subscription: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import {
  canAddShelfItem,
  FREE_SHELF_LIMIT,
  getUserPlan,
  isProActive,
} from "./billing";

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

describe("canAddShelfItem (paywall: лимит free)", () => {
  it(`free упирается в лимит ${FREE_SHELF_LIMIT} средств`, () => {
    expect(canAddShelfItem(false, 0)).toBe(true);
    expect(canAddShelfItem(false, FREE_SHELF_LIMIT - 1)).toBe(true);
    expect(canAddShelfItem(false, FREE_SHELF_LIMIT)).toBe(false);
    expect(canAddShelfItem(false, FREE_SHELF_LIMIT + 5)).toBe(false);
  });

  it("pro добавляет без лимита", () => {
    expect(canAddShelfItem(true, 0)).toBe(true);
    expect(canAddShelfItem(true, 100)).toBe(true);
  });
});

describe("getUserPlan", () => {
  it("без подписки → free", async () => {
    findUnique.mockResolvedValue(null);
    const plan = await getUserPlan("u1");
    expect(plan).toMatchObject({ plan: "free", isPro: false });
  });

  it("активная pro-подписка → pro", async () => {
    findUnique.mockResolvedValue({
      plan: "pro",
      status: "active",
      currentPeriodEnd: future,
    } as never);
    const plan = await getUserPlan("u1");
    expect(plan).toMatchObject({ plan: "pro", isPro: true });
  });
});
