import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationLogCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { notificationLog: { create: (...a: unknown[]) => notificationLogCreate(...a) } },
}));

import type { EmailMessage, EmailProvider } from "@/lib/email";
import { buildReminderEmail, EmailReminderNotifier } from "./email";
import type { NotificationMessage } from "./notifier";

const MESSAGE: NotificationMessage = {
  reminderId: "r1",
  userId: "u1",
  userEmail: "u@example.com",
  shelfItemId: "s1",
  title: "Оценить результат",
  text: "Прошло 28 дней — оцените, как кожа приняла «Крем X».",
};

function emailSpy() {
  const sent: EmailMessage[] = [];
  const provider: EmailProvider = {
    send: vi.fn(async (m: EmailMessage) => {
      sent.push(m);
    }),
  };
  return { provider, sent };
}

describe("buildReminderEmail", () => {
  it("тема «Напоминание Buty: …», текст и ссылки на полку и отключение", () => {
    const email = buildReminderEmail(MESSAGE);
    expect(email.to).toBe("u@example.com");
    expect(email.subject).toBe("Напоминание Buty: Оценить результат");
    expect(email.text).toContain(MESSAGE.text);
    expect(email.text).toContain("/shelf");
    expect(email.text).toContain("Отключить напоминания");
  });
});

describe("EmailReminderNotifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationLogCreate.mockResolvedValue({ id: "log_1" });
  });

  it("шлёт письмо через провайдера и пишет в NotificationLog (канал email)", async () => {
    const { provider, sent } = emailSpy();
    await new EmailReminderNotifier(provider).send(MESSAGE);
    expect(sent).toHaveLength(1);
    expect(notificationLogCreate).toHaveBeenCalledOnce();
    const data = notificationLogCreate.mock.calls[0][0].data;
    expect(data.channel).toBe("email");
    expect(data.reminderId).toBe("r1");
    expect(data.message).toContain("u@example.com");
  });

  it("работает с MockEmailProvider (dev-заглушка без отправки)", async () => {
    const { MockEmailProvider } = await import("@/lib/email/mock");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await new EmailReminderNotifier(new MockEmailProvider()).send(MESSAGE);
    expect(log).toHaveBeenCalled();
    expect(notificationLogCreate).toHaveBeenCalledOnce();
  });
});
