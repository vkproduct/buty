/**
 * Доступ к кабинету бренда: членство, оплата, лимиты, принадлежность средства.
 * Чистые функции (brandIsPaid, effectiveProductLimit, productBelongsToBrand,
 * brandProductsWhere) покрыты тестами (access.test.ts).
 */
import { notFound } from "next/navigation";

import type { Prisma } from "@prisma/client";

import { isAdmin } from "@/lib/admin";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { PAID_GRACE_DAYS, PRODUCT_LIMIT, type TariffId } from "./tariffs";

/** Минимальные поля бренда для чистых функций ниже. */
export interface BrandForAccess {
  tariff: TariffId;
  paidUntil: Date | null;
  productLimit: number | null;
  catalogBrands: string[];
}

/** Бренды, где пользователь — участник. */
export async function getBrandsForUser(userId: string) {
  const memberships = await prisma.brandMember.findMany({
    where: { userId },
    include: { brand: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => m.brand);
}

/**
 * Доступ к страницам кабинета бренда.
 * Нет сессии → редирект на вход; админ — к любому бренду; не участник → 404.
 * Несколько брендов — выбор через ?brand=<slug>, иначе первый.
 */
export async function requireBrandAccess(brandSlug?: string) {
  const session = await getSession();
  if (!session?.user) {
    const { redirect } = await import("next/navigation");
    redirect(`/auth/signin?callbackUrl=/brand`);
  }
  if (!session?.user) notFound(); // redirect бросает, но TS этого не знает
  const userId = session.user.id;
  const admin = await isAdmin();

  let slug = brandSlug?.trim() || undefined;
  if (admin && slug) {
    const brand = await prisma.brand.findUnique({ where: { slug } });
    if (!brand) notFound();
    return { brand, userId, role: "owner" as const, isAdmin: true };
  }

  const brands = await getBrandsForUser(userId);
  if (brands.length === 0) notFound();
  let brand = slug ? brands.find((b) => b.slug === slug) : brands[0];
  if (!brand) notFound();
  const membership = await prisma.brandMember.findUnique({
    where: { brandId_userId: { brandId: brand.id, userId } },
  });
  return { brand, userId, role: membership?.role ?? "editor", isAdmin: admin };
}

/**
 * Бренд оплачен: платный тариф и paidUntil не старше PAID_GRACE_DAYS назад.
 * Тариф free не бывает оплачен.
 */
export function brandIsPaid(brand: BrandForAccess, now = Date.now()): boolean {
  if (brand.tariff === "free") return false;
  if (!brand.paidUntil) return false;
  return brand.paidUntil.getTime() + PAID_GRACE_DAYS * 86_400_000 >= now;
}

/** Лимит средств со ссылками: ручное переопределение или по тарифу (null — без лимита). */
export function effectiveProductLimit(brand: BrandForAccess): number | null {
  return brand.productLimit ?? PRODUCT_LIMIT[brand.tariff];
}

/** Средство принадлежит бренду: catalogBrands содержит product.brand без учёта регистра и пробелов. */
export function productBelongsToBrand(
  product: { brand: string },
  brand: BrandForAccess,
): boolean {
  const productBrand = product.brand.trim().toLowerCase();
  if (!productBrand) return false;
  return brand.catalogBrands.some((b) => b.trim().toLowerCase() === productBrand);
}

/**
 * Prisma-where для средств бренда в каталоге: не скрытые, brand совпадает
 * с одним из catalogBrands без учёта регистра.
 */
export function brandProductsWhere(brand: BrandForAccess): Prisma.ProductWhereInput {
  const variants = brand.catalogBrands.map((b) => b.trim()).filter(Boolean);
  if (variants.length === 0) return { hidden: false, brand: { in: [] } };
  return {
    hidden: false,
    OR: variants.map((b) => ({ brand: { equals: b, mode: "insensitive" } })),
  };
}
