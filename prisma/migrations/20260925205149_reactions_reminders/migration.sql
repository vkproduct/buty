-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('introduce', 'restock');

-- CreateTable
CREATE TABLE "SkinReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shelfItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "photoUrl" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspectIngredientIds" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "SkinReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shelfItemId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "payload" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkinReaction_userId_occurredAt_idx" ON "SkinReaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Reminder_nextRunAt_doneAt_idx" ON "Reminder"("nextRunAt", "doneAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_reminderId_idx" ON "NotificationLog"("reminderId");

-- AddForeignKey
ALTER TABLE "SkinReaction" ADD CONSTRAINT "SkinReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinReaction" ADD CONSTRAINT "SkinReaction_shelfItemId_fkey" FOREIGN KEY ("shelfItemId") REFERENCES "ShelfItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_shelfItemId_fkey" FOREIGN KEY ("shelfItemId") REFERENCES "ShelfItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
