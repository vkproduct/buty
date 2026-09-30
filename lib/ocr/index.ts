/** Адаптер OCR: извлечение текста состава с фото упаковки. */

export interface OcrProvider {
  /** Извлекает текст INCI-списка с изображения. */
  extractText(image: File | Blob): Promise<string>;
}

export class OcrNotReadyError extends Error {
  constructor() {
    super("OCR подключается на этапе интеграции");
    this.name = "OcrNotReadyError";
  }
}

/** Mock-реализация по умолчанию: используется сервером, пока не задан ключ распознавания. */
export class MockOcrProvider implements OcrProvider {
  async extractText(_image: File | Blob): Promise<string> {
    throw new OcrNotReadyError();
  }
}

/** Клиентский провайдер: отправляет фото на /api/ocr, ключ распознавания остаётся на сервере. */
export class HttpOcrProvider implements OcrProvider {
  constructor(private readonly endpoint = "/api/ocr") {}

  async extractText(image: File | Blob): Promise<string> {
    const form = new FormData();
    form.append("image", image);
    const res = await fetch(this.endpoint, { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { text?: unknown; error?: unknown };
    if (res.status === 501) throw new OcrNotReadyError();
    if (!res.ok || typeof data.text !== "string") {
      throw new Error(typeof data.error === "string" ? data.error : "Не удалось распознать фото");
    }
    return data.text;
  }
}

/** Фабрика для браузера: распознавание всегда идёт через серверный роут /api/ocr. */
export function getOcrProvider(): OcrProvider {
  return new HttpOcrProvider();
}
