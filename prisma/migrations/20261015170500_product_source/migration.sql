-- AlterTable
ALTER TABLE "Product" ADD COLUMN "source" TEXT,
ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_source_externalId_key" ON "Product"("source", "externalId");

-- Источник существующих продуктов INCIDB: slug с суффиксом -<id> (≥3 цифр).
-- Суффикс goldapple "-ga<sku>" не подходит под шаблон ('a' перед цифрами),
-- демо-продукты seed (source = NULL) не затрагиваются.
UPDATE "Product" SET "source" = 'incidb' WHERE "slug" ~ '-[0-9]{3,}$';
