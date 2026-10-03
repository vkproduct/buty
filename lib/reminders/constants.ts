/**
 * Константы напоминаний полки — без зависимостей от БД,
 * чтобы их можно было импортировать и в клиентские компоненты.
 */

export type ReminderKind = "introduce" | "restock";

/** Через сколько дней срабатывает напоминание каждого типа. */
export const REMINDER_DELAYS_DAYS: Record<ReminderKind, number> = {
  introduce: 28,
  restock: 90,
};

/** Понятные пользователю подписи и пояснения к напоминаниям. */
export const REMINDER_COPY: Record<
  ReminderKind,
  { title: string; short: string; why: string }
> = {
  introduce: {
    title: "Оценить результат",
    short: "Оценить",
    why: "Через 28 дней — это полный цикл обновления кожи. Напомним проверить, подошло ли средство и есть ли эффект.",
  },
  restock: {
    title: "Пора докупить",
    short: "Докупить",
    why: "Через 90 дней — примерно столько хватает упаковки. Напомним заранее, чтобы уход не прервался.",
  },
};
