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
    for (const s of p.ingredients) {
      if (!idBySlug.has(s)) missingSlugs.add(s);
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
      const { ingredients: slugs, ...data } = p;
      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        update: data,
        create: data,
      });
      await prisma.productIngredient.deleteMany({ where: { productId: product.id } });
      await prisma.productIngredient.createMany({
        data: slugs.map((slug, idx) => ({
          productId: product.id,
          ingredientId: idBySlug.get(slug)!,
          position: idx + 1,
        })),
      });
      linked += slugs.length;
    }
    done += batch.length;
    console.log(`Импортировано ${done}/${INCIDB_PRODUCTS.length}…`);
  }

  console.log(`Готово: ${done} продуктов, ${linked} связей продукт–ингредиент.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
