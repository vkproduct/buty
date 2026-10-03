-- Профиль кожи v2: чувствительность — флаг, а не тип; особые состояния;
-- разделение аллергии и раздражения; отметка согласия на обработку данных о здоровье.
ALTER TABLE "SkinProfile" ADD COLUMN "intolerances" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "healthConsentAt" TIMESTAMP(3);

-- Старые профили с типом «Чувствительная» сохраняют признак во флаге.
UPDATE "SkinProfile" SET "sensitive" = true WHERE "skinType" = 'sensitive';
