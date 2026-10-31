import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock хостируется над объявлениями — мок создаём через vi.hoisted, иначе TDZ-ошибка
const { handlerMock } = vi.hoisted(() => ({
  handlerMock: vi.fn(async () => new Response(JSON.stringify({ url: "https://buty.app/" }))),
}));

vi.mock("next-auth", () => ({ default: () => handlerMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "1.2.3.4",
  takeQuota: vi.fn(() => true),
}));

import { POST } from "./route";

beforeEach(() => {
  handlerMock.mockClear();
});

describe("POST /api/auth/[...nextauth]", () => {
  it("передаёт context в обработчик NextAuth (иначе next-auth v4 уходит в Pages Router и отдаёт 500 на «Выйти»)", async () => {
    const request = new Request("https://buty.app/api/auth/signout", { method: "POST" });
    const context = { params: { nextauth: ["signout"] } };

    await POST(request, context);

    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(handlerMock).toHaveBeenCalledWith(request, context);
  });

  it("запрос ссылки входа тоже получает context", async () => {
    const request = new Request("https://buty.app/api/auth/signin/email", { method: "POST" });
    const context = { params: { nextauth: ["signin", "email"] } };

    await POST(request, context);

    expect(handlerMock).toHaveBeenCalledWith(request, context);
  });
});
