-- Полнота состава (INCIDB): исходный текст, покрытие распознавания, скрытие из каталога.
-- IF NOT EXISTS: локальные базы могли получить часть колонок черновой миграцией.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "rawIngredients" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ingredientsTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ingredientsRecognized" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;
