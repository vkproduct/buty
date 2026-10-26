/**
 * Видимые на сайте ссылки бренда на покупку: active && !broken, бренд оплачен,
 * сортировка по position, максимум 3 на средство.
 */
import { prisma } from "@/lib/prisma";

import { brandIsPaid } from "./access";
import { STORES } from "./links";

export interface VisibleProductLink {
  id: string;
  store: string;
  label: string;
  adLabel: string | null;
}

/** Подпись по умолчанию под кнопками, если у бренда не заполнена строка маркировки. */
export const DEFAULT_LINKS_NOTE = "Ссылки на покупку предоставлены брендом";

export async function getVisibleProductLinks(productId: string): Promise<VisibleProductLink[]> {
  const links = await prisma.productLink.findMany({
    where: { productId, active: true, broken: false },
    include: { brand: true },
    orderBy: { position: "asc" },
    take: 3,
  });
  return links
    .filter((l) => brandIsPaid(l.brand))
    .slice(0, 3)
    .map((l) => ({
      id: l.id,
      store: l.store,
      label: STORES[l.store]?.label ?? l.store,
      adLabel: l.brand.adLabel,
    }));
}
