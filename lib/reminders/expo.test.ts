import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pushToken: { findMany: vi.fn(), deleteMany: vi.fn() },
    notificationLog: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { buildExpoMessages, ExpoPushNotifier, isExpoPushToken } from "./expo";
import type { NotificationMessage, Notifier } from "./notifier";

const MESSAGE: NotificationMessage = {
  reminderId: "r1",
  userId: "u1",
  userEmail: "u@example.com",
  shelfItemId: "s1",
  title: "Оценить результат",
  text: "Прошло 28 дней",
};

function fallbackSpy() {
  const send = vi.fn<(m: NotificationMessage) => Promise<void>>();
  const notifier: Notifier = { channel: "mock", send };
  return { ...notifier, send };
}

describe("ExpoPushNotifier", () => {
  beforeEach(() => vi.clearAllMocks());

  it("распознаёт формат токена Expo", () => {
    expect(isExpoPushToken("ExponentPushToken[abc-123_X]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc]")).toBe(true);
    expect(isExpoPushToken("abc")).toBe(false);
  });

  it("кладёт ссылку на средство в data уведомления", () => {
    const [msg] = buildExpoMessages(["ExponentPushToken[a]"], MESSAGE);
    expect(msg.data.url).toBe("buty://shelf/s1");
    expect(msg.title).toBe("Оценить результат");
  });

  it("без устройств — запасной канал", async () => {
    vi.mocked(prisma.pushToken.findMany).mockResolvedValue([]);
    const fallback = fallbackSpy();
    const fetchImpl = vi.fn();
    await new ExpoPushNotifier(fallback, fetchImpl as never).send(MESSAGE);
    expect(fallback.send).toHaveBeenCalledWith(MESSAGE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("шлёт push и удаляет токены удалённых приложений", async () => {
    vi.mocked(prisma.pushToken.findMany).mockResolvedValue([
      { token: "ExponentPushToken[a]" },
      { token: "ExponentPushToken[b]" },
    ] as never);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ status: "ok", id: "t1" }, { status: "error", details: { error: "DeviceNotRegistered" } }],
      }),
    });
    const fallback = fallbackSpy();
    await new ExpoPushNotifier(fallback, fetchImpl as never).send(MESSAGE);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["ExponentPushToken[b]"] } },
    });
    expect(vi.mocked(prisma.notificationLog.create).mock.calls[0][0].data.channel).toBe("push");
    expect(fallback.send).not.toHaveBeenCalled();
  });

  it("сбой Expo — запасной канал, напоминание не теряется", async () => {
    vi.mocked(prisma.pushToken.findMany).mockResolvedValue([{ token: "ExponentPushToken[a]" }] as never);
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const fallback = fallbackSpy();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await new ExpoPushNotifier(fallback, fetchImpl as never).send(MESSAGE);
    expect(fallback.send).toHaveBeenCalledWith(MESSAGE);
  });
});
