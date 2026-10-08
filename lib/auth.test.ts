import { beforeEach, describe, expect, it, vi } from "vitest";

const headerStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: () => ({ get: (k: string) => headerStore.get(k.toLowerCase()) ?? null }),
}));
const getServerSession = vi.fn();
vi.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
vi.mock("next-auth/providers/email", () => ({ default: () => ({}) }));
vi.mock("@next-auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const getMobileSession = vi.fn();
vi.mock("@/lib/mobile/session", () => ({
  getMobileSession: (...a: unknown[]) => getMobileSession(...a),
}));

import { getSession } from "./auth";

describe("getSession: сайт и приложение", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headerStore.clear();
  });

  it("без Bearer — сессия сайта (cookie NextAuth)", async () => {
    getServerSession.mockResolvedValue({ user: { id: "web" } });
    expect(await getSession()).toEqual({ user: { id: "web" } });
    expect(getMobileSession).not.toHaveBeenCalled();
  });

  it("с Bearer — мобильная сессия, cookie не проверяется", async () => {
    headerStore.set("authorization", "Bearer bt_token");
    getMobileSession.mockResolvedValue({ user: { id: "app" } });
    expect(await getSession()).toEqual({ user: { id: "app" } });
    expect(getMobileSession).toHaveBeenCalledWith("bt_token");
    expect(getServerSession).not.toHaveBeenCalled();
  });

  it("недействительный Bearer — null, без отката на cookie", async () => {
    headerStore.set("authorization", "Bearer bt_expired");
    getMobileSession.mockResolvedValue(null);
    expect(await getSession()).toBeNull();
    expect(getServerSession).not.toHaveBeenCalled();
  });
});
