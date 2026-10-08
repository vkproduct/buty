/**
 * Вход в приложение по коду из письма: выдача и проверка кода.
 * Код нельзя перебрать: 5 попыток на код, 5 кодов в час на адрес, срок — 10 минут.
 */
import { getEmailProvider } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  CODE_MAX_ATTEMPTS,
  CODE_MAX_PER_HOUR,
  CODE_RESEND_COOLDOWN_MS,
  CODE_TTL_MS,
  generateCode,
  hashCode,
  isReviewLogin,
  safeEqualHex,
} from "./crypto";

export type RequestCodeResult =
  | { ok: true }
  | { ok: false; status: 429; error: string; retryAfterSec: number };

/** Отправляет новый код на email (предыдущие коды адреса перестают действовать). */
export async function requestLoginCode(email: string, now = new Date()): Promise<RequestCodeResult> {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = await prisma.mobileLoginCode.findMany({
    where: { email, createdAt: { gt: hourAgo } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const last = recent[0];
  if (last && now.getTime() - last.createdAt.getTime() < CODE_RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (CODE_RESEND_COOLDOWN_MS - (now.getTime() - last.createdAt.getTime())) / 1000,
    );
    return { ok: false, status: 429, error: `Новый код можно запросить через ${wait} с`, retryAfterSec: wait };
  }
  if (recent.length >= CODE_MAX_PER_HOUR) {
    return {
      ok: false,
      status: 429,
      error: "Слишком много кодов за час — попробуйте позже",
      retryAfterSec: 3600,
    };
  }

  const code = generateCode();
  // Старые коды адреса удаляем, но строки за последний час нужны для лимита:
  // помечаем их истёкшими вместо удаления.
  await prisma.mobileLoginCode.updateMany({
    where: { email, expiresAt: { gt: now } },
    data: { expiresAt: now },
  });
  await prisma.mobileLoginCode.create({
    data: { email, codeHash: hashCode(email, code), expiresAt: new Date(now.getTime() + CODE_TTL_MS) },
  });
  await getEmailProvider().send({
    to: email,
    subject: `${code} — код входа в Buty`,
    text: `Ваш код для входа в приложение Buty: ${code}\n\nКод действует 10 минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.`,
  });
  return { ok: true };
}

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; status: 400 | 429; error: string };

/** Проверяет код. При успехе код погашается. */
export async function verifyLoginCode(
  email: string,
  code: string,
  now = new Date(),
): Promise<VerifyCodeResult> {
  if (isReviewLogin(email, code)) return { ok: true };

  const row = await prisma.mobileLoginCode.findFirst({
    where: { email, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    return { ok: false, status: 400, error: "Код устарел — запросите новый" };
  }
  if (row.attempts >= CODE_MAX_ATTEMPTS) {
    return { ok: false, status: 429, error: "Слишком много попыток — запросите новый код" };
  }
  if (!safeEqualHex(row.codeHash, hashCode(email, code))) {
    await prisma.mobileLoginCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    const left = CODE_MAX_ATTEMPTS - row.attempts - 1;
    return {
      ok: false,
      status: 400,
      error: left > 0 ? `Неверный код. Осталось попыток: ${left}` : "Неверный код — запросите новый",
    };
  }
  await prisma.mobileLoginCode.update({ where: { id: row.id }, data: { expiresAt: now } });
  return { ok: true };
}
