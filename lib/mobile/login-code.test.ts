import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileLoginCode: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
const send = vi.fn();
vi.mock("@/lib/email", () => ({ getEmailProvider: () => ({ send }) }));

import { prisma } from "@/lib/prisma";
import { hashCode } from "./crypto";
import { requestLoginCode, verifyLoginCode } from "./login-code";

const codes = vi.mocked(prisma.mobileLoginCode);
const NOW = new Date("2026-10-08T12:00:00Z");
const EMAIL = "vee@mail.ru";

describe("вход по коду из письма", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  it("отправляет код письмом и хранит только хэш", async () => {
    codes.findMany.mockResolvedValue([]);
    const res = await requestLoginCode(EMAIL, NOW);
    expect(res.ok).toBe(true);
    const created = codes.create.mock.calls[0][0].data;
    const code = /(\d{6})/.exec(send.mock.calls[0][0].subject)![1];
    expect(created.codeHash).toBe(hashCode(EMAIL, code));
    expect(created.codeHash).not.toContain(code);
    expect((created.expiresAt as Date).getTime() - NOW.getTime()).toBe(10 * 60 * 1000);
  });

  it("не даёт запросить код чаще раза в минуту", async () => {
    codes.findMany.mockResolvedValue([{ createdAt: new Date(NOW.getTime() - 20_000) }] as never);
    const res = await requestLoginCode(EMAIL, NOW);
    expect(res.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("не больше 5 кодов в час", async () => {
    codes.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ createdAt: new Date(NOW.getTime() - (i + 2) * 120_000) })) as never,
    );
    const res = await requestLoginCode(EMAIL, NOW);
    expect(res.ok).toBe(false);
  });

  it("верный код принимается и гасится", async () => {
    codes.findFirst.mockResolvedValue({ id: "c1", attempts: 0, codeHash: hashCode(EMAIL, "123456") } as never);
    const res = await verifyLoginCode(EMAIL, "123456", NOW);
    expect(res.ok).toBe(true);
    expect(codes.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { expiresAt: NOW } });
  });

  it("неверный код увеличивает счётчик попыток", async () => {
    codes.findFirst.mockResolvedValue({ id: "c1", attempts: 1, codeHash: hashCode(EMAIL, "123456") } as never);
    const res = await verifyLoginCode(EMAIL, "000000", NOW);
    expect(res).toEqual({ ok: false, status: 400, error: "Неверный код. Осталось попыток: 3" });
    expect(codes.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { attempts: { increment: 1 } } });
  });

  it("после 5 неверных попыток код блокируется даже при верном вводе", async () => {
    codes.findFirst.mockResolvedValue({ id: "c1", attempts: 5, codeHash: hashCode(EMAIL, "123456") } as never);
    const res = await verifyLoginCode(EMAIL, "123456", NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(429);
  });

  it("без действующего кода — просьба запросить новый", async () => {
    codes.findFirst.mockResolvedValue(null);
    const res = await verifyLoginCode(EMAIL, "123456", NOW);
    expect(res.ok).toBe(false);
  });
});
