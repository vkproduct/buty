import { NextResponse } from "next/server";

import { getAnalyzeGate } from "@/lib/analysis/gate";
import { getSession } from "@/lib/auth";
import { dailyRetryAfter, takeDaily } from "@/lib/budget/daily-limit";
import { OcrNotReadyError } from "@/lib/ocr";
import { extractInci } from "@/lib/ocr/extract-inci";
import { OcrProviderError } from "@/lib/ocr/google";
import {
  MAX_IMAGE_BYTES,
  ocrDayRetryAfter,
  ocrHourRetryAfter,
  ocrPerUserDailyLimit,
  takeOcrQuota,
} from "@/lib/ocr/rate-limit";
import { getServerOcrProvider } from "@/lib/ocr/server";

export const dynamic = "force-dynamic";

function fail(error: string, status: number, retryAfter?: number, code?: string) {
  const headers: Record<string, string> = {};
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  return NextResponse.json(code ? { error, code } : { error }, { status, headers });
}

/** Ключ суточного счётчика «фото на пользователя» в lib/budget/daily-limit. */
const OCR_USER_COUNTER_PREFIX = "ocr_user";

/** POST /api/ocr (multipart/form-data, поле image) → { text } — распознанный состав. */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Ожидается multipart/form-data с полем image", 400);
  }

  const image = form.get("image");
  if (!(image instanceof Blob) || image.size === 0) {
    return fail("Прикрепите фото в поле image", 400);
  }
  if (!image.type.startsWith("image/")) {
    return fail("Нужен файл изображения: JPG, PNG или WEBP", 415);
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return fail("Фото больше 7 МБ — сделайте снимок поменьше", 413);
  }

  // Распознавание фото — только для вошедших (как разбор). Проверка до квот,
  // чтобы гости не тратили ни лимиты, ни бюджет Google Vision.
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (userId === null && getAnalyzeGate() !== "off") {
    return fail("Войдите, чтобы распознать фото — это бесплатно", 401, undefined, "auth_required");
  }

  if (userId !== null) {
    if (!takeDaily(`${OCR_USER_COUNTER_PREFIX}:${userId}`, ocrPerUserDailyLimit())) {
      return fail(
        "Распознавание фото на сегодня закончилось — вставьте состав текстом, разбор работает как обычно",
        429,
        dailyRetryAfter(),
      );
    }
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const quota = takeOcrQuota(ip);
  if (quota === "hour") {
    return fail(
      "Слишком много фото подряд — попробуйте через час или вставьте состав текстом",
      429,
      ocrHourRetryAfter(ip),
    );
  }
  if (quota === "day") {
    return fail(
      "Распознавание фото на сегодня закончилось — вставьте состав текстом, разбор работает как обычно",
      429,
      ocrDayRetryAfter(),
    );
  }

  try {
    const text = extractInci(await getServerOcrProvider().extractText(image));
    if (!text) {
      return fail("Не нашли текст на фото — снимите состав крупнее и при хорошем свете", 422);
    }
    return NextResponse.json({ text });
  } catch (e) {
    if (e instanceof OcrNotReadyError) return fail(e.message, 501);
    if (e instanceof OcrProviderError) return fail(e.message, e.status);
    throw e;
  }
}
