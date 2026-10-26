-- CreateEnum
CREATE TYPE "BrandTariff" AS ENUM ('free', 'basic', 'vitrina', 'pro', 'network');

-- CreateEnum
CREATE TYPE "BrandRole" AS ENUM ('owner', 'editor');

-- AlterTable
ALTER TABLE "PartnerClick" ADD COLUMN     "linkId" TEXT,
ADD COLUMN     "store" TEXT;

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "catalogBrands" TEXT[],
    "verifiedDomains" TEXT[],
    "tariff" "BrandTariff" NOT NULL DEFAULT 'free',
    "productLimit" INTEGER,
    "paidUntil" TIMESTAMP(3),
    "adLabel" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMember" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BrandRole" NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addUtm" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "broken" BOOLEAN NOT NULL DEFAULT false,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastStatus" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDailyStat" (
    "productId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductDailyStat_pkey" PRIMARY KEY ("productId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "BrandMember_userId_idx" ON "BrandMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandMember_brandId_userId_key" ON "BrandMember"("brandId", "userId");

-- CreateIndex
CREATE INDEX "ProductLink_productId_idx" ON "ProductLink"("productId");

-- CreateIndex
CREATE INDEX "ProductLink_brandId_idx" ON "ProductLink"("brandId");

-- CreateIndex
CREATE INDEX "PartnerClick_linkId_idx" ON "PartnerClick"("linkId");

-- AddForeignKey
ALTER TABLE "PartnerClick" ADD CONSTRAINT "PartnerClick_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ProductLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDailyStat" ADD CONSTRAINT "ProductDailyStat_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
