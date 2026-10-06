/**
 * Переходник Buty → Google Cloud Vision (Cloud Run functions, регион в Европе).
 * Сервер в РФ шлёт сюда тот же JSON, что и в Vision API, с ?key=<PROXY_SECRET>.
 * Переходник сверяет секрет и пересылает запрос в Google с настоящим ключом.
 * Настоящий ключ Google хранится только здесь, в переменных окружения функции.
 */
const crypto = require("node:crypto");
const functions = require("@google-cloud/functions-framework");

const VISION_ENDPOINT =
  process.env.VISION_ENDPOINT || "https://vision.googleapis.com/v1/images:annotate";

function sameSecret(given, expected) {
  const a = Buffer.from(String(given ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function fail(res, status, message) {
  res.status(status).json({ error: { code: status, message } });
}

functions.http("ocrProxy", async (req, res) => {
  const secret = process.env.PROXY_SECRET;
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!secret || !apiKey) return fail(res, 500, "proxy is not configured");
  if (req.method === "GET") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return fail(res, 405, "POST only");
  if (!sameSecret(req.query.key, secret)) return fail(res, 403, "forbidden");
  if (!req.body || !Array.isArray(req.body.requests)) {
    return fail(res, 400, "expected Vision API JSON with requests[]");
  }

  try {
    const upstream = await fetch(`${VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(25_000),
    });
    res.status(upstream.status).type("application/json").send(await upstream.text());
  } catch (e) {
    console.error("[ocr-proxy] Vision недоступен:", e && e.message ? e.message : e);
    fail(res, 504, "vision upstream timeout");
  }
});
