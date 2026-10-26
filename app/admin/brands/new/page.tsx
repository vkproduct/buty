import { BrandForm } from "../brand-form";

export const dynamic = "force-dynamic";

/** Создание бренда. Можно предзаполнить название (?name=) из заявки. */
export default function AdminBrandNewPage({
  searchParams,
}: {
  searchParams?: { name?: string };
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Новый бренд</h2>
      <BrandForm initial={{ name: searchParams?.name ?? "" }} />
    </div>
  );
}
