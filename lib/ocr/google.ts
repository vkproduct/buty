import type { OcrProvider } from "./index";
import { toVisionCompatibleJpeg } from "./heic";

export const GOOGLE_VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

/** Ошибка внешнего сервиса распознавания с HTTP-статусом для ответа клиенту. */
export class OcrProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "OcrProviderError";
  }
}

type VisionError = { code?: number; message?: string };
type VisionResponse = {
  error?: VisionError;
  responses?: Array<{ error?: VisionError; fullTextAnnotation?: { text?: string } }>;
};

/** Google Cloud Vision (DOCUMENT_TEXT_DETECTION) через REST API и API-ключ. */
export class GoogleVisionOcrProvider implements OcrProvider {
  constructor(
    private readonly apiKey: string,
    private readonly endpoint: string = GOOGLE_VISION_ENDPOINT,
    private readonly timeoutMs = 20_000,
  ) {}

  async extractText(image: File | Blob): Promise<string> {
    const raw = Buffer.from(await image.arrayBuffer());
    const content = (await toVisionCompatibleJpeg(raw)).toString("base64");
    let res: Response;
    try {
      res = await fetch(`${this.endpoint}?key=${encodeURIComponent(this.apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: { languageHints: ["en", "ru"] },
            },
          ],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      console.error("[ocr] Google Vision недоступен:", e instanceof Error ? e.message : e);
      throw new OcrProviderError("Сервис распознавания не ответил, попробуйте ещё раз", 504);
    }

    const data = (await res.json().catch(() => null)) as VisionResponse | null;
    const error = data?.error ?? data?.responses?.[0]?.error;
    if (!res.ok || error) {
      console.error("[ocr] Google Vision ошибка:", res.status, error?.message ?? "нет тела ответа");
      throw new OcrProviderError("Сервис распознавания вернул ошибку, попробуйте позже");
    }
    return data?.responses?.[0]?.fullTextAnnotation?.text ?? "";
  }
}
