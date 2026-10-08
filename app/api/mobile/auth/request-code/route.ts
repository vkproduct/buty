import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/mobile/crypto";
import { jsonError, readJsonObject } from "@/lib/mobile/http";
import { requestLoginCode } from "@/lib/mobile/login-code";
import { clientIp, takeQuota } from "@/lib/mobile/rate-limit";

/** Кодов в час с одного IP (на разные адреса). */
const CODES_PER_IP_PER_HOUR = 20;

export const dynamic = "force-dynamic";

/** POST /api/mobile/auth/request-code { email } — отправить 6-значный код на почту. */
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
  const result = await requestLoginCode(email);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, retryAfterSec: result.retryAfterSec },
      { status: result.status, headers: { "Retry-After": String(result.retryAfterSec) } },
    );
  }
  return NextResponse.json({ ok: true });
}
