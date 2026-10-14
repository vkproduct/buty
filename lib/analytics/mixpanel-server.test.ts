import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as mixpanelServer from "./mixpanel-server";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  track: vi.fn(),
  peopleSet: vi.fn(),
  cookiesGet: vi.fn(),
  headersGet: vi.fn(),
  headersThrow: false,
}));

vi.mock("mixpanel", () => ({
  default: { init: mocks.init },
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: mocks.cookiesGet }),
  headers: () => {
    if (mocks.headersThrow) throw new Error("next/headers вне контекста запроса");
    return { get: mocks.headersGet };
  },
}));

/** Токен читается при загрузке модуля — импортируем заново после stubEnv. */
async function importModule(): Promise<typeof mixpanelServer> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "test-token");
  return await import("./mixpanel-server");
}

describe("серверный Mixpanel — PII и согласие", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.headersThrow = false;
    mocks.init.mockReturnValue({ track: mocks.track, people: { set: mocks.peopleSet } });
  });

  it("stripPii вырезает email в любом регистре и оставляет остальное", async () => {
    const mod = await importModule();
    expect(
      mod.stripPii({ $email: "a@b.c", email: "a@b.c", Email: "x", sign_up_method: "email" }),
    ).toEqual({ sign_up_method: "email" });
  });

  it("cookie buty_cookie_consent=all, без Bearer — событие уходит без PII, с distinct_id", async () => {
    const mod = await importModule();
    mocks.headersGet.mockReturnValue(null);
    mocks.cookiesGet.mockReturnValue({ value: "all" });

    mod.trackServerEvent("user-1", "sign_up_completed", {
      sign_up_method: "email",
      platform: "web",
      $email: "a@b.c",
    });

    expect(mocks.track).toHaveBeenCalledTimes(1);
    const [name, props] = mocks.track.mock.calls[0];
    expect(name).toBe("sign_up_completed");
    expect(props).toMatchObject({ sign_up_method: "email", platform: "web", distinct_id: "user-1" });
    expect(props).not.toHaveProperty("$email");
  });

  it("cookie necessary или отсутствует, без Bearer — событие не уходит", async () => {
    const mod = await importModule();
    mocks.headersGet.mockReturnValue(null);

    mocks.cookiesGet.mockReturnValue({ value: "necessary" });
    mod.trackServerEvent("user-1", "sign_up_completed");
    mocks.cookiesGet.mockReturnValue(undefined);
    mod.trackServerEvent("user-1", "sign_up_completed");

    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("Bearer bt_… из приложения, без cookie — событие уходит", async () => {
    const mod = await importModule();
    mocks.headersGet.mockReturnValue("Bearer bt_testtoken123");
    mocks.cookiesGet.mockReturnValue(undefined);

    mod.trackServerEvent("user-1", "sign_up_completed", { platform: "mobile_app" });

    expect(mocks.track).toHaveBeenCalledTimes(1);
    expect(mocks.track.mock.calls[0][1]).toMatchObject({
      distinct_id: "user-1",
      platform: "mobile_app",
    });
  });

  it("вне HTTP-запроса (headers() бросает) — событие не уходит, исключение глотается", async () => {
    const mod = await importModule();
    mocks.headersThrow = true;

    expect(() => mod.trackServerEvent("user-1", "sign_up_completed")).not.toThrow();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("setServerProfile только с PII — people.set не вызывается", async () => {
    const mod = await importModule();
    mocks.headersGet.mockReturnValue(null);
    mocks.cookiesGet.mockReturnValue({ value: "all" });

    mod.setServerProfile("user-1", { $email: "a@b.c" });

    expect(mocks.peopleSet).not.toHaveBeenCalled();
  });
});
