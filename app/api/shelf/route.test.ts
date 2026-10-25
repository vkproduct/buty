import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shelfItem: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    product: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
}));

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getSession: (...args: unknown[]) => getSession(...args) }));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const count = vi.mocked(prisma.shelfItem.count);
const subFindUnique = vi.mocked(prisma.subscription.findUnique);
const productFindUnique = vi.mocked(prisma.product.findUnique);
const create = vi.mocked(prisma.shelfItem.create);

const USER = { id: "userabc", email: "u@example.com" };
const FUTURE = new Date(Date.now() + 86400_000);

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/shelf — без лимита (все функции бесплатны)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: USER });
    productFindUnique.mockResolvedValue({ id: "p1" } as never);
    create.mockResolvedValue({ id: "item1" } as never);
    subFindUnique.mockResolvedValue(null); // подписки нет
  });

  it("третье средство добавляется на полку без подписки (201)", async () => {
    count.mockResolvedValue(2);
    const res = await post({ productId: "p1" });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();
  });

  it("десятое средство добавляется на полку без подписки (201)", async () => {
    count.mockResolvedValue(9);
    const res = await post({ productId: "p1" });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();
  });

  it("pro добавляет без лимита", async () => {
    count.mockResolvedValue(25);
    subFindUnique.mockResolvedValue({
      plan: "pro",
      status: "active",
      currentPeriodEnd: FUTURE,
    } as never);
    const res = await post({ productId: "p1" });
    expect(res.status).toBe(201);
  });
});
