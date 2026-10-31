import { NextResponse } from "next/server";

import { mskDayStart } from "@/lib/budget/daily-limit";
import { prisma } from "@/lib/prisma";
import { countProductView } from "@/lib/products/views";

export const dynamic = "force-dynamic";

/** Боты и превью не считаются просмотрами. */
const BOT_UA =
  /bot|crawl|spider|slurp|yandex|google|bing|headless|lighthouse|preview/i;

/**
 * POST /api/products/[id]/view — маячок просмотра карточки (sendBeacon).
 * Засчитываем не больше одного просмотра на пару (IP, продукт) в сутки по МСК
 * (lib/products/views) — бренды платят за эту аналитику. Upsert в
 * ProductDailyStat по дню по МСК. Ответ всегда 204.
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
  if (!countProductView(ip, params.id)) return new Response(null, { status: 204 });

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
