"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdmin, slugify } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

/** Серверные экшены мини-админки: CRUD продуктов и ингредиентов. */

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Доступ запрещён");
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

/** Создать продукт (состав подключается отдельной правкой seed/БД). */
export async function createProduct(formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  const brand = str(formData, "brand");
  if (!name || !brand) throw new Error("Заполните бренд и название");
  const slug = str(formData, "slug") || slugify(`${brand}-${name}`);
  await prisma.product.create({
    data: {
      brand,
      name,
      slug,
      category: str(formData, "category") || "cream",
      sourceUrl: strOrNull(formData, "sourceUrl"),
      partnerUrl: strOrNull(formData, "partnerUrl"),
    },
  });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

/** Обновить продукт по id. */
export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("Нет id продукта");
  await prisma.product.update({
    where: { id },
    data: {
      brand: str(formData, "brand"),
      name: str(formData, "name"),
      category: str(formData, "category"),
      sourceUrl: strOrNull(formData, "sourceUrl"),
      partnerUrl: strOrNull(formData, "partnerUrl"),
    },
  });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

/** Создать ингредиент. */
export async function createIngredient(formData: FormData) {
  await requireAdmin();
  const inciName = str(formData, "inciName").toUpperCase();
  const displayName = str(formData, "displayName");
  if (!inciName || !displayName) throw new Error("Заполните INCI и название");
  const slug = str(formData, "slug") || slugify(inciName);
  await prisma.ingredient.create({
    data: {
      inciName,
      displayName,
      slug,
      category: str(formData, "category") || "active",
      function: str(formData, "function"),
      evidenceLevel:
        (str(formData, "evidenceLevel") as
          | "STRONG"
          | "MODERATE"
          | "LIMITED"
          | "ANECDOTAL") || "LIMITED",
      typicalConc: strOrNull(formData, "typicalConc"),
      description: str(formData, "description"),
      safetyNotes: strOrNull(formData, "safetyNotes"),
    },
  });
  revalidatePath("/admin/ingredients");
  revalidatePath("/ingredients");
  redirect("/admin/ingredients");
}

/** Обновить ингредиент по id. */
export async function updateIngredient(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("Нет id ингредиента");
  await prisma.ingredient.update({
    where: { id },
    data: {
      inciName: str(formData, "inciName").toUpperCase(),
      displayName: str(formData, "displayName"),
      category: str(formData, "category"),
      function: str(formData, "function"),
      evidenceLevel: str(formData, "evidenceLevel") as
        | "STRONG"
        | "MODERATE"
        | "LIMITED"
        | "ANECDOTAL",
      typicalConc: strOrNull(formData, "typicalConc"),
      description: str(formData, "description"),
      safetyNotes: strOrNull(formData, "safetyNotes"),
    },
  });
  revalidatePath("/admin/ingredients");
  revalidatePath("/ingredients");
  redirect("/admin/ingredients");
}
