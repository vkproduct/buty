import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { upsert: vi.fn(), update: vi.fn() },
    skinProfile: { findUnique: vi.fn() },
  },
}));
const verifyLoginCode = vi.fn();
vi.mock("@/lib/mobile/login-code", () => ({
  verifyLoginCode: (...a: unknown[]) => verifyLoginCode(...a),
}));
const createMobileSession = vi.fn();
vi.mock("@/lib/mobile/session", () => ({
  createMobileSession: (...a: unknown[]) => createMobileSession(...a),
}));
vi.mock("@/lib/billing", () => ({
  getUserPlan: async () => ({ plan: "free", isPro: false, currentPeriodEnd: null }),
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/mobile/auth/verify-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/mobile/auth/verify-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: "u1",
      email: "vee@mail.ru",
      emailVerified: new Date(),
    } as never);
    vi.mocked(prisma.skinProfile.findUnique).mockResolvedValue(null);
    createMobileSession.mockResolvedValue({ token: "bt_x", expiresAt: new Date("2027-01-01") });
  });

  it("отклоняет код не из 6 цифр без обращения к базе", async () => {
    const res = await post({ email: "vee@mail.ru", code: "12ab" });
    expect(res.status).toBe(400);
    expect(verifyLoginCode).not.toHaveBeenCalled();
  });

  it("неверный код — ошибка, сессия не создаётся", async () => {
    verifyLoginCode.mockResolvedValue({ ok: false, status: 400, error: "Неверный код" });
    const res = await post({ email: "vee@mail.ru", code: "123456" });
    expect(res.status).toBe(400);
    expect(createMobileSession).not.toHaveBeenCalled();
  });

  it("верный код — токен, email в нижнем регистре, флаг профиля", async () => {
    verifyLoginCode.mockResolvedValue({ ok: true });
    const res = await post({ email: " Vee@Mail.RU ", code: "123 456", deviceName: "iPhone 16" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBe("bt_x");
    expect(data.hasSkinProfile).toBe(false);
    expect(verifyLoginCode).toHaveBeenCalledWith("vee@mail.ru", "123456");
    expect(vi.mocked(prisma.user.upsert).mock.calls[0][0].where).toEqual({ email: "vee@mail.ru" });
    expect(createMobileSession).toHaveBeenCalledWith("u1", "iPhone 16");
  });
});
