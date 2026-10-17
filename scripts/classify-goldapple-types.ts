/**
 * Классификация типа средства и категории каталога goldapple через Gemini (этап 1).
 *
 * Источник: продукты БД с source = "goldapple", hidden = false; ингредиенты —
 * из rawIngredients через normalizeInci. Скрипт НИЧЕГО не пишет в таблицу
 * Product — только кэш data/goldapple/product-types.jsonl и отчёт.
 *
 * Кэш: одна строка JSON на продукт { sku, fingerprint, promptVersion, model,
 * type, category, confidence, at }. Продукт пропускается, если в файле уже
 * есть запись с тем же fingerprint и promptVersion — прогон можно прервать
 * и продолжить, повторный запуск ничего не стоит.
 *
 * Переменные:
 *   CLASSIFY_LIMIT          — сколько продуктов обработать за запуск (по умолчанию все);
 *   CLASSIFY_SAMPLE=1       — случайная, но воспроизводимая выборка (seed 42)
 *                             из CLASSIFY_LIMIT продуктов + выгрузка classify-sample.csv;
 *   CLASSIFY_CONCURRENCY    — параллельных запросов (по умолчанию 2, максимум 4);
 *   CLASSIFY_MAX_REQUESTS   — жёсткий потолок запросов за запуск (по умолчанию 800);
 *   TYPES_FILE              — путь к кэшу (по умолчанию data/goldapple/product-types.jsonl).
 *
 * Запуск: pnpm db:classify-types
 * На проде — в фоне, nice -n 19 (см. README), lock /tmp/classify-types.lock.
 */

import { PrismaClient } from "@prisma/client";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { geminiConfigFromEnv, generateJson, GeminiError } from "../lib/ai-summary/gemini";
import { categorizeGoldapple } from "../lib/products/goldapple-categorize";
import {
  classifyInputLine,
  normalizeTypeResult,
  typeFingerprint,
  validateTypeResult,
  type TypeProductInput,
  type TypeResult,
} from "../lib/products/product-type";
import { TYPE_PROMPT_VERSION, TYPE_RESPONSE_SCHEMA, TYPE_SYSTEM_PROMPT } from "../lib/products/product-type-prompt";

const prisma = new PrismaClient();

const BATCH_SIZE = 40;
const TYPES_FILE = process.env.TYPES_FILE ?? "data/goldapple/product-types.jsonl";
const REPORT_FILE = "data/goldapple/classify-report.json";
const SAMPLE_FILE = "data/goldapple/classify-sample.csv";
const LOCK_PATH = "/tmp/classify-types.lock";

const CLASSIFY_LIMIT = Number(process.env.CLASSIFY_LIMIT ?? 0) || Infinity;
const CLASSIFY_SAMPLE = process.env.CLASSIFY_SAMPLE === "1";
const CLASSIFY_CONCURRENCY = Math.min(4, Math.max(1, Number(process.env.CLASSIFY_CONCURRENCY ?? 2)));
const CLASSIFY_MAX_REQUESTS = Number(process.env.CLASSIFY_MAX_REQUESTS ?? 800);

const RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

interface CacheRow {
  sku: string;
  fingerprint: string;
  promptVersion: number;
  model: string;
  type: string;
  category: string;
  confidence: number;
  at: string;
}

