import { MockEmailProvider } from "./mock";
import type { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./resend";

export type { EmailMessage, EmailProvider } from "./provider";

/**
 * Фабрика провайдера почты.
 * - Есть RESEND_API_KEY и EMAIL_FROM → Resend.
 * - Dev/test без ключа → MockEmailProvider (magic-link выводится в консоль).
 * - Production без ключа → ошибка. Заглушка на проде опасна: письма не уходят,
 *   а ссылки и коды входа попадают в логи контейнера.
 */
export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) return new ResendEmailProvider(apiKey, from);
  if (process.env.NODE_ENV === "production") {
    console.error("[email] RESEND_API_KEY или EMAIL_FROM не заданы — отправка писем на проде невозможна");
    throw new Error("Email provider is not configured");
  }
  return new MockEmailProvider();
}
