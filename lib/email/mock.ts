import type { EmailMessage, EmailProvider } from "./provider";

/** Dev-заглушка: не отправляет письма, печатает содержимое (magic-link) в консоль сервера. */
export class MockEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log("\n===== MockEmailProvider =====");
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log(message.text);
    console.log("=============================\n");
  }
}
