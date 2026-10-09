/**
 * Фотосенсибилизаторы в составе: ради них в разборе появляется совет «утром обязателен SPF».
 *
 * Ретиноиды работают уже в долях процента, поэтому считаются в любой позиции списка.
 * AHA-кислоты повышают фоточувствительность только в рабочих концентрациях; если кислота
 * стоит после «линии 1%» (консервантов, которых по закону не бывает больше ~1%), это
 * регулятор pH, а не пилинг. Лимонная кислота сюда не входит: в уходе она почти всегда pH-регулятор.
 */

export const RETINOID_SLUGS = new Set(["retinol", "retinal", "retinyl-palmitate", "adapalene", "tretinoin"]);
export const PHOTOSENSITIZING_ACID_SLUGS = new Set(["glycolic-acid", "lactic-acid", "mandelic-acid"]);

/** Ингредиенты, которых в формуле не больше ~1%: всё, что ниже них в списке, тоже ≤1%. */
export const ONE_PERCENT_LINE_SLUGS = new Set([
  "phenoxyethanol",
  "sodium-benzoate",
  "potassium-sorbate",
  "benzyl-alcohol",
  "chlorphenesin",
]);

/** Есть ли в составе (в порядке INCI-списка) компоненты, повышающие фоточувствительность. */
export function hasPhotosensitizer(slugsInOrder: string[]): boolean {
  if (slugsInOrder.some((s) => RETINOID_SLUGS.has(s))) return true;
  const line = slugsInOrder.findIndex((s) => ONE_PERCENT_LINE_SLUGS.has(s));
  const limit = line < 0 ? slugsInOrder.length : line;
  return slugsInOrder.slice(0, limit).some((s) => PHOTOSENSITIZING_ACID_SLUGS.has(s));
}
