import type { EmailMessage, EmailProvider } from "./provider";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Прод-адаптер Resend: требует RESEND_API_KEY и EMAIL_FROM в окружении. */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend: ${response.status} ${await response.text()}`);
    }
  }
}
