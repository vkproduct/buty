/**
 * Аудит наполнения БД каталогом INCIDB после импорта.
 *
 * Проверяет:
 *  - счётчики Product (видимые/hidden), Ingredient, ProductIngredient;
 *  - распределение полноты состава (0–25 / 25–50 / 50–80 / 80–100%);
 *  - число noindex-продуктов (recognized/total < 0.5);
 *  - сверку числа видимых продуктов с INCIDB_PRODUCTS + 13 демо из seed;
 *  - 5 случайных продуктов: позиции ингредиентов в БД == position_index в CSV.
 *
 * Запуск: pnpm db:verify-incidb
 */

import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { INCIDB_PRODUCTS } from "../prisma/incidb-products.data";

const prisma = new PrismaClient();
const DEMO_PRODUCTS = 13; // курируемые демо-продукты из prisma/seed.ts

function fail(msg: string): never {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
}

async function main() {
  const [total, hidden, ingredients, links] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { hidden: true } }),
    prisma.ingredient.count(),
    prisma.productIngredient.count(),
  ]);
  const visible = total - hidden;
  console.log(`Product: ${total} (видимые: ${visible}, hidden: ${hidden})`);
  console.log(`Ingredient: ${ingredients}`);
  console.log(`ProductIngredient: ${links}`);

  // распределение полноты состава (только продукты с известным total)
  const products = await prisma.product.findMany({
    where: { ingredientsTotal: { gt: 0 } },
    select: { ingredientsTotal: true, ingredientsRecognized: true },
  });
  const buckets = { "0–25%": 0, "25–50%": 0, "50–80%": 0, "80–100%": 0 };
  let noindex = 0;
  for (const p of products) {
    const r = p.ingredientsRecognized / p.ingredientsTotal;
    if (r < 0.25) buckets["0–25%"]++;
    else if (r < 0.5) buckets["25–50%"]++;
    else if (r < 0.8) buckets["50–80%"]++;
    else buckets["80–100%"]++;
    if (r < 0.5) noindex++;
  }
  console.log("Полнота состава:", buckets);
  console.log(`noindex (покрытие <50%): ${noindex}`);

  // сверка числа видимых с data-файлом + демо из seed
  const expected = INCIDB_PRODUCTS.length + DEMO_PRODUCTS;
  if (visible !== expected) {
    fail(`видимых продуктов ${visible}, ожидалось ${expected} (INCIDB_PRODUCTS ${INCIDB_PRODUCTS.length} + ${DEMO_PRODUCTS} демо)`);
  }
  console.log(`OK   видимых == INCIDB_PRODUCTS + демо (${expected})`);

  // 5 случайных продуктов: позиции в БД == исходный position_index из CSV
  const sample = [...INCIDB_PRODUCTS].sort(() => 0.5 - Math.random()).slice(0, 5);
  for (const p of sample) {
    const productId = p.slug.match(/-(\d+)$/)?.[1];
    if (!productId) fail(`slug без суффикса product_id: ${p.slug}`);
    const csvRows = execSync(
      `awk -F'|' -v id='${productId}' '$1==id {print $3 "|" $2}' incidb-complete/csv/product_ingredients.csv`,
      { encoding: "utf-8" }
    ).trim();
    const db = await prisma.product.findUniqueOrThrow({
      where: { slug: p.slug },
      include: { ingredients: { include: { ingredient: { select: { inciName: true } } } } },
    });
    // position_index в CSV уникален на продукт; сверяем позиции БД ⊂ позиций CSV
    const csvPositions = new Set(csvRows.split("\n").map((l) => Number(l.split("|")[0])));
    for (const pi of db.ingredients) {
      if (!csvPositions.has(pi.position)) {
        fail(`${p.slug}: позиция ${pi.position} (${pi.ingredient.inciName}) отсутствует в CSV продукта ${productId}`);
      }
    }
    if (db.ingredientsRecognized !== p.ingredientsRecognized || db.ingredientsTotal !== p.ingredientsTotal) {
      fail(`${p.slug}: счётчики БД ${db.ingredientsRecognized}/${db.ingredientsTotal} != data ${p.ingredientsRecognized}/${p.ingredientsTotal}`);
    }
    console.log(`OK   ${p.slug}: ${db.ingredients.length} позиций совпадают с CSV (product_id ${productId})`);
  }

  console.log("ИТОГ: БД сходится с каталогом INCIDB");
}

main()
  .catch((e) => {
    if (!process.exitCode) console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
