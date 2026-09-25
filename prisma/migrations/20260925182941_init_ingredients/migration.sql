-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('STRONG', 'MODERATE', 'LIMITED', 'ANECDOTAL');

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "inciName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "evidenceLevel" "EvidenceLevel" NOT NULL,
    "typicalConc" TEXT,
    "description" TEXT NOT NULL,
    "safetyNotes" TEXT,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Synonym" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "Synonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientConflict" (
    "id" TEXT NOT NULL,
    "ingredientAId" TEXT NOT NULL,
    "ingredientBId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "IngredientConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "partnerUrl" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductIngredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_inciName_key" ON "Ingredient"("inciName");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "Ingredient_category_idx" ON "Ingredient"("category");

-- CreateIndex
CREATE INDEX "Synonym_alias_idx" ON "Synonym"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "Synonym_ingredientId_alias_key" ON "Synonym"("ingredientId", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientConflict_ingredientAId_ingredientBId_key" ON "IngredientConflict"("ingredientAId", "ingredientBId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIngredient_productId_ingredientId_key" ON "ProductIngredient"("productId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIngredient_productId_position_key" ON "ProductIngredient"("productId", "position");

-- AddForeignKey
ALTER TABLE "Synonym" ADD CONSTRAINT "Synonym_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientConflict" ADD CONSTRAINT "IngredientConflict_ingredientAId_fkey" FOREIGN KEY ("ingredientAId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientConflict" ADD CONSTRAINT "IngredientConflict_ingredientBId_fkey" FOREIGN KEY ("ingredientBId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
