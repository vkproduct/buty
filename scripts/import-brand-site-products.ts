/**
 * Импорт продуктов из TSV скрейпера сайтов брендов (scripts/brand-site-scrape).
 *
 * Источник — out/*.tsv скрейпера (url, код, название, бренд, состав).
 * Тот же путь, что у импорта ЗЯ: stripBrand, правила категории/типа, dupKey,
 * порог качества состава (recognized >= 2 и coverage >= 0.6 — иначе пропуск
 * и строка в отчёте), идемпотентный upsert по (source, externalId).
 *
 * Отличия от ЗЯ: source = "brand_site", sourceUrl = URL карточки (сайт бренда
 * показываем как источник), категория/тип — по правилам из названия (без ИИ),
 * бренд — через canonicalBrand со словарём текущей БД.
 *
 * Запуск:
 *   DRY_RUN=1 pnpm tsx scripts/import-brand-site-products.ts out1.tsv [out2.tsv...]
 *   DRY_RUN=0 pnpm tsx scripts/import-brand-site-products.ts out1.tsv ...
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

import { slugify } from "../lib/admin";
import { normalizeInci } from "../lib/ingredients/normalize";
import { matchTokens } from "../lib/ingredients/match";
import { canonicalBrand } from "../lib/products/brand-canonical";
import { knownBrandsByKey } from "../lib/products/brand-db";
import { dupKey } from "../lib/products/goldapple-dedupe";
import { PRODUCT_CATEGORY_LABEL } from "../lib/seo/labels";

const prisma = new PrismaClient();
const BATCH = 200;
const MIN_RECOGNIZED = 2;
const MIN_COVERAGE = 0.6;
const SOURCE = "brand_site";

const DRY_RUN = process.env.DRY_RUN !== "0";
const LOCK_PATH = "/tmp/import-brand-site.lock";

interface TsvRow {
  url: string;
  code: string;
  name: string;
  brand: string;
  inci: string;
}

function acquireLock(): void {
  try {
    const pid = Number(readFileSync(LOCK_PATH, "utf8").trim());
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        console.error(`Импорт уже идёт (PID ${pid}, lock ${LOCK_PATH}) — выход.`);
        process.exit(1);
      } catch {
        // процесс умер, lock протух
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

/** Категория по ключевым словам названия (ru/en, правила вместо ИИ). */
export function categorizeByName(name: string): { category: string; productType: string | null } {
  const n = name.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => n.includes(w));
  if (has("spf", "sunscreen", "солнцезащит")) return { category: "spf", productType: "spf" };
  if (has("шампунь", "shampoo")) return { category: "hair", productType: "шампунь" };
  if (has("бальзам-маска", "маска для волос", "кондиционер", "hair mask", "conditioner", "бальзам для волос"))
    return { category: "hair", productType: null };
  if (has("для волос", "hair")) return { category: "hair", productType: null };
  if (has("сыворотка", "serum")) return { category: "serum", productType: "сыворотка" };
  if (has("пилинг", "скраб", "пиллинг", "peeling", "peel ", "scrub")) return { category: "peeling", productType: null };
  if (has("гель для умывания", "гель очищающий", "средство для умывания", "умывания", "cleansing gel", "cleanser", "wash gel"))
    return { category: "cleanser", productType: "гель для умывания" };
  if (has("тоник", "лосьон", "tonic", "toner", "lotion")) return { category: "toner", productType: "тоник" };
  if (has("гель для лица", "гель для тела", "гель", "gel")) return { category: "treatment", productType: "гель" };
  if (has("маска", "mask")) return { category: "mask", productType: "маска" };
  if (has("крем для рук", "hand cream")) return { category: "cream", productType: "крем для рук" };
  if (has("крем для ног", "foot cream")) return { category: "cream", productType: "крем для ног" };
  if (has("крем для кожи вокруг глаз", "крем для век", "вокруг глаз", "eye cream"))
    return { category: "cream", productType: "крем для кожи вокруг глаз" };
  if (has("крем", "cream")) return { category: "cream", productType: "крем для лица" };
  if (has("мыло", "средство для купания", "soap")) return { category: "hygiene", productType: null };
  return { category: "other", productType: null };
}

