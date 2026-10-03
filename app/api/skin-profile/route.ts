import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSkinProfile } from "@/lib/skin-profile/validate";

export const dynamic = "force-dynamic";

/** GET /api/skin-profile — профиль кожи текущего пользователя. */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const profile = await prisma.skinProfile.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ profile });
}

/**
 * POST /api/skin-profile — создать/обновить профиль.
 * Тело: { skinType, sensitive, concerns, conditions, allergies, intolerances, consent: true }.
 * Без явного согласия (152-ФЗ, ст. 10 — данные о здоровье) профиль не сохраняется.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = parseSkinProfile(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const data = { ...parsed.data, healthConsentAt: new Date() };
  const profile = await prisma.skinProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });
  return NextResponse.json({ profile });
}

/** DELETE /api/skin-profile — удалить профиль кожи (отзыв согласия). */
export async function DELETE() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  await prisma.skinProfile.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
