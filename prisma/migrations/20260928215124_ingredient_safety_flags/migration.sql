-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "comedogenic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feedsMalassezia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fragranceAllergen" BOOLEAN NOT NULL DEFAULT false;
