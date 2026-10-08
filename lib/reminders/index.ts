import { ReminderType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { REMINDER_COPY } from "./constants";
import { ExpoPushNotifier } from "./expo";
import type { Notifier } from "./notifier";

export type { NotificationMessage, Notifier } from "./notifier";

/**
 * Фабрика уведомителя: push в приложение (Expo), если у пользователя есть
 * устройство с приложением; иначе — MockNotifier (запись в NotificationLog).
 */
export function getNotifier(): Notifier {
  return new ExpoPushNotifier();
}

export { REMINDER_COPY, REMINDER_DELAYS_DAYS } from "./constants";
export type { ReminderKind } from "./constants";

/** Текст уведомления по типу напоминания. */
export function reminderText(type: ReminderType, itemTitle: string): string {
  return type === "introduce"
    ? `Прошло 28 дней — оцените, как кожа приняла «${itemTitle}».`
    : `Прошло 90 дней — возможно, «${itemTitle}» заканчивается, пора докупить.`;
}

/**
 * Отрабатывает due-напоминания: отправляет через Notifier и помечает doneAt.
 * Возвращает количество обработанных.
 */
export async function processDueReminders(now = new Date()): Promise<number> {
  const due = await prisma.reminder.findMany({
    where: { doneAt: null, nextRunAt: { lte: now } },
    include: { user: true, shelfItem: { include: { product: true } } },
  });
  const notifier = getNotifier();
  for (const reminder of due) {
    const title =
      reminder.shelfItem.product?.name ??
      reminder.shelfItem.customName ??
      "Своё средство";
    await notifier.send({
      reminderId: reminder.id,
      userId: reminder.userId,
      userEmail: reminder.user.email,
      shelfItemId: reminder.shelfItemId,
      title: REMINDER_COPY[reminder.type].title,
      text: reminderText(reminder.type, title),
    });
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { doneAt: now },
    });
  }
  return due.length;
}
