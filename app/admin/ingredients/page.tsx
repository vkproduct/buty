import Link from "next/link";

import { createIngredient } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, EVIDENCE_LABEL } from "@/lib/seo/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";

const TEXTAREA_CLASS =
  "w-full rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm backdrop-blur";

/** Ингредиенты: список + форма добавления. */
export default async function AdminIngredients() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { displayName: "asc" },
    take: 300,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <GlassCard className="space-y-2 p-6">
        <h2 className="font-display text-xl font-bold">
          Ингредиенты ({ingredients.length})
        </h2>
        <ul className="space-y-2">
          {ingredients.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/50 px-4 py-2 text-sm"
            >
              <Link
                href={`/admin/ingredients/${i.id}`}
                className="font-semibold text-lavender hover:underline"
              >
                {i.displayName}
              </Link>
              <span className="font-mono text-xs text-muted-foreground">
                {i.inciName}
              </span>
              <Badge variant="outline">
                {CATEGORY_LABEL[i.category] ?? i.category}
              </Badge>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">Добавить ингредиент</h2>
        <form action={createIngredient} className="space-y-3">
          <Input name="inciName" placeholder="INCI (напр. NIACINAMIDE)" required />
          <Input name="displayName" placeholder="Название для UI" required />
          <Input name="slug" placeholder="slug (пусто — автоматически)" />
          <select
            name="category"
            className="w-full rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm backdrop-blur"
            defaultValue="active"
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
            defaultValue="LIMITED"
          >
            {Object.entries(EVIDENCE_LABEL).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Input name="function" placeholder="Функция в составе" required />
          <Input name="typicalConc" placeholder="Рабочая концентрация (2–5%)" />
          <textarea
            name="description"
            placeholder="Описание"
            required
            rows={4}
            className={TEXTAREA_CLASS}
          />
          <textarea
            name="safetyNotes"
            placeholder="Заметки по безопасности (необязательно)"
            rows={2}
            className={TEXTAREA_CLASS}
          />
          <Button type="submit" className="w-full">
            Создать
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
