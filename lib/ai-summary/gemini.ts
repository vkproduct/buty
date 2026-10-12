/**
 * Клиент Gemini (Interactions API) для резюме состава.
 *
 * Сервер Buty стоит в РФ, поэтому в продакшене запрос идёт через переходник в Европе
 * (infra/ocr-proxy, тот же, что для Google Vision): POST <GEMINI_ENDPOINT>?key=<секрет>&target=gemini.
 * Настоящий ключ Gemini хранится только в переменных переходника.
 * Без GEMINI_ENDPOINT запрос идёт напрямую в Google (для локальной разработки вне РФ).
 */

export const GEMINI_DIRECT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
// Стабильная недорогая модель; 2.5-модели Google закрывает для новых проектов.
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export interface GeminiConfig {
  apiKey: string; // при переходнике — его PROXY_SECRET, без переходника — ключ Gemini
  endpoint: string | null; // адрес переходника; null — напрямую в Google
  model: string;
  thinkingLevel: string | null; // "low" | "medium" | "high"; null — значение модели по умолчанию
  timeoutMs: number;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

/** Настройки из .env; null — ИИ-резюме выключено (ключ не задан). */
export function geminiConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GeminiConfig | null {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const thinking = env.GEMINI_THINKING_LEVEL?.trim();
  return {
    apiKey,
    endpoint: env.GEMINI_ENDPOINT?.trim() || null,
    model: env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    // По умолчанию low: резюме — пересказ готовых фактов, долгие рассуждения не нужны.
    thinkingLevel: thinking === undefined ? "low" : thinking || null,
    timeoutMs: 25_000,
  };
}

export interface GeminiJsonRequest {
  system: string;
  input: string;
  schema: unknown;
  maxOutputTokens?: number;
}

/** Тело запроса к Interactions API. */
export function buildGeminiBody(cfg: GeminiConfig, req: GeminiJsonRequest): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    max_output_tokens: req.maxOutputTokens ?? 2048,
  };
  if (cfg.thinkingLevel) generationConfig.thinking_level = cfg.thinkingLevel;
  return {
    model: cfg.model,
    system_instruction: req.system,
    input: req.input,
    store: false, // Google не хранит запрос для последующих обращений
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: req.schema,
    },
    generation_config: generationConfig,
  };
}

/** Достаёт текст ответа модели из ресурса Interaction. null — ответа нет. */
export function extractInteractionText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as {
    status?: unknown;
    steps?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown }> }>;
    outputs?: Array<{ type?: unknown; text?: unknown }>;
  };
  if (typeof d.status === "string" && d.status !== "completed") return null;

  const texts: string[] = [];
  for (const step of Array.isArray(d.steps) ? d.steps : []) {
    if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const part of step.content) {
      if (part?.type === "text" && typeof part.text === "string") texts.push(part.text);
    }
  }
  // Запасной вариант: ранняя форма ответа Interactions API с полем outputs.
  if (texts.length === 0 && Array.isArray(d.outputs)) {
    for (const part of d.outputs) {
      if (part?.type === "text" && typeof part.text === "string") texts.push(part.text);
    }
  }
  const text = texts.join("").trim();
  return text.length > 0 ? text : null;
}

export interface GeminiResult {
  text: string;
  inputTokens: number;
  outputTokens: number; // включая токены рассуждений: за них тоже платим
}

function usageOf(data: unknown): { inputTokens: number; outputTokens: number } {
  const u = (data as { usage?: Record<string, unknown> } | null)?.usage ?? {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    inputTokens: num(u.total_input_tokens),
    outputTokens: num(u.total_output_tokens) + num(u.total_thought_tokens),
  };
}

/** Один запрос к Gemini со структурированным JSON-ответом. */
export async function generateJson(cfg: GeminiConfig, req: GeminiJsonRequest): Promise<GeminiResult> {
  const viaProxy = cfg.endpoint !== null;
  const url = viaProxy
    ? `${cfg.endpoint}?key=${encodeURIComponent(cfg.apiKey)}&target=gemini`
    : GEMINI_DIRECT_ENDPOINT;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (!viaProxy) headers["x-goog-api-key"] = cfg.apiKey;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(buildGeminiBody(cfg, req)),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (e) {
    throw new GeminiError(`Gemini не ответил: ${e instanceof Error ? e.message : String(e)}`);
  }

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      (data as { error?: { message?: unknown } } | null)?.error?.message ?? "нет тела ответа";
    throw new GeminiError(`Gemini ошибка ${res.status}: ${String(message)}`, res.status);
  }
  const text = extractInteractionText(data);
  if (!text) {
    const status = (data as { status?: unknown } | null)?.status;
    throw new GeminiError(`Gemini вернул пустой ответ (status: ${String(status ?? "нет")})`);
  }
  return { text, ...usageOf(data) };
}
