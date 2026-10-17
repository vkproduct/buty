/**
 * Восстановление slug продуктов goldapple после переименования вариантов типами (17.10).
 *
 * Импорт пересчитывал slug из нового имени (« (маска для волос)» вместо
 * « · вариант N») — slug проиндексирован и меняться не должен. Старые имена
 * детерминированно воспроизводимы: тот же CSV + stripBrand + правила
 * categorizeGoldapple + resolveVariants БЕЗ типов (поведение до b501cb5).
 *
 * Скрипт: вычисляет старый slug для каждого sku, сравнивает с текущим в БД
 * и при расхождении возвращает старый. Идемпотентно.
 *
 * Запуск:
 *   DRY_RUN=1 tsx scripts/restore-goldapple-slugs.ts   # только отчёт (по умолчанию)
 *   DRY_RUN=0 tsx scripts/restore-goldapple-slugs.ts   # применить
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

import { slugify } from "../lib/admin";
import { normalizeInci } from "../lib/ingredients/normalize";
import { categorizeGoldapple } from "../lib/products/goldapple-categorize";
import { resolveVariants, type VariantRow } from "../lib/products/goldapple-dedupe";
import { PRODUCT_CATEGORY_LABEL } from "../lib/seo/labels";

const prisma = new PrismaClient();
const CSV_PATH = process.env.GOLDAPPLE_CSV ?? "data/goldapple/goldapple_products_inci.csv";
const DRY_RUN = process.env.DRY_RUN !== "0";

// Локальные копии parseCsv/stripBrand (в import-goldapple-products.ts они
// несовместимы с импортом: тот файл запускает main() при подключении).

/** Простой CSV-парсер: кавычки, "" внутри полей, BOM, \r\n, переводы строк в полях. */
function parseCsv(text: string): string[][] {
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
function stripBrand(name: string, brand: string): string {
  const n = name.trim();
  const b = brand.trim();
  if (b && n.toLowerCase().startsWith(b.toLowerCase())) {
    const rest = n.slice(b.length).trim();
    if (rest.length > 0) return rest;
  }
  return n;
}

async function main() {
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

  const rows = grid
    .slice(1)
    .filter((r) => r[idx.ready] === "yes" && r[idx.primary] === "yes");

  // Старые имена: правила категорий, без ИИ-типов.
  const variantRows: VariantRow[] = rows.map((r) => {
    const name = stripBrand(r[idx.name], r[idx.brand]);
    return {
      sku: r[idx.sku],
      brand: r[idx.brand],
      name,
      tokens: normalizeInci(r[idx.inci]),
      category: categorizeGoldapple(name, r[idx.flags] ?? ""),
    };
  });
  const resolved = resolveVariants(variantRows, (c) => PRODUCT_CATEGORY_LABEL[c]);

  const oldSlugBySku = new Map<string, string>();
  for (const [sku, v] of resolved) {
    if (v.duplicateOf) continue; // дубли не импортировались
    const base = slugify(`${v.brand} ${v.finalName}`).slice(0, 80).replace(/-+$/, "");
    oldSlugBySku.set(sku, `${base}-ga${sku}`);
  }
  console.log(`Старых slug вычислено: ${oldSlugBySku.size}`);

  const products = await prisma.product.findMany({
    where: { source: "goldapple" },
    select: { id: true, externalId: true, slug: true },
  });

  let checked = 0;
  let mismatched = 0;
  let updated = 0;
  let skippedNoOld = 0;
  for (const p of products) {
    if (!p.externalId) continue;
    const oldSlug = oldSlugBySku.get(p.externalId);
    if (!oldSlug) {
      skippedNoOld++;
      continue;
    }
    checked++;
    if (p.slug === oldSlug) continue;
    mismatched++;
    if (mismatched <= 10) console.log(`  ${p.externalId}: ${p.slug} -> ${oldSlug}`);
    if (!DRY_RUN) {
      // slug может быть занят другим продуктом — тогда пропускаем и сообщаем
      const clash = await prisma.product.findUnique({ where: { slug: oldSlug }, select: { id: true } });
      if (clash && clash.id !== p.id) {
        console.log(`  КОНФЛИКТ: ${oldSlug} занят (${clash.id}) — пропуск ${p.externalId}`);
        continue;
      }
      await prisma.product.update({ where: { id: p.id }, data: { slug: oldSlug } });
      updated++;
    }
  }
  console.log("---");
  console.log(`Продуктов goldapple: ${products.length}, сверено: ${checked}, расходятся: ${mismatched}${DRY_RUN ? " (DRY_RUN)" : `, восстановлено: ${updated}`}, без старого slug: ${skippedNoOld}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
