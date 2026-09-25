/** Контракт отправки почты: magic-link (часть 5), далее напоминания и транзакционные письма. */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
