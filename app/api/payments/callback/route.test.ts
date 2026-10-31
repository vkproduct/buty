import { describe, expect, it, vi } from "vitest";

// lib/auth тянет next-auth/email (nodemailer не установлен) — мокаем, как в lib/auth.test.ts
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next-auth/providers/email", () => ({ default: () => ({}) }));
vi.mock("@next-auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/mobile/session", () => ({ getMobileSession: vi.fn() }));

import { POST } from "./route";

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
  it("USER_FEATURES_FREE: отвечает 410, даже с валидным mock-paymentId", async () => {
    const res = await post({ paymentId: "mock-pro-month-user_1", status: "succeeded" });
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toBe("Все функции Buty бесплатны");
  });

  it("USER_FEATURES_FREE: 410 и на бессессионный запрос", async () => {
    const res = await post({ paymentId: "anything", status: "succeeded" });
    expect(res.status).toBe(410);
  });
});