/** Убрать из имени «бренд» (как stripBrand в импорте ЗЯ) и хвост объёма. */
export function cleanName(raw: string, brand: string): string {
  let name = raw.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  const b = brand.trim();
  if (b) {
    const re = new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    name = name.replace(re, " ");
  }
  // Формат дистрибьютора: «Latin Name, 30 мл. - Русское описание» — берём
  // латинское имя продукта (до « - »).
  const dash = name.split(" - ");
  if (dash.length > 1) name = dash[0];
  // Русский хвост названия линейки перед латинским именем («кожа Anti Acne
  // Tonic» → «Anti Acne Tonic»); чисто русские названия не трогаем.
  const latin = name.search(/[A-Za-z]/);
  if (latin > 0 && /[а-яё]/i.test(name.slice(0, latin))) {
    name = name.slice(latin);
  }
  name = name
    .replace(/[«»"]/g, " ")
    .replace(/,?\s*\d+(\.\d+)?\s*(мл|ml|г|g|шт|штук|мг)\.?\s*$/i, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,–—-]+|[\s,–—-]+$/g, "")
    .trim();
  return name || raw.trim();
}

function loadTsv(file: string): TsvRow[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const [url, code, name, brand, ...rest] = l.split("\t");
      return { url, code, name, brand, inci: rest.join("\t") };
    });
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Укажите TSV-файлы скрейпера: pnpm tsx scripts/import-brand-site-products.ts out/*.tsv");
    process.exit(1);
  }
  acquireLock();
  console.log(`Режим: ${DRY_RUN ? "DRY_RUN (ничего не пишем в БД)" : "РЕАЛЬНЫЙ ИМПОРТ"}`);

  const rows = files.flatMap(loadTsv).filter((r) => r.inci && !r.inci.startsWith("ERROR"));
  console.log(`Строк: ${rows.length} из ${files.join(", ")}`);

  // Новые данные приходят нормализованными: каноническое имя бренда.
  const knownByKey = await knownBrandsByKey();

  const dictRows = await prisma.ingredient.findMany({
    select: { id: true, inciName: true, slug: true, displayName: true, synonyms: { select: { alias: true } } },
  });
  const dictionary = dictRows.map((r) => ({
    id: r.id,
    inciName: r.inciName,
    slug: r.slug,
    displayName: r.displayName,
    aliases: r.synonyms.map((s) => s.alias),
  }));

  // Дедуп против существующего каталога (всё, что не brand_site).
  const existing = new Set(
    (
      await prisma.product.findMany({
        where: { OR: [{ source: null }, { source: { not: SOURCE } }] },
        select: { brand: true, name: true },
      })
    ).map((p) => dupKey(p.brand, p.name))
  );

  let imported = 0;
  let skippedDuplicate = 0;
  let skippedLowCoverage = 0;
  const lowCoverage: Array<{ brand: string; name: string; total: number; recognized: number }> = [];
  const byCategory: Record<string, number> = {};
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const r of batch) {
      const brand = canonicalBrand(r.brand, knownByKey);
      const name = cleanName(r.name, r.brand);
      const key = dupKey(brand, name);
      if (existing.has(key) || seen.has(key)) {
        skippedDuplicate++;
        continue;
      }
      seen.add(key);

      const tokens = normalizeInci(r.inci);
      const { matched } = matchTokens([...tokens], dictionary);
      const total = tokens.length;
      const recognized = matched.length;
      const coverage = total > 0 ? recognized / total : 0;
      if (recognized < MIN_RECOGNIZED || coverage < MIN_COVERAGE) {
        skippedLowCoverage++;
        lowCoverage.push({ brand, name, total, recognized });
        continue;
      }

      const { category, productType } = categorizeByName(name);
      byCategory[category] = (byCategory[category] ?? 0) + 1;

      // Основа slug — до 80 символов; суффикс -bs<code> уникален и не подходит
      // под регулярку INCIDB /-\d{3,}$/ ('b' перед... суффикс буквенный).
      const base = slugify(`${brand} ${name}`).slice(0, 80).replace(/-+$/, "");
      const slug = `${base}-bs${r.code.replace(/[^a-z0-9]/gi, "")}`;

      imported++;
      if (DRY_RUN) continue;

      const product = await prisma.product.upsert({
        where: { source_externalId: { source: SOURCE, externalId: r.code } },
        update: {
          brand,
          name,
          category,
          productType,
          categorySource: "rules",
          sourceUrl: r.url,
          rawIngredients: r.inci,
          ingredientsTotal: total,
          ingredientsRecognized: recognized,
        },
        create: {
          brand,
          name,
          slug,
          category,
          productType,
          categorySource: "rules",
          source: SOURCE,
          externalId: r.code,
          sourceUrl: r.url,
          rawIngredients: r.inci,
          ingredientsTotal: total,
          ingredientsRecognized: recognized,
        },
      });
      await prisma.productIngredient.deleteMany({ where: { productId: product.id } });
      await prisma.productIngredient.createMany({
        data: matched.map((m, pos) => ({ productId: product.id, ingredientId: m.ingredient.id, position: pos + 1 })),
      });
    }
  }

  console.log(`\nИмпортировано (прошли порог ${MIN_COVERAGE}): ${imported}`);
  console.log(`Дубли против каталога/внутри TSV: ${skippedDuplicate}`);
  console.log(`Отброшено по покрытию: ${skippedLowCoverage}`);
  for (const c of Object.keys(PRODUCT_CATEGORY_LABEL)) {
    if (byCategory[c]) console.log(`  ${c}: ${byCategory[c]}`);
  }
  if (lowCoverage.length) {
    console.log("\nОтброшены (recognized/total):");
    for (const l of lowCoverage) console.log(`  ${l.brand} | ${l.name} | ${l.recognized}/${l.total}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => releaseLock());
