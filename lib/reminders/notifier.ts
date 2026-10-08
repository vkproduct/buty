/** Контракт отправки уведомлений по напоминаниям (часть 6/8). */

export interface NotificationMessage {
  reminderId: string;
  userId: string;
  userEmail: string;
  /** Средство полки — для перехода из уведомления в его карточку */
  shelfItemId?: string;
  /** Заголовок уведомления (push) */
  title: string;
  text: string;
}

export interface Notifier {
  readonly channel: string;
  send(message: NotificationMessage): Promise<void>;
}
