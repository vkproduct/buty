import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getSession: (...args: unknown[]) => getSession(...args) }));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const findUnique = vi.mocked(prisma.subscription.findUnique);
const upsert = vi.mocked(prisma.subscription.upsert);

const USER = { id: "userabc", email: "u@example.com" };
// Формат MockPaymentProvider: mock_<period>_<userId>_<12 hex>
const PID = `mock_month_${USER.id}_0123456789ab`;

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/payments/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/payments/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: USER });
    findUnique.mockResolvedValue(null);
    upsert.mockImplementation((async (args: unknown) => {
      const { create } = args as { create: Record<string, unknown> };
      return { id: "sub1", ...create };
    }) as never);
  });

  it("требует вход", async () => {
    getSession.mockResolvedValue(null);
    expect((await post({ paymentId: PID, status: "succeeded" })).status).toBe(401);
  });

  it("успешный mock-платёж выдаёт Pro на месяц", async () => {
    const res = await post({ paymentId: PID, status: "succeeded" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan).toBe("pro");

    expect(upsert).toHaveBeenCalledOnce();
    const args = upsert.mock.calls[0][0] as {
      where: { userId: string };
      create: { plan: string; status: string; currentPeriodEnd: Date };
    };
    expect(args.where.userId).toBe(USER.id);
    expect(args.create.plan).toBe("pro");
    expect(args.create.status).toBe("active");
    // Период — примерно месяц вперёд
    const diffDays =
      (args.create.currentPeriodEnd.getTime() - Date.now()) / 86400_000;
    expect(diffDays).toBeGreaterThan(27);
    expect(diffDays).toBeLessThan(32);
  });

  it("продлевает от текущего конца периода, если он в будущем", async () => {
    const currentEnd = new Date(Date.now() + 10 * 86400_000);
    findUnique.mockResolvedValue({
      plan: "pro",
      status: "active",
      currentPeriodEnd: currentEnd,
    } as never);
    const res = await post({ paymentId: PID, status: "succeeded" });
    expect(res.status).toBe(200);
    const args = upsert.mock.calls[0][0] as {
      update: { currentPeriodEnd: Date };
    };
    const diffDays =
      (args.update.currentPeriodEnd.getTime() - currentEnd.getTime()) /
      86400_000;
    expect(diffDays).toBeGreaterThan(27);
    expect(diffDays).toBeLessThan(32);
  });

  it("отклоняет неуспешный статус, чужой и неизвестный платёж", async () => {
    expect((await post({ paymentId: PID, status: "canceled" })).status).toBe(402);
    expect(
      (await post({ paymentId: "mock_month_other55_0123456789ab", status: "succeeded" })).status,
    ).toBe(403);
    expect((await post({ paymentId: "yk_123", status: "succeeded" })).status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
