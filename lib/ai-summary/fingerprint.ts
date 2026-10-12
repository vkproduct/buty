import { createHash } from "node:crypto";

/**
 * Ключ кэша резюме. Одинаковый набор распознанных ингредиентов в том же порядке
 * (порядок на этикетке ≈ концентрация) даёт тот же ключ, поэтому один и тот же крем,
 * разобранный разными людьми, отправляется в ИИ только один раз.
 * Версия промпта и модель входят в ключ: при их смене резюме пересоздаются сами.
 */
export function summaryKey(params: {
  ingredientIds: string[];
  fullyRecognized: boolean;
  model: string;
  promptVersion: number;
}): string {
  return createHash("sha256")
    .update(
      [
        `v${params.promptVersion}`,
        params.model,
        params.fullyRecognized ? "full" : "part",
        ...params.ingredientIds,
      ].join("|"),
    )
    .digest("hex");
}
