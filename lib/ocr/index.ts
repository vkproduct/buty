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

/** Mock-реализация по умолчанию: реальный провайдер появится при интеграции. */
export class MockOcrProvider implements OcrProvider {
  async extractText(_image: File | Blob): Promise<string> {
    throw new OcrNotReadyError();
  }
}

/** Фабрика провайдера: точка подмены на реальный OCR через env-конфиг. */
export function getOcrProvider(): OcrProvider {
  return new MockOcrProvider();
}
