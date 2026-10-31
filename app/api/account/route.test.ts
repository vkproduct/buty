import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const deleteUserAccount = vi.fn();

// lib/auth тянет next-auth/email (nodemailer не установлен) — мокаем, как в lib/auth.test.ts
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next-auth/providers/email", () => ({ default: () => ({}) }));
vi.mock("@next-auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/mobile/session", () => ({ getMobileSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: (...a: unknown[]) => getSession(...a) }));
vi.mock("@/lib/account/delete", () => ({
  deleteUserAccount: (...a: unknown[]) => deleteUserAccount(...a),
}));

import { DELETE } from "./route";

describe("DELETE /api/account", () => {
  beforeEach(() => vi.clearAllMocks());

  it("без сессии — 401", async () => {
    getSession.mockResolvedValue(null);
    const res = await DELETE();
    expect(res.status).toBe(401);
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  it("удаляет аккаунт текущего пользователя", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", email: "a@b.c" } });
    deleteUserAccount.mockResolvedValue(undefined);
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(deleteUserAccount).toHaveBeenCalledWith("u1");
  });
});
