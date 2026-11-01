-- Честный lastmod в sitemap: дата последнего изменения продукта/ингредиента.
-- Существующие строки получают время наката миграции; дальше @updatedAt
-- обновляется Prisma при create/update (в т.ч. импорты ЗЯ/INCIDB и админка).

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
