import Link from "next/link";
import { notFound } from "next/navigation";

import { updateIngredient } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, EVIDENCE_LABEL } from "@/lib/seo/labels";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";

const TEXTAREA_CLASS =
  "w-full rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm backdrop-blur";

/** Правка ингредиента. */
export default async function AdminIngredientEdit({
  params,
}: {
  params: { id: string };
}) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: params.id },
  });
  if (!ingredient) notFound();

  return (
    <GlassCard className="max-w-xl space-y-4 p-6">
      <h2 className="font-display text-xl font-bold">
        {ingredient.displayName}
      </h2>
      <p className="text-sm text-muted-foreground">
        slug: {ingredient.slug} ·{" "}
        <Link
          href={`/ingredients/${ingredient.slug}`}
          className="text-lavender hover:underline"
        >
          открыть страницу
        </Link>
      </p>
      <form action={updateIngredient} className="space-y-3">
        <input type="hidden" name="id" value={ingredient.id} />
        <Input name="inciName" defaultValue={ingredient.inciName} required />
        <Input
          name="displayName"
          defaultValue={ingredient.displayName}
          required
        />
        <select
          name="category"
          className="w-full rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm backdrop-blur"
          defaultValue={ingredient.category}
        >
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="evidenceLevel"
          className="w-full rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm backdrop-blur"
          defaultValue={ingredient.evidenceLevel}
        >
          {Object.entries(EVIDENCE_LABEL).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input name="function" defaultValue={ingredient.function} required />
        <Input
          name="typicalConc"
          defaultValue={ingredient.typicalConc ?? ""}
          placeholder="Рабочая концентрация"
        />
        <textarea
          name="description"
          defaultValue={ingredient.description}
          required
          rows={4}
          className={TEXTAREA_CLASS}
        />
        <textarea
          name="safetyNotes"
          defaultValue={ingredient.safetyNotes ?? ""}
          rows={2}
          className={TEXTAREA_CLASS}
        />
        <Button type="submit" className="w-full">
          Сохранить
        </Button>
      </form>
    </GlassCard>
  );
}
