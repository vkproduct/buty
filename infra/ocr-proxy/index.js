/**
 * Переходник Buty → Google (Cloud Run functions, регион в Европе).
 * Сервер в РФ шлёт сюда запросы с ?key=<PROXY_SECRET>; переходник сверяет секрет
 * и пересылает запрос в Google с настоящим ключом. Настоящие ключи хранятся только
 * здесь, в переменных окружения функции.
 *
 * Два направления:
 *  - без параметра target — Google Cloud Vision (распознавание фото состава);
 *  - ?target=gemini — Gemini Interactions API (краткое резюме состава).
 */
const crypto = require("node:crypto");
const functions = require("@google-cloud/functions-framework");

const VISION_ENDPOINT =
  process.env.VISION_ENDPOINT || "https://vision.googleapis.com/v1/images:annotate";
const GEMINI_ENDPOINT =
  process.env.GEMINI_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta/interactions";

function sameSecret(given, expected) {
  const a = Buffer.from(String(given ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function fail(res, status, message) {
  res.status(status).json({ error: { code: status, message } });
}

async function forward(res, url, headers, body, label) {
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    res.status(upstream.status).type("application/json").send(await upstream.text());
  } catch (e) {
    console.error(`[proxy] ${label} недоступен:`, e && e.message ? e.message : e);
    fail(res, 504, `${label} upstream timeout`);
  }
}

functions.http("ocrProxy", async (req, res) => {
  const secret = process.env.PROXY_SECRET;
  if (!secret) return fail(res, 500, "proxy is not configured");
  if (req.method === "GET") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return fail(res, 405, "POST only");
  if (!sameSecret(req.query.key, secret)) return fail(res, 403, "forbidden");

  if (req.query.target === "gemini") {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return fail(res, 500, "gemini is not configured");
    if (!req.body || typeof req.body.model !== "string" || req.body.input === undefined) {
      return fail(res, 400, "expected Gemini Interactions JSON with model and input");
    }
    return forward(res, GEMINI_ENDPOINT, { "x-goog-api-key": geminiKey }, req.body, "Gemini");
  }

  const visionKey = process.env.GOOGLE_VISION_API_KEY;
  if (!visionKey) return fail(res, 500, "vision is not configured");
  if (!req.body || !Array.isArray(req.body.requests)) {
    return fail(res, 400, "expected Vision API JSON with requests[]");
  }
  return forward(
    res,
    `${VISION_ENDPOINT}?key=${encodeURIComponent(visionKey)}`,
    {},
    req.body,
    "Vision",
  );
});
