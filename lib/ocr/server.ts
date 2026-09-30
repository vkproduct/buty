import { MockOcrProvider, type OcrProvider } from "./index";
import { GOOGLE_VISION_ENDPOINT, GoogleVisionOcrProvider } from "./google";

/** Серверная фабрика: Google Vision при заданном GOOGLE_VISION_API_KEY, иначе mock. */
export function getServerOcrProvider(): OcrProvider {
  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) return new MockOcrProvider();
  const endpoint = process.env.GOOGLE_VISION_ENDPOINT?.trim() || GOOGLE_VISION_ENDPOINT;
  return new GoogleVisionOcrProvider(apiKey, endpoint);
}
