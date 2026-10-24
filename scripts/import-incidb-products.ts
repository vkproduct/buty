/**
 * Импорт каталога продуктов INCIDB Complete в БД Buty.
 *
 * Источник — prisma/incidb-products.data.ts (генерируется
 * scripts/prepare-incidb-products.py из incidb-complete/csv).
 * Данные составов © Open Beauty Facts contributors, ODbL v1.0:
 * sourceUrl каждого продукта ведёт на его карточку OBF.
 *
 * Запуск ПОСЛЕ `pnpm db:seed` (нужны карточки ингредиентов):
 *   pnpm db:import-incidb
 *
 * Идемпотентно: upsert по slug, состав пересобирается целиком.
 * Курируемые демо-продукты из seed.ts не затрагиваются.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

import { INCIDB_PRODUCTS } from "../prisma/incidb-products.data";
import { decideType, typeFingerprint, type TypeCacheRow, type TypeProductInput } from "../lib/products/product-type";

const prisma = new PrismaClient();
const BATCH = 500;

const TYPES_FILE = process.env.TYPES_FILE ?? "data/incidb/product-types.jsonl";

/** Кэш ИИ-классификатора: последняя запись по каждому slug. Пустая Map, если файла нет. */
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

async function main() {
  // Кэш ИИ-классификатора (ключ — slug): при наличии категория/тип/hidden
  // берутся по общим правилам decideType — иначе форс-импорт вернул бы
  // продукты из «Другого» и открыл бы скрытую не-косметику.
  const typeCache = loadTypeCache();
  console.log(`Кэш типов: ${typeCache.size} записей (${TYPES_FILE})`);

  // slug → id всех ингредиентов одним запросом
  const ingredients = await prisma.ingredient.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(ingredients.map((i) => [i.slug, i.id]));

  // защита от опечаток в сгенерированном файле
  const missingSlugs = new Set<string>();
  for (const p of INCIDB_PRODUCTS) {
    for (const e of p.ingredients) {
      if (!idBySlug.has(e.slug)) missingSlugs.add(e.slug);
    }
  }
  if (missingSlugs.size) {
    console.error("Не найдены slug'и ингредиентов:", [...missingSlugs].slice(0, 20));
    throw new Error(`В БД нет ${missingSlugs.size} slug'ей из INCIDB_PRODUCTS — сначала запустите pnpm db:seed`);
  }

  let done = 0;
  let linked = 0;
  const offset = Number(process.env.IMPORT_OFFSET ?? 0);
  const limit = Number(process.env.IMPORT_LIMIT ?? INCIDB_PRODUCTS.length);
  const end = Math.min(INCIDB_PRODUCTS.length, offset + limit);
  console.log(`Импорт ${offset}…${end} из ${INCIDB_PRODUCTS.length}`);
  for (let i = offset; i < end; i += BATCH) {
    const batch = INCIDB_PRODUCTS.slice(i, Math.min(i + BATCH, end));
    for (const p of batch) {
      const { ingredients: entries, ...data } = p;
      const fp = typeFingerprint({
        sku: p.slug,
        brand: p.brand,
        name: p.name,
        inci: p.rawIngredients ?? "",
      } satisfies TypeProductInput);
      const d = decideType(typeCache.get(p.slug), fp, p.category);
      const typed = {
        ...data,
        source: "incidb" as const,
        category: d.category,
        categorySource: d.categorySource,
        productType: d.productType,
        // уверенная не-косметика остаётся скрытой; остальные — в каталоге
        hidden: d.nonCosmetic,
      };
      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        // продукт снова в каталоге — снимаем hidden, если он был скрыт ранее
        update: typed,
        create: typed,
      });
      await prisma.productIngredient.deleteMany({ where: { productId: product.id } });
      await prisma.productIngredient.createMany({
        // position — исходный position_index этикетки (без перенумерации)
        data: entries.map((e) => ({
          productId: product.id,
          ingredientId: idBySlug.get(e.slug)!,
          position: e.position,
        })),
      });
      linked += entries.length;
    }
    done += batch.length;
    console.log(`Импортировано ${done}/${INCIDB_PRODUCTS.length}…`);
  }

  console.log(`Готово: ${done} продуктов, ${linked} связей продукт–ингредиент.`);

  // Выпавшие из каталога (фильтры prepare-скрипта): есть ссылки
  // (ShelfItem/PartnerClick) — hidden=true; ссылок нет — удаляем.
  // Только при полном прогоне (чанки IMPORT_OFFSET/LIMIT пропускают этот шаг).
  if (offset === 0 && end === INCIDB_PRODUCTS.length) {
    const keepSlugs = new Set(INCIDB_PRODUCTS.map((p) => p.slug));
    // продукты INCIDB имеют slug с суффиксом -<product_id> (≥3 цифр, min 352);
    // демо из seed могут кончаться на -1/-10 (concentration) — не трогаем их
    // чистим только продукты INCIDB (source) — демо из seed и goldapple не трогаем
    const dbProducts = await prisma.product.findMany({
      where: { source: "incidb" },
      select: { id: true, slug: true },
    });
    const orphans = dbProducts.filter((p) => /-\d{3,}$/.test(p.slug) && !keepSlugs.has(p.slug));
    let hidden = 0;
    let deleted = 0;
    for (const o of orphans) {
      const [shelf, clicks] = await Promise.all([
        prisma.shelfItem.count({ where: { productId: o.id } }),
        prisma.partnerClick.count({ where: { productId: o.id } }),
      ]);
      if (shelf > 0 || clicks > 0) {
        await prisma.product.update({ where: { id: o.id }, data: { hidden: true } });
        hidden++;
      } else {
        await prisma.product.delete({ where: { id: o.id } });
        deleted++;
      }
    }
    console.log(`Выпали из каталога INCIDB: ${orphans.length} (скрыто: ${hidden}, удалено без ссылок: ${deleted})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
