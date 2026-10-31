import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/mobile/crypto";
import { jsonError, readJsonObject } from "@/lib/mobile/http";
import { requestLoginCode } from "@/lib/mobile/login-code";
import { clientIp, takeQuota } from "@/lib/rate-limit";

/** Кодов в час с одного IP (на разные адреса). */
const CODES_PER_IP_PER_HOUR = 20;

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/code/request { email } — отправить 6-значный код входа на почту.
 * Логика — общая с мобильным приложением (lib/mobile/login-code), письмо — веб-версии.
 */
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body || typeof body.email !== "string") {
    return jsonError("Укажите email", 400);
  }
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return jsonError("Проверьте адрес почты", 400);
  }
  if (!takeQuota(`code:${clientIp(request)}`, CODES_PER_IP_PER_HOUR)) {
    return jsonError("Слишком много запросов — попробуйте через час", 429);
  }
  let result: Awaited<ReturnType<typeof requestLoginCode>>;
  try {
    result = await requestLoginCode(email, undefined, "web");
  } catch (err) {
    console.error(
      "[auth/code/request] email send failed",
      err instanceof Error ? err.message : err,
    );
    return jsonError("Не удалось отправить письмо. Попробуйте позже.", 503);
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, retryAfterSec: result.retryAfterSec },
      { status: result.status, headers: { "Retry-After": String(result.retryAfterSec) } },
    );
  }
  return NextResponse.json({ ok: true });
}
