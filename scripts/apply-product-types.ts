/**
 * Применение кэша ИИ-классификатора к продуктам БД (этап 2).
 *
 * Источник (TYPES_SOURCE, пока поддержан только incidb): для каждого продукта
 * с записью в кэше data/<source>/product-types.jsonl считается fingerprint и
 * через общий decideType определяются category / categorySource / productType;
 * уверенная не-косметика → hidden = true. Категория по правилам (fallback)
 * берётся из исходного дата-файла импорта (prisma/incidb-products.data.ts),
 * а НЕ из текущего значения в БД — иначе повторный запуск принял бы ИИ-
 * категорию за правильную и отчёт «было → стало» испортился бы.
 *
 * Порог и логика — те же, что в импорте (lib/products/product-type.ts):
 * fingerprint несовпал или записи нет → продукт не трогаем вообще.
 *
 * DRY_RUN=1 (по умолчанию) — только отчёт data/incidb/apply-report.json:
 * сколько категорий изменится (с разбивкой «было → стало»), сколько будет
 * скрыто, полный список скрываемых (бренд, название, slug).
 * DRY_RUN=0 — применение пачками по 200 в $transaction.
 *
 * Идемпотентно: повторный запуск без изменения кэша — changed: 0.
 * Lock /tmp/apply-types.lock; на проде — nice -n 19.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { INCIDB_PRODUCTS } from "../prisma/incidb-products.data";
import { decideType, typeFingerprint, type TypeCacheRow, type TypeProductInput } from "../lib/products/product-type";

const prisma = new PrismaClient();

const SOURCE = process.env.TYPES_SOURCE ?? "incidb";
if (SOURCE !== "incidb") {
  console.error(`TYPES_SOURCE=${SOURCE} не поддержан (пока только incidb; ЗЯ применяется импортом).`);
  process.exit(1);
}

const TYPES_FILE = process.env.TYPES_FILE ?? `data/${SOURCE}/product-types.jsonl`;
const REPORT_FILE = `data/${SOURCE}/apply-report.json`;
const DRY_RUN = process.env.DRY_RUN !== "0";
const LOCK_PATH = "/tmp/apply-types.lock";
const TX_BATCH = 200;

/** Кэш классификатора: последняя запись по каждому ключу (slug INCIDB). */
function loadTypeCache(): Map<string, TypeCacheRow> {
  const map = new Map<string, TypeCacheRow>();
  if (!existsSync(TYPES_FILE)) return map;
  for (const line of readFileSync(TYPES_FILE, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as TypeCacheRow;
      if (row.sku) map.set(row.sku, row);
    } catch {
      // битая строка — пропускаем
    }
  }
  return map;
}

/** Блокировка от параллельных прогонов — как в классификаторе. */
function acquireLock(): void {
  try {
    const pid = Number(readFileSync(LOCK_PATH, "utf8").trim());
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        console.error(`Применение типов уже идёт (PID ${pid}, lock ${LOCK_PATH}) — выход.`);
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

interface ProductRow {
  id: string;
  slug: string;
  brand: string;
  name: string;
  rawIngredients: string | null;
  category: string;
  categorySource: string | null;
  productType: string | null;
  hidden: boolean;
}

async function main() {
  acquireLock();
  try {
    console.log(`Режим: ${DRY_RUN ? "DRY_RUN (только отчёт)" : "РЕАЛЬНОЕ ПРИМЕНЕНИЕ"}`);
    const cache = loadTypeCache();
    console.log(`Кэш типов: ${cache.size} записей (${TYPES_FILE})`);

    // Категория по правилам — из исходного дата-файла импорта (не из БД).
    const ruleCategoryBySlug = new Map(INCIDB_PRODUCTS.map((p) => [p.slug, p.category]));

    // Только нужные поля — без состава (десятки тысяч строк не тащим).
    const products = await prisma.product.findMany({
      where: { source: SOURCE },
      select: {
        id: true,
        slug: true,
        brand: true,
        name: true,
        rawIngredients: true,
        category: true,
        categorySource: true,
        productType: true,
        hidden: true,
      },
      orderBy: { id: "asc" },
    });
    console.log(`Продуктов ${SOURCE} в БД: ${products.length}`);

    let skippedNoRecord = 0;
    let skippedNoRule = 0;
    let unchanged = 0;
    let changed = 0;
    let willHide = 0;
    const transitions = new Map<string, number>();
    const hiddenList: Array<{ brand: string; name: string; slug: string }> = [];
    const updates: Array<{ id: string; data: { category: string; categorySource: "ai" | "rules"; productType: string | null; hidden: boolean } }> = [];

    for (const p of products) {
      const rec = cache.get(p.slug);
      if (!rec) {
        skippedNoRecord++;
        continue;
      }
      const ruleCategory = ruleCategoryBySlug.get(p.slug);
      if (!ruleCategory) {
        // продукта нет в дата-файле импорта — правила не знаем, не трогаем
        skippedNoRule++;
        continue;
      }
      const fp = typeFingerprint({
        sku: p.slug,
        brand: p.brand,
        name: p.name,
        inci: p.rawIngredients ?? "",
      } satisfies TypeProductInput);
      const d = decideType(rec, fp, ruleCategory);

      const hide = d.nonCosmetic && !p.hidden;
      const differs =
        p.category !== d.category ||
        p.categorySource !== d.categorySource ||
        p.productType !== d.productType;
      if (!differs && !hide) {
        unchanged++;
        continue;
      }
      changed++;
      if (differs) {
        const key = `${p.category} → ${d.category}`;
        transitions.set(key, (transitions.get(key) ?? 0) + 1);
      }
      if (hide) {
        willHide++;
        hiddenList.push({ brand: p.brand, name: p.name, slug: p.slug });
      }
      updates.push({
        id: p.id,
        data: {
          category: d.category,
          categorySource: d.categorySource,
          productType: d.productType,
          // hidden выставляем только в true (не-косметика); раз-hide не снимаем
          hidden: hide ? true : p.hidden,
        },
      });
    }

    const report = {
      source: SOURCE,
      dryRun: DRY_RUN,
      products: products.length,
      changed,
      unchanged,
      willHide,
      skippedNoRecord,
      skippedNoRule,
      transitions: [...transitions.entries()].sort((a, b) => b[1] - a[1]),
      hiddenList,
    };
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

    console.log(`---`);
    console.log(`Изменится продуктов: ${changed} (без изменений: ${unchanged})`);
    console.log(`Будет скрыто (не-косметика): ${willHide}`);
    console.log(`Пропущено: без записи в кэше ${skippedNoRecord}, нет в дата-файле ${skippedNoRule}`);
    console.log(`Смена категорий (было → стало):`);
    for (const [t, n] of report.transitions) console.log(`  ${t}: ${n}`);
    console.log(`Отчёт (полный список скрываемых): ${REPORT_FILE}`);

    if (DRY_RUN) {
      console.log("DRY_RUN — в БД ничего не записано.");
      return;
    }

    for (let i = 0; i < updates.length; i += TX_BATCH) {
      const batch = updates.slice(i, i + TX_BATCH);
      await prisma.$transaction(
        batch.map((u) => prisma.product.update({ where: { id: u.id }, data: u.data })),
      );
      console.log(`Применено ${Math.min(i + TX_BATCH, updates.length)}/${updates.length}`);
    }
    console.log(`Готово: ${updates.length} продуктов обновлено.`);
  } finally {
    releaseLock();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
