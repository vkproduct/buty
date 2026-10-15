/**
 * Импорт каталога goldapple в БД Buty.
 *
 * Источник — data/goldapple/goldapple_products_inci.csv (не в git).
 * Импортируются только строки с ready_for_import = yes и is_family_primary = yes.
 *
 * Порог качества: recognized >= 2 и coverage >= 0.6, иначе продукт пропускается.
 * Идемпотентно: upsert по (source, externalId). Ссылки на источник не сохраняются:
 * sourceUrl = null — на сайте не показываем и не упоминаем магазин-источник.
 *
 * Запуск (после pnpm db:seed, нужны карточки ингредиентов):
 *   DRY_RUN=1 pnpm db:import-goldapple   # сухой прогон (по умолчанию)
 *   DRY_RUN=0 pnpm db:import-goldapple   # реальный импорт
 * Поддерживаются IMPORT_OFFSET / IMPORT_LIMIT (как в импорте INCIDB).
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { slugify } from "../lib/admin";
import { normalizeInci } from "../lib/ingredients/normalize";
import { matchTokens } from "../lib/ingredients/match";
import { categorizeGoldapple } from "../lib/products/goldapple-categorize";

const prisma = new PrismaClient();
const BATCH = 500;
const MIN_RECOGNIZED = 2;
const MIN_COVERAGE = 0.6;

const CSV_PATH = process.env.GOLDAPPLE_CSV ?? "data/goldapple/goldapple_products_inci.csv";
const DRY_RUN = process.env.DRY_RUN !== "0";

interface CsvRow {
  sku: string;
  brand: string;
  name: string;
  inci: string;
  isFamilyPrimary: string;
  readyForImport: string;
  flags: string;
}

/** Простой CSV-парсер: кавычки, "" внутри полей, BOM, \r\n, переводы строк в полях. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.length > 0)) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.length > 0)) rows.push(row);
  }
  return rows;
}

/** Название без бренда: если name начинается с brand (без учёта регистра) — отрезаем. */
export function stripBrand(name: string, brand: string): string {
  const n = name.trim();
  const b = brand.trim();
  if (b && n.toLowerCase().startsWith(b.toLowerCase())) {
    const rest = n.slice(b.length).trim();
    if (rest.length > 0) return rest;
  }
  return n;
}

