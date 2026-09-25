import { NextResponse } from "next/server";
import { SkinType } from "@prisma/client";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_LIST = 20;
const MAX_ITEM_LENGTH = 100;

function cleanList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  if (items.length > MAX_LIST || items.some((v) => v.length > MAX_ITEM_LENGTH)) {
    return null;
  }
  return items.map((v) => v.trim());
}

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

/** POST /api/skin-profile { skinType, concerns, allergies } — создать/обновить профиль. */
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

  const { skinType, concerns, allergies } = body as {
    skinType?: unknown;
    concerns?: unknown;
    allergies?: unknown;
  };

  if (
    typeof skinType !== "string" ||
    !Object.values(SkinType).includes(skinType as SkinType)
  ) {
    return NextResponse.json({ error: "Некорректный тип кожи" }, { status: 400 });
  }
  const cleanConcerns = cleanList(concerns);
  const cleanAllergies = cleanList(allergies);
  if (!cleanConcerns || !cleanAllergies) {
    return NextResponse.json(
      { error: "concerns и allergies должны быть списками строк" },
      { status: 400 },
    );
  }

  const profile = await prisma.skinProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      skinType: skinType as SkinType,
      concerns: cleanConcerns,
      allergies: cleanAllergies,
    },
    update: {
      skinType: skinType as SkinType,
      concerns: cleanConcerns,
      allergies: cleanAllergies,
    },
  });
  return NextResponse.json({ profile });
}
