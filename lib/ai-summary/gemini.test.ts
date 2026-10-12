import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGeminiBody,
  DEFAULT_GEMINI_MODEL,
  extractInteractionText,
  geminiConfigFromEnv,
  generateJson,
  GeminiError,
  type GeminiConfig,
} from "./gemini";

const cfg: GeminiConfig = {
  apiKey: "secret",
  endpoint: "https://proxy.example",
  model: "gemini-test",
  thinkingLevel: "low",
  timeoutMs: 1000,
};

afterEach(() => vi.unstubAllGlobals());

describe("geminiConfigFromEnv", () => {
  it("без ключа — выключено", () => {
    expect(geminiConfigFromEnv({} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("значения по умолчанию", () => {
    const c = geminiConfigFromEnv({ GEMINI_API_KEY: "k" } as unknown as NodeJS.ProcessEnv);
    expect(c).toMatchObject({ apiKey: "k", endpoint: null, model: DEFAULT_GEMINI_MODEL, thinkingLevel: "low" });
  });

  it("пустой GEMINI_THINKING_LEVEL отключает параметр", () => {
    const c = geminiConfigFromEnv({ GEMINI_API_KEY: "k", GEMINI_THINKING_LEVEL: "" } as unknown as NodeJS.ProcessEnv);
    expect(c?.thinkingLevel).toBeNull();
    expect(buildGeminiBody(c!, { system: "s", input: "i", schema: {} }).generation_config).toEqual({
      max_output_tokens: 2048,
    });
  });
});

describe("extractInteractionText", () => {
  it("берёт текст из шага model_output", () => {
    const data = {
      status: "completed",
      steps: [
        { type: "thought", content: [{ type: "text", text: "рассуждения" }] },
        { type: "model_output", content: [{ type: "text", text: '{"a":' }, { type: "text", text: "1}" }] },
      ],
    };
    expect(extractInteractionText(data)).toBe('{"a":1}');
  });

  it("понимает раннюю форму с outputs", () => {
    expect(extractInteractionText({ outputs: [{ type: "text", text: "ok" }] })).toBe("ok");
  });

  it("незавершённый ответ — null", () => {
    expect(
      extractInteractionText({ status: "incomplete", steps: [{ type: "model_output", content: [{ type: "text", text: "x" }] }] }),
    ).toBeNull();
  });
});

describe("generateJson", () => {
  it("через переходник: секрет в ?key, target=gemini, без заголовка Google", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "completed",
          steps: [{ type: "model_output", content: [{ type: "text", text: "{}" }] }],
          usage: { total_input_tokens: 100, total_output_tokens: 50, total_thought_tokens: 10 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await generateJson(cfg, { system: "s", input: "i", schema: { type: "object" } });
    expect(r).toEqual({ text: "{}", inputTokens: 100, outputTokens: 60 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://proxy.example?key=secret&target=gemini");
    expect(init.headers["x-goog-api-key"]).toBeUndefined();
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: "gemini-test",
      system_instruction: "s",
      input: "i",
      store: false,
      response_format: { type: "text", mime_type: "application/json", schema: { type: "object" } },
      generation_config: { thinking_level: "low" },
    });
  });

  it("напрямую: ключ в заголовке x-goog-api-key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ steps: [{ type: "model_output", content: [{ type: "text", text: "{}" }] }] })),
    );
    vi.stubGlobal("fetch", fetchMock);
    await generateJson({ ...cfg, endpoint: null }, { system: "s", input: "i", schema: {} });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(init.headers["x-goog-api-key"]).toBe("secret");
  });

  it("ошибка Google превращается в GeminiError со статусом", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "bad" } }), { status: 400 })),
    );
    await expect(generateJson(cfg, { system: "s", input: "i", schema: {} })).rejects.toMatchObject({
      name: "GeminiError",
      status: 400,
    });
    expect(GeminiError).toBeDefined();
  });
});
