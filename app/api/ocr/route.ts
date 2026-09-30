import { NextResponse } from "next/server";

import { OcrNotReadyError } from "@/lib/ocr";
import { extractInci } from "@/lib/ocr/extract-inci";
import { OcrProviderError } from "@/lib/ocr/google";
import { MAX_IMAGE_BYTES, takeOcrQuota } from "@/lib/ocr/rate-limit";
import { getServerOcrProvider } from "@/lib/ocr/server";

export const dynamic = "force-dynamic";

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

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

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!takeOcrQuota(ip)) {
    return fail("Слишком много фото подряд — попробуйте через час или вставьте состав текстом", 429);
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
