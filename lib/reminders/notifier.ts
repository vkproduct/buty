/** Контракт отправки уведомлений по напоминаниям (часть 6/8). */

export interface NotificationMessage {
  reminderId: string;
  userEmail: string;
  text: string;
}

export interface Notifier {
  readonly channel: string;
  send(message: NotificationMessage): Promise<void>;
}
