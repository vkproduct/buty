-- ИИ-резюме состава: кэш ответов Gemini.

-- CreateTable
CREATE TABLE "AiSummary" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "inside" TEXT NOT NULL,
    "suits" TEXT NOT NULL,
    "caution" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSummary_key_key" ON "AiSummary"("key");

-- CreateIndex
CREATE INDEX "AiSummary_createdAt_idx" ON "AiSummary"("createdAt");
