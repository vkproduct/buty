import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_FIELD = 200;
const MAX_MESSAGE = 5000;

/** POST /api/brand-leads — заявка бренда со страницы /for-brands. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { brandName, contact, email, message } = body as Record<string, unknown>;

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
