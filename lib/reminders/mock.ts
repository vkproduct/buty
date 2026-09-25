import { prisma } from "@/lib/prisma";
import type { NotificationMessage, Notifier } from "./notifier";

/** Mock-уведомитель: вместо реальной отправки пишет запись в NotificationLog. */
export class MockNotifier implements Notifier {
  readonly channel = "mock";

  async send(message: NotificationMessage): Promise<void> {
    await prisma.notificationLog.create({
      data: {
        reminderId: message.reminderId,
        channel: this.channel,
        message: `To ${message.userEmail}: ${message.text}`,
      },
    });
    console.log(
      `[MockNotifier] reminder=${message.reminderId} → ${message.userEmail}: ${message.text}`,
    );
  }
}
