/**
 * Email-уведомления о напоминаниях: запасной канал для пользователей сайта
 * без приложения (или когда push не доставлен). Письмо уходит через общий
 * EmailProvider (Resend в проде, MockEmailProvider в dev — lib/email).
 * Факт отправки — в NotificationLog с каналом "email".
 */
import { getEmailProvider } from "@/lib/email";
import type { EmailMessage, EmailProvider } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo/site";
import type { NotificationMessage, Notifier } from "./notifier";

/** Текст и тема письма-напоминания: текст push + ссылки на полку и отключение. */
export function buildReminderEmail(message: NotificationMessage): EmailMessage {
  return {
    to: message.userEmail,
    subject: `Напоминание Buty: ${message.title}`,
    text: [
      message.text,
      "",
      `Моя полка: ${SITE_URL}/shelf`,
      // Напоминания удаляются в карточке средства на /shelf («Напомнить мне» → отмена)
      `Отключить напоминания: откройте средство на ${SITE_URL}/shelf и отмените напоминание в разделе «Напомнить мне».`,
    ].join("\n"),
  };
}

export class EmailReminderNotifier implements Notifier {
  readonly channel = "email";

  constructor(private readonly provider: EmailProvider = getEmailProvider()) {}

  async send(message: NotificationMessage): Promise<void> {
    const email = buildReminderEmail(message);
    await this.provider.send(email);
    await prisma.notificationLog.create({
      data: {
        reminderId: message.reminderId,
        channel: this.channel,
        message: `To ${email.to}: ${message.text}`,
      },
    });
  }
}
