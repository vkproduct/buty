/**
 * Серверная обвязка brand-canonical: словарь knownByKey из текущей БД
 * (distinct Product.brand, сгруппированные по правилам склейки) для
 * canonicalBrand() при записи новых продуктов. Только Node/сервер —
 * НЕ импортировать в edge (middleware).
 */
import { prisma } from "@/lib/prisma";

import { canonicalBrand, resolveCanonicalGroups } from "./brand-canonical";

/**
 * brandKey → каноническое имя группы из текущей БД. Новые варианты написания
 * существующих брендов получают каноническое имя; новые бренды — cleanBrand.
 */
export async function knownBrandsByKey(): Promise<Map<string, string>> {
  const rows = await prisma.product.findMany({ select: { brand: true }, distinct: ["brand"] });
  const groups = resolveCanonicalGroups(rows.map((r) => ({ name: r.brand, products: 1 })));
  return new Map(groups.map((g) => [g.key, g.canonical]));
}

/** canonicalBrand с knownByKey из БД — для записи Product.brand. */
export async function canonicalBrandForDb(raw: string): Promise<string> {
  return canonicalBrand(raw, await knownBrandsByKey());
}
