import { MockEmailProvider } from "./mock";
import type { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./resend";

export type { EmailMessage, EmailProvider } from "./provider";

/**
 * Фабрика провайдера почты: при наличии RESEND_API_KEY — Resend,
 * иначе MockEmailProvider (dev: magic-link выводится в консоль).
 */
export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) return new ResendEmailProvider(apiKey, from);
  return new MockEmailProvider();
}
