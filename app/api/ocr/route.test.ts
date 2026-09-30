import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OCR_LIMIT_PER_HOUR, resetOcrQuota } from "@/lib/ocr/rate-limit";
import { POST } from "./route";

const fetchMock = vi.fn();

function post(file: Blob | null, ip = "1.1.1.1") {
  const form = new FormData();
  if (file) form.append("image", file, "photo.jpg");
  return POST(
    new Request("http://localhost/api/ocr", {
      method: "POST",
      headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
      body: form,
    }),
  );
}

const jpeg = (size = 16) => new Blob([new Uint8Array(size)], { type: "image/jpeg" });

function visionOk(text: string) {
  return new Response(JSON.stringify({ responses: [{ fullTextAnnotation: { text } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/ocr", () => {
  beforeEach(() => {
    resetOcrQuota();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.GOOGLE_VISION_API_KEY = "test-key";
    delete process.env.GOOGLE_VISION_ENDPOINT;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.GOOGLE_VISION_API_KEY;
  });

  it("без ключа — 501 (mock), Google не вызывается", async () => {
    delete process.env.GOOGLE_VISION_API_KEY;
    const res = await post(jpeg());
    expect(res.status).toBe(501);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("с ключом — DOCUMENT_TEXT_DETECTION и выделенный состав", async () => {
    fetchMock.mockResolvedValueOnce(visionOk("Face cream\nIngredients: Aqua,\nGlycerin"));
    const res = await post(jpeg());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "Aqua, Glycerin" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://vision.googleapis.com/v1/images:annotate?key=test-key");
    const body = JSON.parse(String(init.body));
    expect(body.requests[0].features).toEqual([{ type: "DOCUMENT_TEXT_DETECTION" }]);
    expect(typeof body.requests[0].image.content).toBe("string");
  });

  it("GOOGLE_VISION_ENDPOINT подменяет адрес (переходник)", async () => {
    process.env.GOOGLE_VISION_ENDPOINT = "https://proxy.example.eu/annotate";
    fetchMock.mockResolvedValueOnce(visionOk("Aqua"));
    await post(jpeg());
    expect(fetchMock.mock.calls[0][0]).toBe("https://proxy.example.eu/annotate?key=test-key");
  });

  it("ошибка Google — 502 с понятным текстом", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 403, message: "denied" } }), { status: 403 }),
    );
    const res = await post(jpeg());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/распознавания/);
  });

  it("Google не ответил — 504", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect((await post(jpeg())).status).toBe(504);
  });

  it("на фото нет текста — 422", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ responses: [{}] }), { status: 200 }));
    expect((await post(jpeg())).status).toBe(422);
  });

  it("валидация: нет файла — 400, не картинка — 415, больше 7 МБ — 413", async () => {
    expect((await post(null)).status).toBe(400);
    expect((await post(new Blob(["x"], { type: "application/pdf" }))).status).toBe(415);
    expect((await post(jpeg(7 * 1024 * 1024 + 1))).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("лимит по IP — 429 после исчерпания, другой IP проходит", async () => {
    fetchMock.mockImplementation(async () => visionOk("Aqua"));
    for (let i = 0; i < OCR_LIMIT_PER_HOUR; i++) {
      expect((await post(jpeg(), "2.2.2.2")).status).toBe(200);
    }
    expect((await post(jpeg(), "2.2.2.2")).status).toBe(429);
    expect((await post(jpeg(), "3.3.3.3")).status).toBe(200);
  });
});
