import { ReminderType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MockNotifier } from "./mock";
import type { NotificationMessage, Notifier } from "./notifier";

export type { NotificationMessage, Notifier } from "./notifier";

/** Фабрика уведомителя: реальных провайдеров пока нет — всегда Mock. */
export function getNotifier(): Notifier {
  return new MockNotifier();
}

export const REMINDER_DELAYS_DAYS: Record<ReminderType, number> = {
  introduce: 28,
  restock: 90,
};

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
      userEmail: reminder.user.email,
      text: reminderText(reminder.type, title),
    });
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { doneAt: now },
    });
  }
  return due.length;
}
