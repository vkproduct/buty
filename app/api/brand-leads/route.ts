import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { clientIp, takeQuota } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_FIELD = 200;
const MAX_MESSAGE = 5000;

/** Заявок в час с одного IP — защита от спам-прогонов формы. */
const LEADS_PER_IP_PER_HOUR = 5;

/** POST /api/brand-leads — заявка бренда со страницы /for-brands. */
export async function POST(request: Request) {
  if (!takeQuota(`brand-leads:${clientIp(request)}`, LEADS_PER_IP_PER_HOUR)) {
    return NextResponse.json(
      { error: "Слишком много заявок. Попробуйте позже." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { brandName, contact, email, message, website } = body as Record<string, unknown>;

  // Honeypot: поле невидимо для человека; боты заполняют его автоматически.
  // Отвечаем успехом, но в БД не пишем.
  if (typeof website === "string" && website.trim()) {
    return NextResponse.json({ lead: { id: "ignored" } }, { status: 201 });
  }

  for (const [key, value] of Object.entries({ brandName, contact, message })) {
    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json(
        { error: `Поле ${key} обязательно` },
        { status: 400 },
      );
    }
  }
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }
  if (
    (brandName as string).length > MAX_FIELD ||
    (contact as string).length > MAX_FIELD ||
    email.length > MAX_FIELD ||
    (message as string).length > MAX_MESSAGE
  ) {
    return NextResponse.json({ error: "Слишком длинный текст" }, { status: 400 });
  }

  const lead = await prisma.brandLead.create({
    data: {
      brandName: (brandName as string).trim(),
      contact: (contact as string).trim(),
      email: email.trim(),
      message: (message as string).trim(),
    },
  });
  return NextResponse.json({ lead: { id: lead.id } }, { status: 201 });
}
