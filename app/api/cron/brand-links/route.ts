import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { brandIsPaid } from "@/lib/brands/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CHECK_USER_AGENT =
  "Mozilla/5.0 (compatible; ButyLinkCheck/1.0; +https://buty.app)";
const TIMEOUT_MS = 10_000;
const BATCH = 300;
const CONCURRENCY = 5;
const CHECK_INTERVAL_MS = 20 * 3_600_000; // не чаще чем раз в 20 часов

/** Маркетплейсы часто отвечают ботам 403/429/498 — это не «битая» ссылка. */
function isSoftBlock(status: number): boolean {
  return status === 403 || status === 429 || status === 498;
}

function isHardFail(status: number): boolean {
  return status === 404 || status === 410 || (status >= 500 && status <= 599);
}

async function checkOne(url: string): Promise<{ status: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": CHECK_USER_AGENT, accept: "text/html,*/*" },
    });
    return { status: res.status };
  } catch {
    // таймаут/сеть — как мягкая блокировка: статус не считаем провалом
    return { status: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET/POST /api/cron/brand-links — раз в сутки проверяет ссылки брендов.
 * 2xx/3xx — ок; 404/410/5xx — failCount++, при двух подряд ссылка битая
 * и скрывается с сайта; 403/429/498 и таймауты — только lastStatus.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET не настроен" }, { status: 503 });
  }
  const bearer = request.headers.get("authorization");
  const ok =
    request.headers.get("x-cron-secret") === secret ||
    bearer === `Bearer ${secret}`;
  if (!ok) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });

  const cutoff = new Date(Date.now() - CHECK_INTERVAL_MS);
  const links = await prisma.productLink.findMany({
    where: {
      active: true,
      OR: [{ lastCheckedAt: { lt: cutoff } }, { lastCheckedAt: null }],
    },
    include: { brand: true, product: { select: { slug: true } } },
    orderBy: { lastCheckedAt: "asc" },
    take: BATCH,
  });
  const toCheck = links.filter((l) => brandIsPaid(l.brand));

  let checked = 0;
  let brokenNow = 0;
  for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
    const chunk = toCheck.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map((l) => checkOne(l.url)));
    for (let j = 0; j < chunk.length; j++) {
      const link = chunk[j];
      const { status } = results[j];
      checked += 1;
      if (status === null || isSoftBlock(status)) {
        await prisma.productLink.update({
          where: { id: link.id },
          data: { lastStatus: status ?? undefined, lastCheckedAt: new Date() },
        });
        continue;
      }
      if (isHardFail(status)) {
        const failCount = link.failCount + 1;
        const broken = failCount >= 2;
        await prisma.productLink.update({
          where: { id: link.id },
          data: {
            lastStatus: status,
            lastCheckedAt: new Date(),
            failCount,
            ...(broken && !link.broken ? { broken: true } : {}),
          },
        });
        if (broken && !link.broken) {
          brokenNow += 1;
          revalidatePath(`/products/${link.product.slug}`);
        }
        continue;
      }
      // 2xx/3xx — ссылка живая
      await prisma.productLink.update({
        where: { id: link.id },
        data: {
          lastStatus: status,
          lastCheckedAt: new Date(),
          failCount: 0,
          ...(link.broken ? { broken: false } : {}),
        },
      });
      if (link.broken) revalidatePath(`/products/${link.product.slug}`);
    }
  }

  return NextResponse.json({ ok: true, checked, brokenNow, skipped: links.length - toCheck.length });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
