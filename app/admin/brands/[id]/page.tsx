import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addBrandMember,
  removeBrandMember,
  updateBrandMemberRole,
} from "../actions";
import { BrandForm, toInputDate } from "../brand-form";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

/** Правка бренда + участники. */
export default async function AdminBrandEditPage({
  params,
}: {
  params: { id: string };
}) {
  const brand = await prisma.brand.findUnique({
    where: { id: params.id },
    include: { members: { include: { user: { select: { email: true } } } } },
  });
  if (!brand) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold">{brand.name}</h2>
        <Button asChild size="sm" variant="outline">
          <Link href={`/brand?brand=${brand.slug}`}>Открыть кабинет</Link>
        </Button>
      </div>

      <BrandForm
        initial={{
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          catalogBrands: brand.catalogBrands,
          verifiedDomains: brand.verifiedDomains,
          tariff: brand.tariff,
          productLimit: brand.productLimit,
          paidUntil: toInputDate(brand.paidUntil),
          adLabel: brand.adLabel ?? "",
          notes: brand.notes ?? "",
        }}
      />

      <GlassCard className="max-w-2xl space-y-3 p-6">
        <h3 className="font-display text-lg font-semibold">Участники</h3>
        {brand.members.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Участников нет — добавьте email, вход будет обычной ссылкой на почту.
          </p>
        )}
        {brand.members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-48">{m.user.email}</span>
            <form action={updateBrandMemberRole} className="flex items-center gap-2">
              <input type="hidden" name="id" value={m.id} />
              <select
                name="role"
                defaultValue={m.role}
                className="rounded-xl border border-border bg-white px-2 py-1 text-sm"
              >
                <option value="editor">Редактор</option>
                <option value="owner">Владелец</option>
              </select>
              <Button type="submit" size="sm" variant="outline">
                Роль
              </Button>
            </form>
            <form action={removeBrandMember}>
              <input type="hidden" name="id" value={m.id} />
              <Button type="submit" size="sm" variant="outline">
                Удалить
              </Button>
            </form>
          </div>
        ))}
        <form action={addBrandMember} className="flex flex-wrap items-center gap-2 pt-2">
          <input type="hidden" name="brandId" value={brand.id} />
          <Input name="email" type="email" placeholder="email участника" required className="max-w-xs" />
          <select
            name="role"
            defaultValue="editor"
            className="rounded-xl border border-border bg-white px-2 py-1 text-sm"
          >
            <option value="editor">Редактор</option>
            <option value="owner">Владелец</option>
          </select>
          <Button type="submit" size="sm">
            Добавить
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
