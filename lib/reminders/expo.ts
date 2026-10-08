/**
 * Push-уведомления через Expo Push Service (iOS — через APNs, Android — FCM).
 * Сервер шлёт POST на exp.host с токенами устройств пользователя;
 * ключи APNs хранятся в Expo (EAS), на нашем сервере их нет.
 * Документация: https://docs.expo.dev/push-notifications/sending-notifications/
 */
import { prisma } from "@/lib/prisma";
import { MockNotifier } from "./mock";
import type { NotificationMessage, Notifier } from "./notifier";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Формат токена Expo: ExponentPushToken[…] или ExpoPushToken[…]. */
export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[\w-]+\]$/.test(token) && token.length <= 200;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/** Тело запроса к Expo для одного напоминания на несколько устройств. */
export function buildExpoMessages(tokens: string[], message: NotificationMessage) {
  return tokens.map((to) => ({
    to,
    title: message.title,
    body: message.text,
    sound: "default",
    data: {
      reminderId: message.reminderId,
      shelfItemId: message.shelfItemId,
      url: message.shelfItemId ? `buty://shelf/${message.shelfItemId}` : "buty://shelf",
    },
  }));
}

/**
 * Push, если у пользователя есть устройства с приложением;
 * иначе — запасной канал (сейчас MockNotifier: запись в NotificationLog).
 */
export class ExpoPushNotifier implements Notifier {
  readonly channel = "push";

  constructor(
    private readonly fallback: Notifier = new MockNotifier(),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: NotificationMessage): Promise<void> {
    const rows = await prisma.pushToken.findMany({
      where: { userId: message.userId },
      select: { token: true },
    });
    if (rows.length === 0) {
      await this.fallback.send(message);
      return;
    }
    const tokens = rows.map((r) => r.token);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    // Необязательно: «Enhanced push security» в настройках проекта Expo
    if (process.env.EXPO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }

    let tickets: ExpoTicket[] = [];
    try {
      const response = await this.fetchImpl(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(buildExpoMessages(tokens, message)),
      });
      if (!response.ok) throw new Error(`Expo push: HTTP ${response.status}`);
      tickets = ((await response.json()) as { data?: ExpoTicket[] }).data ?? [];
    } catch (error) {
      console.error("[ExpoPushNotifier]", error);
      await this.fallback.send(message);
      return;
    }

    // Приложение удалено или уведомления выключены — токен больше не нужен
    const dead = tokens.filter((_, i) => tickets[i]?.details?.error === "DeviceNotRegistered");
    if (dead.length) {
      await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    }
    const delivered = tickets.filter((t) => t.status === "ok").length;
    await prisma.notificationLog.create({
      data: {
        reminderId: message.reminderId,
        channel: this.channel,
        message: `Push на ${delivered} из ${tokens.length} устройств: ${message.text}`,
      },
    });
  }
}