/** Нормализация для сравнения бренд+название при поиске дублей. */
function dupKey(brand: string, name: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return `${norm(brand)}|${norm(name)}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function main() {
  console.log(`Режим: ${DRY_RUN ? "DRY_RUN (ничего не пишем в БД)" : "РЕАЛЬНЫЙ ИМПОРТ"}`);

  const grid = parseCsv(readFileSync(CSV_PATH, "utf8"));
  const header = grid[0];
  const col = (name: string) => header.indexOf(name);
  const idx = {
    sku: col("sku"),
    brand: col("brand"),
    name: col("name"),
    inci: col("inci_clean"),
    primary: col("is_family_primary"),
    ready: col("ready_for_import"),
    flags: col("flags"),
  };
  if (Object.values(idx).some((i) => i === -1)) {
    throw new Error(`В CSV не хватает колонок: ${JSON.stringify(idx)}`);
  }

  const rows: CsvRow[] = grid.slice(1).map((r) => ({
    sku: r[idx.sku],
    brand: r[idx.brand],
    name: r[idx.name],
    inci: r[idx.inci],
    isFamilyPrimary: r[idx.primary],
    readyForImport: r[idx.ready],
    flags: r[idx.flags] ?? "",
  }));

  const filtered = rows.filter((r) => r.readyForImport === "yes" && r.isFamilyPrimary === "yes");
  console.log(`Строк в CSV: ${rows.length}, после фильтра (ready_for_import=yes, primary): ${filtered.length}`);

  const offset = Number(process.env.IMPORT_OFFSET ?? 0);
  const limit = Number(process.env.IMPORT_LIMIT ?? filtered.length);
  const slice = filtered.slice(offset, offset + limit);
  console.log(`Обрабатываю ${slice.length} строк (offset=${offset}, limit=${limit})`);

  // Словарь ингредиентов — один раз на весь прогон (как в matchIngredients).
  const dictRows = await prisma.ingredient.findMany({
    select: {
      id: true,
      inciName: true,
      slug: true,
      displayName: true,
      synonyms: { select: { alias: true } },
    },
  });
  const dictionary = dictRows.map((r) => ({
    id: r.id,
    inciName: r.inciName,
    slug: r.slug,
    displayName: r.displayName,
    aliases: r.synonyms.map((s) => s.alias),
  }));
  console.log(`Словарь ингредиентов: ${dictionary.length}`);

  // Существующие продукты для проверки дублей (бренд + название).
  const existing = new Set(
    (await prisma.product.findMany({ select: { brand: true, name: true } })).map((p) =>
      dupKey(p.brand, p.name),
    ),
  );
  console.log(`Продуктов уже в БД: ${existing.size}`);

  let imported = 0;
  let skippedDuplicate = 0;
  let skippedLowCoverage = 0;
  const byCategory: Record<string, number> = {};
  const unmatchedCount = new Map<string, number>();
  const coverages: number[] = [];
  const lowCoverageExamples: Array<{ sku: string; brand: string; name: string; total: number; recognized: number }> = [];
  let linked = 0;

  const flushBatch = async (batch: typeof slice) => {
    for (const r of batch) {
      const name = stripBrand(r.name, r.brand);
      if (existing.has(dupKey(r.brand, name))) {
        skippedDuplicate++;
        continue;
      }

      const tokens = normalizeInci(r.inci);
      const { matched, unmatched } = matchTokens(tokens, dictionary);
      const total = tokens.length;
      const recognized = matched.length;
      const coverage = total > 0 ? recognized / total : 0;
      coverages.push(coverage);
      for (const u of unmatched) unmatchedCount.set(u, (unmatchedCount.get(u) ?? 0) + 1);

      if (recognized < MIN_RECOGNIZED || coverage < MIN_COVERAGE) {
        skippedLowCoverage++;
        lowCoverageExamples.push({ sku: r.sku, brand: r.brand, name, total, recognized });
        continue;
      }

      imported++;
      const category = categorizeGoldapple(name, r.flags);
      byCategory[category] = (byCategory[category] ?? 0) + 1;

      // Основа slug — до 80 символов; суффикс -ga<sku> уникален и не подходит
      // под регулярку INCIDB /-\d{3,}$/ ('a' перед цифрами).
      const base = slugify(`${r.brand} ${name}`).slice(0, 80).replace(/-+$/, "");
      const slug = `${base}-ga${r.sku}`;

      if (!DRY_RUN) {
        const product = await prisma.product.upsert({
          where: { source_externalId: { source: "goldapple", externalId: r.sku } },
          update: {
            brand: r.brand,
            name,
            slug,
            category,
            sourceUrl: null,
            rawIngredients: r.inci,
            ingredientsTotal: total,
            ingredientsRecognized: recognized,
            hidden: false,
          },
          create: {
            brand: r.brand,
            name,
            slug,
            category,
            source: "goldapple",
            externalId: r.sku,
            sourceUrl: null,
            rawIngredients: r.inci,
            ingredientsTotal: total,
            ingredientsRecognized: recognized,
            hidden: false,
          },
        });
        await prisma.productIngredient.deleteMany({ where: { productId: product.id } });
        await prisma.productIngredient.createMany({
          // position — 1, 2, 3… в порядке matched (дубли matchTokens уже убрал)
          data: matched.map((m, i) => ({
            productId: product.id,
            ingredientId: m.ingredient.id,
            position: i + 1,
          })),
        });
        linked += matched.length;
        existing.add(dupKey(r.brand, name));
      }
    }
  };

  for (let i = 0; i < slice.length; i += BATCH) {
    await flushBatch(slice.slice(i, i + BATCH));
    console.log(`Обработано ${Math.min(i + BATCH, slice.length)}/${slice.length} ` +
      `(импортировано/будет: ${imported}, дубли: ${skippedDuplicate}, низкое покрытие: ${skippedLowCoverage})`);
  }

  const sorted = [...coverages].sort((a, b) => a - b);
  const report = {
    rows_in_csv: rows.length,
    rows_after_filter: filtered.length,
    imported_or_would_import: imported,
    skipped_duplicate: skippedDuplicate,
    skipped_low_coverage: skippedLowCoverage,
    coverage: {
      median: sorted.length ? percentile(sorted, 50) : 0,
      p25: sorted.length ? percentile(sorted, 25) : 0,
      p75: sorted.length ? percentile(sorted, 75) : 0,
      share_ge_0_8: sorted.length
        ? sorted.filter((c) => c >= 0.8).length / sorted.length
        : 0,
    },
    by_category: byCategory,
    top_unmatched_tokens: [...unmatchedCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 500)
      .map(([token, count]) => [token, count]),
    examples_low_coverage: lowCoverageExamples
      .sort(() => Math.random() - 0.5)
      .slice(0, 30),
  };

  const reportPath = path.join(path.dirname(CSV_PATH), "import-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Отчёт: ${reportPath}`);
  console.log("---");
  console.log(`Строк в CSV: ${report.rows_in_csv}`);
  console.log(`После фильтра: ${report.rows_after_filter}`);
  console.log(`${DRY_RUN ? "Было бы импортировано" : "Импортировано"}: ${imported}${DRY_RUN ? "" : `, связей: ${linked}`}`);
  console.log(`Пропущено (дубль INCIDB): ${skippedDuplicate}`);
  console.log(`Пропущено (низкое покрытие): ${skippedLowCoverage}`);
  console.log(`Покрытие: median=${report.coverage.median.toFixed(3)} p25=${report.coverage.p25.toFixed(3)} ` +
    `p75=${report.coverage.p75.toFixed(3)} share>=0.8=${(report.coverage.share_ge_0_8 * 100).toFixed(1)}%`);
  console.log(`По категориям: ${JSON.stringify(byCategory)}`);
  console.log(`Топ-10 нераспознанных токенов: ${report.top_unmatched_tokens.slice(0, 10).map(([t, c]) => `${t}×${c}`).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
