"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  saveProductLinks,
  type SaveLinksState,
} from "@/lib/brands/actions";
import { STORES } from "@/lib/brands/links";
import { MAX_LINKS_PER_PRODUCT } from "@/lib/brands/tariffs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface EditableLink {
  id: string;
  url: string;
  addUtm: boolean;
  active: boolean;
  status: string;
  checkedAt: Date | null;
  store: string;
}

const INITIAL: SaveLinksState = { ok: false };

/**
 * Форма ссылок на покупку: до 3 слотов (URL, UTM, активность).
 * Магазин определяется на сервере по URL — здесь показываем текущий.
 */
export function ProductLinksForm({
  productId,
  brandSlug,
  paid,
  initialLinks,
}: {
  productId: string;
  brandSlug: string;
  paid: boolean;
  initialLinks: EditableLink[];
}) {
  const [state, formAction] = useFormState(saveProductLinks, INITIAL);
  const [extraSlots, setExtraSlots] = useState(0);
  const slots = Math.min(
    MAX_LINKS_PER_PRODUCT,
    Math.max(initialLinks.length + extraSlots, 1),
  );
  const canAdd = slots < MAX_LINKS_PER_PRODUCT;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="brandSlug" value={brandSlug} />

      {Array.from({ length: slots }, (_, i) => {
        const link = initialLinks[i];
        return (
          <div key={link?.id ?? `new-${i}`} className="rounded-2xl bg-white p-4">
            <input type="hidden" name={`link_${i}_id`} value={link?.id ?? ""} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-6 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
              <Input
                name={`link_${i}_url`}
                defaultValue={link?.url ?? ""}
                placeholder="https://…"
                disabled={!paid}
                className="flex-1"
                aria-label={`Ссылка ${i + 1}`}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                Магазин:{" "}
                <span className="font-medium text-foreground">
                  {link ? (STORES[link.store]?.label ?? link.store) : "определится после сохранения"}
                </span>
              </span>
              <span>Статус: {link?.status ?? "—"}</span>
              {link?.checkedAt && (
                <span>
                  Проверена: {new Date(link.checkedAt).toLocaleDateString("ru-RU")}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name={`link_${i}_addUtm`}
                  defaultChecked={link ? link.addUtm : true}
                  disabled={!paid}
                />
                Добавлять UTM-метки
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name={`link_${i}_active`}
                  defaultChecked={link ? link.active : true}
                  disabled={!paid}
                />
                Показывать на сайте
              </label>
            </div>
            {link && (
              <p className="mt-2 text-xs text-muted-foreground">
                Чтобы удалить ссылку — очистите поле URL и сохраните.
              </p>
            )}
          </div>
        );
      })}

      {canAdd && (
        <button
          type="button"
          onClick={() => setExtraSlots((n) => n + 1)}
          className="text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          + Добавить ссылку
        </button>
      )}

      {state.error && (
        <p className="rounded-xl bg-coral-50 p-3 text-sm text-coral-700">{state.error}</p>
      )}
      {state.ok && state.message && (
        <p className="rounded-xl bg-success-50 p-3 text-sm text-success-700">{state.message}</p>
      )}

      <SubmitButton paid={paid} />
    </form>
  );
}

function SubmitButton({ paid }: { paid: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={!paid || pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}
