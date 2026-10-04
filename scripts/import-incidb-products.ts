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
import { INCIDB_PRODUCTS } from "../prisma/incidb-products.data";

const prisma = new PrismaClient();
const BATCH = 500;

async function main() {
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
      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        // продукт снова в каталоге — снимаем hidden, если он был скрыт ранее
        update: { ...data, hidden: false },
        create: data,
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
    const dbProducts = await prisma.product.findMany({ select: { id: true, slug: true } });
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