/** Блокировка от параллельных прогонов — как в импорте. */
function acquireLock(): void {
  try {
    const pid = Number(readFileSync(LOCK_PATH, "utf8").trim());
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        console.error(`Классификация уже идёт (PID ${pid}, lock ${LOCK_PATH}) — выход.`);
        process.exit(1);
      } catch {
        // процесс умер, lock протух — перезаписываем
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  writeFileSync(LOCK_PATH, String(process.pid));
}

function releaseLock(): void {
  try {
    unlinkSync(LOCK_PATH);
  } catch {
    // уже снят
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Чтение кэша: последняя запись по каждому sku. */
function loadCache(): Map<string, CacheRow> {
  const map = new Map<string, CacheRow>();
  if (!existsSync(TYPES_FILE)) return map;
  for (const line of readFileSync(TYPES_FILE, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as CacheRow;
      if (row.sku) map.set(row.sku, row);
    } catch {
      // битая строка — пропускаем
    }
  }
  return map;
}

/** Детерминированный PRNG (mulberry32) для воспроизводимой выборки. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface BatchOutcome {
  results: TypeResult[];
  inputTokens: number;
  outputTokens: number;
  rejected: number;
  /** true — пачку не удалось обработать, продукты можно переотправить в другом запуске. */
  failed: boolean;
}

async function processBatch(
  cfg: NonNullable<ReturnType<typeof geminiConfigFromEnv>>,
  batch: TypeProductInput[],
): Promise<BatchOutcome> {
  const input = batch.map(classifyInputLine).join("\n");
  const brandBySku = new Map(batch.map((p) => [p.sku, p.brand]));
  const sentSkus = new Set(batch.map((p) => p.sku));

  const attempt = async (): Promise<BatchOutcome | null> => {
    const res = await generateJson(cfg, {
      system: TYPE_SYSTEM_PROMPT,
      input,
      schema: TYPE_RESPONSE_SCHEMA,
      maxOutputTokens: 4096,
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(res.text);
    } catch {
      return null; // ответ не прошёл JSON-разбор
    }
    const items = (parsed as { items?: unknown })?.items;
    if (!Array.isArray(items)) return null;
    const returnedSkus = new Set(
      items
        .map((it) => (it && typeof it === "object" ? (it as { sku?: unknown }).sku : null))
        .filter((s): s is string => typeof s === "string"),
    );
    // sku в ответе должны совпадать с отправленными
    for (const sku of returnedSkus) {
      if (!sentSkus.has(sku)) return null;
    }
    const results: TypeResult[] = [];
    let rejected = 0;
    for (const item of items) {
      const sku = (item as { sku?: unknown })?.sku;
      const validated = validateTypeResult(item, typeof sku === "string" ? brandBySku.get(sku) ?? "" : "");
      if (validated) results.push(normalizeTypeResult(validated));
      else rejected++;
    }
    return { results, inputTokens: res.inputTokens, outputTokens: res.outputTokens, rejected, failed: false };
  };

  // Ретраи на 429 и 5xx: пауза 5, 15, 45 с.
  for (let retry = 0; ; retry++) {
    try {
      const outcome = await attempt();
      if (outcome) return outcome;
      // разбор не удался или sku не совпали — один повтор пачки, потом пропуск
      const retryOutcome = await attempt();
      if (retryOutcome) return retryOutcome;
      console.error(`Пачка (${batch.length} шт.): ответ не разобран дважды — пропускаю.`);
      return { results: [], inputTokens: 0, outputTokens: 0, rejected: 0, failed: true };
    } catch (e) {
      const status = e instanceof GeminiError ? e.status : undefined;
      const retryable = status !== undefined && (status === 429 || status >= 500);
      if (retryable && retry < RETRY_DELAYS_MS.length) {
        console.error(`Gemini ${status}, повтор через ${RETRY_DELAYS_MS[retry] / 1000} с…`);
        await sleep(RETRY_DELAYS_MS[retry]);
        continue;
      }
      console.error(`Пачка (${batch.length} шт.): ${e instanceof Error ? e.message : String(e)}`);
      return { results: [], inputTokens: 0, outputTokens: 0, rejected: 0, failed: true };
    }
  }
}

async function main() {
  acquireLock();
  try {
    const cfg = geminiConfigFromEnv();
    if (!cfg) {
      console.error("GEMINI_API_KEY не задан — классификация невозможна.");
      process.exit(1);
    }
    console.log(`Модель: ${cfg.model}, промпт v${TYPE_PROMPT_VERSION}, пачка ${BATCH_SIZE}, параллельность ${CLASSIFY_CONCURRENCY}, потолок ${CLASSIFY_MAX_REQUESTS} запросов`);

    const cache = loadCache();
    console.log(`Кэш: ${cache.size} записей (${TYPES_FILE})`);

    let products = await prisma.product.findMany({
      where: { source: "goldapple", hidden: false },
      select: { externalId: true, brand: true, name: true, slug: true, category: true, rawIngredients: true },
    });
    console.log(`Продуктов goldapple в БД: ${products.length}`);

    if (CLASSIFY_SAMPLE) {
      const limit = Number.isFinite(CLASSIFY_LIMIT) ? Number(CLASSIFY_LIMIT) : 150;
      products = shuffleSeeded(products, 42).slice(0, limit);
      console.log(`Режим выборки (seed 42): ${products.length} продуктов`);
    } else if (Number.isFinite(CLASSIFY_LIMIT)) {
      products = products.slice(0, Number(CLASSIFY_LIMIT));
    }

    const inputs: TypeProductInput[] = [];
    const metaBySku = new Map<string, { brand: string; name: string; slug: string; category: string; fingerprint: string }>();
    let cached = 0;
    for (const p of products) {
      if (!p.externalId) continue;
      const input: TypeProductInput = {
        sku: p.externalId,
        brand: p.brand,
        name: p.name,
        inci: p.rawIngredients ?? "",
      };
      const fingerprint = typeFingerprint(input);
      const hit = cache.get(p.externalId);
      if (hit && hit.fingerprint === fingerprint && hit.promptVersion === TYPE_PROMPT_VERSION) {
        cached++;
        continue;
      }
      inputs.push(input);
      metaBySku.set(p.externalId, { brand: p.brand, name: p.name, slug: p.slug, category: p.category, fingerprint });
    }
    console.log(`К обработке: ${inputs.length} (уже в кэше: ${cached})`);

    mkdirSync(path.dirname(TYPES_FILE), { recursive: true });

    const batches: TypeProductInput[][] = [];
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) batches.push(inputs.slice(i, i + BATCH_SIZE));

    let processed = 0;
    let requests = 0;
    let rejected = 0;
    let failedBatches = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const categoryDist: Record<string, number> = {};
    const typeCount = new Map<string, number>();
    let confident = 0;
    const sampleRows: Array<{ p: TypeProductInput; r: TypeResult }> = [];

    const runBatch = async (batch: TypeProductInput[]) => {
      if (requests >= CLASSIFY_MAX_REQUESTS) return;
      requests++;
      const outcome = await processBatch(cfg, batch);
      inputTokens += outcome.inputTokens;
      outputTokens += outcome.outputTokens;
      rejected += outcome.rejected;
      if (outcome.failed) {
        failedBatches++;
        return;
      }
      const lines: string[] = [];
      for (const r of outcome.results) {
        const meta = metaBySku.get(r.sku);
        if (!meta) continue;
        lines.push(
          JSON.stringify({
            sku: r.sku,
            fingerprint: meta.fingerprint,
            promptVersion: TYPE_PROMPT_VERSION,
            model: cfg.model,
            type: r.type,
            category: r.category,
            confidence: r.confidence,
            at: new Date().toISOString(),
          } satisfies CacheRow),
        );
        processed++;
        categoryDist[r.category] = (categoryDist[r.category] ?? 0) + 1;
        typeCount.set(r.type, (typeCount.get(r.type) ?? 0) + 1);
        if (r.confidence >= 0.6) confident++;
        if (CLASSIFY_SAMPLE) {
          const p = inputs.find((x) => x.sku === r.sku);
          if (p) sampleRows.push({ p, r });
        }
      }
      if (lines.length > 0) appendFileSync(TYPES_FILE, lines.join("\n") + "\n");
      console.log(`Готово: ${processed}/${inputs.length} (запросов: ${requests}, отклонено: ${rejected})`);
    };

    // Пул параллельных воркеров.
    const queue = [...batches];
    await Promise.all(
      Array.from({ length: CLASSIFY_CONCURRENCY }, async () => {
        while (queue.length > 0 && requests < CLASSIFY_MAX_REQUESTS) {
          const batch = queue.shift();
          if (!batch) break;
          await runBatch(batch);
        }
      }),
    );

    const total = processed + rejected;
    const report = {
      processed,
      cached,
      requests,
      rejected,
      failedBatches,
      inputTokens,
      outputTokens,
      byCategory: categoryDist,
      topTypes: [...typeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50),
      confidentShare: processed > 0 ? confident / processed : 0,
      totalItems: total,
    };
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`Отчёт: ${REPORT_FILE}`);

    if (CLASSIFY_SAMPLE) {
      const esc = (s: string) => `"${s.replaceAll('"', '""')}"`;
      const header = "sku,brand,name,type,category,confidence,rule_category,url";
      const rows = sampleRows.map(({ p, r }) => {
        const meta = metaBySku.get(p.sku);
        const ruleCategory = categorizeGoldapple(meta?.name ?? p.name, "");
        return [
          p.sku,
          esc(p.brand),
          esc(meta?.name ?? p.name),
          esc(r.type),
          r.category,
          String(r.confidence),
          ruleCategory,
          `https://buty.app/products/${meta?.slug ?? ""}`,
        ].join(",");
      });
      writeFileSync(SAMPLE_FILE, "﻿" + [header, ...rows].join("\n") + "\n");
      console.log(`Выборка для проверки: ${SAMPLE_FILE} (${rows.length} строк)`);
    }

    if (requests >= CLASSIFY_MAX_REQUESTS && queue.length > 0) {
      console.log(`Достигнут потолок CLASSIFY_MAX_REQUESTS=${CLASSIFY_MAX_REQUESTS} — запустите ещё раз, кэш продолжит с места остановки.`);
    }
  } finally {
    releaseLock();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
