-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL,
    "inputMethod" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "productId" TEXT,
    "rawText" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "ingredientIds" TEXT[],
    "unmatched" TEXT[],
    "total" INTEGER NOT NULL,
    "recognized" INTEGER NOT NULL,
    "conflicts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Analysis_userId_createdAt_idx" ON "Analysis"("userId", "createdAt");
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt");
CREATE INDEX "Analysis_textHash_idx" ON "Analysis"("textHash");
CREATE INDEX "Analysis_productId_idx" ON "Analysis"("productId");

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
