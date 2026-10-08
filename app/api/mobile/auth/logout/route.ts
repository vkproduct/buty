import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { parseBearer } from "@/lib/mobile/crypto";
import { readJsonObject } from "@/lib/mobile/http";
import { getMobileSession, deleteMobileSession } from "@/lib/mobile/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/auth/logout { pushToken? } — выйти на этом устройстве:
 * токен перестаёт действовать, push-токен устройства отвязывается.
 */
export async function POST(request: Request) {
  const token = parseBearer(headers().get("authorization"));
  if (!token) return NextResponse.json({ ok: true });

  const session = await getMobileSession(token);
  const body = await readJsonObject(request);
  if (session && body && typeof body.pushToken === "string") {
    await prisma.pushToken.deleteMany({
      where: { token: body.pushToken, userId: session.user.id },
    });
  }
  await deleteMobileSession(token);
  return NextResponse.json({ ok: true });
}
