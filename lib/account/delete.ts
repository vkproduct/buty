import { prisma } from "@/lib/prisma";

/**
 * Удаляет аккаунт и все данные пользователя. Все связи User — onDelete: Cascade
 * (полка, анкета кожи, реакции, напоминания, сессии NextAuth, мобильные сессии,
 * push-токены, подписка, клики, членство в брендах), отдельные чистки не нужны.
 * Обязательно для App Store (5.1.1(v)) и соответствует 152-ФЗ.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}
