import { NextResponse } from "next/server";

import { mskDayStart } from "@/lib/budget/daily-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Боты и превью не считаются просмотрами. */
const BOT_UA =
  /bot|crawl|spider|slurp|yandex|google|bing|headless|lighthouse|preview/i;

/** В памяти: не больше 60 маячков в минуту с одного IP (IP в БД не пишем). */
const hits = new Map<string, { minute: number; count: number }>();
const MINUTE_MS = 60_000;
const VIEWS_PER_MINUTE = 60;

function rateLimited(ip: string, now: number): boolean {
  const minute = Math.floor(now / MINUTE_MS);
  const h = hits.get(ip);
  if (!h || h.minute !== minute) {
    hits.set(ip, { minute, count: 1 });
    return false;
  }
  h.count += 1;
  return h.count > VIEWS_PER_MINUTE;
}

/**
 * POST /api/products/[id]/view — маячок просмотра карточки (sendBeacon).
 * Upsert в ProductDailyStat по дню по МСК. Ответ всегда 204.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ua = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) return new Response(null, { status: 204 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (rateLimited(ip, Date.now())) return new Response(null, { status: 204 });

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (product) {
    const day = new Date(mskDayStart());
    await prisma.productDailyStat.upsert({
      where: { productId_day: { productId: product.id, day } },
      create: { productId: product.id, day, views: 1 },
      update: { views: { increment: 1 } },
    });
  }
  return new Response(null, { status: 204 });
}
