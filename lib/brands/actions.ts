"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  brandIsPaid,
  effectiveProductLimit,
  productBelongsToBrand,
} from "./access";
import { classifyUrl } from "./links";
import { MAX_LINKS_PER_PRODUCT } from "./tariffs";

export interface SaveLinksState {
  ok: boolean;
  message?: string;
  error?: string;
}

const formSchema = z.object({
  productId: z.string().min(1),
  brandSlug: z.string().min(1),
});

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

/**
 * Сохранить ссылки на покупку средства (кабинет бренда).
 * Доступ: участник бренда или админ; средство должно принадлежать бренду;
 * тариф оплачен; не больше 3 активных ссылок; лимит средств со ссылками.
 * Все проверки — на сервере, мутации — в транзакции.
 */
export async function saveProductLinks(
  _prev: SaveLinksState,
  formData: FormData,
): Promise<SaveLinksState> {
  const parsed = formSchema.safeParse({
    productId: str(formData, "productId"),
    brandSlug: str(formData, "brandSlug"),
  });
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  const session = await getSession();
  if (!session?.user) return { ok: false, error: "Нужно войти" };
  const userId = session.user.id;
  const admin = await isAdmin();

  const brand = await prisma.brand.findUnique({
    where: { slug: parsed.data.brandSlug },
    include: { members: { where: { userId } } },
  });
  if (!brand) return { ok: false, error: "Бренд не найден" };
  if (!admin && brand.members.length === 0) return { ok: false, error: "Нет доступа" };

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product || !productBelongsToBrand(product, brand)) {
    return { ok: false, error: "Средство не найдено" };
  }

  if (!brandIsPaid(brand)) {
    return {
      ok: false,
      error: "Тариф не оплачен — ссылки не сохраняются. Напишите нам.",
    };
  }

  // Разбираем слоты формы (до 3): у существующей ссылки пустой URL = удалить.
  const incoming: { id: string | null; url: string; addUtm: boolean; active: boolean }[] = [];
  for (let i = 0; i < MAX_LINKS_PER_PRODUCT; i++) {
    const id = str(formData, `link_${i}_id`) || null;
    const url = str(formData, `link_${i}_url`);
    if (!url && !id) continue;
    incoming.push({ id, url, addUtm: bool(formData, `link_${i}_addUtm`), active: bool(formData, `link_${i}_active`) });
  }

  if (incoming.length > MAX_LINKS_PER_PRODUCT) {
    return { ok: false, error: `Не больше ${MAX_LINKS_PER_PRODUCT} ссылок на средство` };
  }

  // Классификация каждой ссылки (магазин определяем по URL, а не по форме).
  const classified: { id: string | null; url: string; store: string; addUtm: boolean; active: boolean }[] = [];
  for (const item of incoming) {
    if (!item.url) continue; // удаление — ниже
    const result = classifyUrl(item.url, brand);
    if (!result.ok) return { ok: false, error: result.error };
    classified.push({ ...item, url: result.normalizedUrl, store: result.store });
  }

  const activeCount = classified.filter((c) => c.active).length;
  if (activeCount > MAX_LINKS_PER_PRODUCT) {
    return { ok: false, error: `Не больше ${MAX_LINKS_PER_PRODUCT} активных ссылок на средство` };
  }

  const existing = await prisma.productLink.findMany({
    where: { productId: product.id, brandId: brand.id },
  });
  const toDelete = existing.filter(
    (e) => incoming.some((i) => i.id === e.id && !i.url),
  );
  const deletedIds = new Set(toDelete.map((d) => d.id));

  // Лимит средств: если у средства ещё нет активных ссылок (после сохранения),
  // а у бренда уже лимит средств с активными ссылками — отказ.
  const limit = effectiveProductLimit(brand);
  if (limit !== null && activeCount > 0) {
    const otherActiveProducts = await prisma.productLink.findMany({
      where: {
        brandId: brand.id,
        active: true,
        productId: { not: product.id },
      },
      select: { productId: true },
      distinct: ["productId"],
    });
    const currentlyHasActive = existing.some((e) => e.active && !deletedIds.has(e.id));
    if (!currentlyHasActive && otherActiveProducts.length >= limit) {
      return {
        ok: false,
        error: `Лимит тарифа: ${limit} средств со ссылками. Уберите ссылки с другого средства или перейдите на старший тариф`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const d of toDelete) {
        await tx.productLink.delete({ where: { id: d.id } });
      }
      let position = 0;
      for (const item of classified) {
        const existingLink = item.id
          ? existing.find((e) => e.id === item.id && !deletedIds.has(e.id))
          : undefined;
        if (existingLink) {
          const urlChanged = existingLink.url !== item.url;
          await tx.productLink.update({
            where: { id: existingLink.id },
            data: {
              url: item.url,
              store: item.store,
              addUtm: item.addUtm,
              active: item.active,
              position: position++,
              updatedById: userId,
              // Правку URL считаем новой ссылкой: сбрасываем статус проверки
              ...(urlChanged ? { broken: false, failCount: 0, lastStatus: null } : {}),
            },
          });
        } else {
          await tx.productLink.create({
            data: {
              productId: product.id,
              brandId: brand.id,
              url: item.url,
              store: item.store,
              addUtm: item.addUtm,
              active: item.active,
              position: position++,
              createdById: userId,
              updatedById: userId,
            },
          });
        }
      }
    });
  } catch {
    return { ok: false, error: "Не получилось сохранить. Попробуйте ещё раз" };
  }

  revalidatePath(`/products/${product.slug}`);
  return { ok: true, message: "Сохранено. Ссылки уже на сайте" };
}
