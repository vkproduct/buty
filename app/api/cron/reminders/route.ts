import { NextResponse } from "next/server";

import { processDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/reminders — демон-заглушка: отрабатывает due-напоминания.
 * Защищён заголовком x-cron-secret (сверка с env CRON_SECRET).
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET не настроен" },
      { status: 503 },
    );
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  }
  const processed = await processDueReminders();
  return NextResponse.json({ ok: true, processed });
}
