import { NextResponse } from "next/server";

import { processDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * POST/GET /api/cron/reminders — демон-заглушка: отрабатывает due-напоминания.
 * Защищён x-cron-secret (self-hosted cron) или Authorization: Bearer (Vercel Cron).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET не настроен" },
      { status: 503 },
    );
  }
  const bearer = request.headers.get("authorization");
  const ok =
    request.headers.get("x-cron-secret") === secret ||
    bearer === `Bearer ${secret}`;
  if (!ok) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  }
  const processed = await processDueReminders();
  return NextResponse.json({ ok: true, processed });
}

export async function POST(request: Request) {
  return handle(request);
}

/** GET — Vercel Cron дёргает роут именно GET-запросом. */
export async function GET(request: Request) {
  return handle(request);
}
