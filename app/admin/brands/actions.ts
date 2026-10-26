"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdmin, slugify } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

/** Серверные экшены админки для брендов: CRUD брендов, участники, ссылки. */

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Доступ запрещён");
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Разбивает поле на значения (запятая/перевод строки/точка с запятой). */
function listField(formData: FormData, key: string): string[] {
  return [
    ...new Set(
      str(formData, key)
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

/** Домены: нижний регистр, без https://, без www., без пути. */
function normalizeDomains(domains: string[]): string[] {
  return [
    ...new Set(
      domains
        .map((d) =>
          d
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .split("/")[0]
            .trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function intOrNull(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Дата из input[type=date] → конец дня по МСК (ссылка «оплачено до»). */
function dateOrNull(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  if (!v) return null;
  const d = new Date(`${v}T23:59:59+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

function brandData(formData: FormData) {
  return {
    name: str(formData, "name"),
    catalogBrands: listField(formData, "catalogBrands"),
    verifiedDomains: normalizeDomains(listField(formData, "verifiedDomains")),
    tariff: (str(formData, "tariff") || "free") as
      | "free"
      | "basic"
      | "vitrina"
      | "pro"
      | "network",
    productLimit: intOrNull(formData, "productLimit"),
    paidUntil: dateOrNull(formData, "paidUntil"),
    adLabel: strOrNull(formData, "adLabel"),
    notes: strOrNull(formData, "notes"),
  };
}

/** Создать бренда (после договора и счёта — вручную). */
export async function createBrand(formData: FormData) {
  await requireAdmin();
  const data = brandData(formData);
  if (!data.name) throw new Error("Укажите название бренда");
  const slug = str(formData, "slug") || slugify(data.name);
  if (!slug) throw new Error("Не получилось сделать slug — укажите вручную латиницей");
  const brand = await prisma.brand.create({ data: { ...data, slug } });
  revalidatePath("/admin/brands");
  redirect(`/admin/brands/${brand.id}`);
}

/** Обновить бренда. */
export async function updateBrand(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("Нет id бренда");
  const data = brandData(formData);
  await prisma.brand.update({ where: { id }, data });
  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${id}`);
}

/** Добавить участника бренда по email (пользователя нет — создаём). */
export async function addBrandMember(formData: FormData) {
  await requireAdmin();
  const brandId = str(formData, "brandId");
  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role") === "owner" ? "owner" : "editor";
  if (!brandId || !email || !email.includes("@")) throw new Error("Укажите email");
  await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });
  const user = await prisma.user.findUnique({ where: { email } });
  await prisma.brandMember.upsert({
    where: { brandId_userId: { brandId, userId: user!.id } },
    create: { brandId, userId: user!.id, role },
    update: { role },
  });
  revalidatePath(`/admin/brands/${brandId}`);
}

/** Изменить роль участника. */
export async function updateBrandMemberRole(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const role = str(formData, "role") === "owner" ? "owner" : "editor";
  const member = await prisma.brandMember.update({ where: { id }, data: { role } });
  revalidatePath(`/admin/brands/${member.brandId}`);
}

/** Удалить участника бренда. */
export async function removeBrandMember(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const member = await prisma.brandMember.delete({ where: { id } });
  revalidatePath(`/admin/brands/${member.brandId}`);
}

/** Включить/выключить ссылку бренда (с карточки продукта в админке). */
export async function setProductLinkActive(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const active = str(formData, "active") === "1";
  const link = await prisma.productLink.update({
    where: { id },
    data: { active },
    include: { product: { select: { slug: true } } },
  });
  revalidatePath(`/admin/products/${link.productId}`);
  revalidatePath(`/products/${link.product.slug}`);
}
