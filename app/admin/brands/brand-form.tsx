import { createBrand, updateBrand } from "./actions";
import { TARIFFS } from "@/lib/brands/tariffs";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";

export interface BrandFormValues {
  id?: string;
  name: string;
  slug: string;
  catalogBrands: string[];
  verifiedDomains: string[];
  tariff: string;
  productLimit: number | null;
  paidUntil: string; // YYYY-MM-DD или ""
  adLabel: string;
  notes: string;
}

function toInputDate(d: Date | null): string {
  if (!d) return "";
  // локальная дата без часового пояса
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Форма создания/правки бренда. Подсказки catalogBrands — реальные значения из каталога. */
export async function BrandForm({
  initial,
}: {
  initial?: Partial<BrandFormValues>;
}) {
  const brandRows = await prisma.product.groupBy({
    by: ["brand"],
    where: { hidden: false },
    _count: { _all: true },
    orderBy: { _count: { brand: "desc" } },
    take: 500,
  });
  const values: BrandFormValues = {
    id: initial?.id,
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    catalogBrands: initial?.catalogBrands ?? [],
    verifiedDomains: initial?.verifiedDomains ?? [],
    tariff: initial?.tariff ?? "free",
    productLimit: initial?.productLimit ?? null,
    paidUntil: initial?.paidUntil ?? "",
    adLabel: initial?.adLabel ?? "",
    notes: initial?.notes ?? "",
  };
  const action = values.id ? updateBrand : createBrand;

  return (
    <GlassCard className="max-w-2xl space-y-3 p-6">
      <form action={action} className="space-y-3">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <Input name="name" defaultValue={values.name} placeholder="Название (как в кабинете)" required />
        <Input name="slug" defaultValue={values.slug} placeholder="slug (пусто — из названия)" />
        <div>
          <Input
            name="catalogBrands"
            defaultValue={values.catalogBrands.join(", ")}
            placeholder="Бренды каталога через запятую (варианты написания)"
            list="catalog-brands"
          />
          <datalist id="catalog-brands">
            {brandRows.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b._count._all} средств
              </option>
            ))}
          </datalist>
          <p className="mt-1 text-xs text-muted-foreground">
            Средства каталога, относящиеся к этому бренду (совпадение без учёта регистра).
          </p>
        </div>
        <Input
          name="verifiedDomains"
          defaultValue={values.verifiedDomains.join(", ")}
          placeholder="Домены сайта бренда через запятую: brand.ru, shop.brand.ru"
        />
        <div className="flex flex-wrap gap-3">
          <select
            name="tariff"
            defaultValue={values.tariff}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            {TARIFFS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Input
            name="productLimit"
            type="number"
            min={1}
            defaultValue={values.productLimit ?? ""}
            placeholder="Лимит средств (пусто — по тарифу)"
            className="w-56"
          />
          <Input
            name="paidUntil"
            type="date"
            defaultValue={values.paidUntil}
            className="w-48"
            aria-label="Оплачено до"
          />
        </div>
        <Input
          name="adLabel"
          defaultValue={values.adLabel}
          placeholder="Маркировка под ссылками (Реклама. ООО «…», ИНН …, erid: …)"
        />
        <textarea
          name="notes"
          defaultValue={values.notes}
          placeholder="Заметки (договор, контакт)"
          rows={2}
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
        />
        <Button type="submit">Сохранить</Button>
      </form>
    </GlassCard>
  );
}

export { toInputDate };
