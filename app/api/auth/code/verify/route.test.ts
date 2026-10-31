import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileLoginCode: { findFirst: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    session: { create: vi.fn() },
    skinProfile: { findUnique: vi.fn() },
  },
}));

const cookiesSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => ({ set: cookiesSet }),
}));

vi.mock("@/lib/analytics/mixpanel-server", () => ({ trackServerEvent: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { trackServerEvent } from "@/lib/analytics/mixpanel-server";
import { hashCode } from "@/lib/mobile/crypto";
import { POST } from "./route";

const codes = vi.mocked(prisma.mobileLoginCode);
const NOW = new Date("2026-10-31T12:00:00Z");
const EMAIL = "vee@mail.ru";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/auth/code/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/code/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.NEXTAUTH_URL = "https://buty.app";
    delete process.env.APP_REVIEW_EMAIL;
    delete process.env.APP_REVIEW_CODE;
    codes.findFirst.mockResolvedValue({
      id: "c1",
      attempts: 0,
      codeHash: hashCode(EMAIL, "123456"),
      expiresAt: new Date(NOW.getTime() + 60_000),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: "u1", email: EMAIL, emailVerified: NOW } as never);
    vi.mocked(prisma.session.create).mockResolvedValue({} as never);
    vi.mocked(prisma.skinProfile.findUnique).mockResolvedValue(null);
  });

  it("неверный код — 400 и сессия не создаётся", async () => {
    codes.findFirst.mockResolvedValue(null);
    const res = await post({ email: EMAIL, code: "000000" });
    expect(res.status).toBe(400);
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(cookiesSet).not.toHaveBeenCalled();
  });

  it("верный код — 200, сессия NextAuth создана, cookie выставлен", async () => {
    const res = await post({ email: EMAIL, code: "123456" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ ok: true, isNewUser: false, hasSkinProfile: false });

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "u1" }),
    });
    expect(cookiesSet).toHaveBeenCalledWith(
      "__Secure-next-auth.session-token",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, secure: true, path: "/" }),
    );
    // Существующий пользователь — регистрацию не шлём
    expect(trackServerEvent).not.toHaveBeenCalled();
  });

  it("новый пользователь — sign_up_completed с sign_up_source", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await post({ email: EMAIL, code: "123456", source: "analyze_gate" });
    expect(res.status).toBe(200);
    expect((await res.json()).isNewUser).toBe(true);
    expect(trackServerEvent).toHaveBeenCalledWith(
      "u1",
      "sign_up_completed",
      expect.objectContaining({
        sign_up_method: "email_code",
        platform: "web",
        sign_up_source: "analyze_gate",
      }),
    );
  });

  it("review-вход (APP_REVIEW_EMAIL/CODE) на сайте отклоняется", async () => {
    process.env.APP_REVIEW_EMAIL = "review@buty.app";
    process.env.APP_REVIEW_CODE = "999999";
    codes.findFirst.mockResolvedValue(null);
    const res = await post({ email: "review@buty.app", code: "999999" });
    expect(res.status).toBe(400);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it("некорректный код формата — 400", async () => {
    expect((await post({ email: EMAIL, code: "12" })).status).toBe(400);
    expect((await post({ email: "not-an-email", code: "123456" })).status).toBe(400);
    expect(codes.findFirst).not.toHaveBeenCalled();
  });
});
