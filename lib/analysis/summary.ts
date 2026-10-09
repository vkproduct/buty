/** Сводка по категориям распознанных ингредиентов. */

/**
 * Считает активы, отдушки, спирты и UV-фильтры по категориям из словаря.
 * Чистая функция — тестируется без БД.
 */
export function summarizeCategories(categories: string[]): {
  actives: number;
  fragrances: number;
  alcohols: number;
  spfFilters: number;
} {
  const summary = { actives: 0, fragrances: 0, alcohols: 0, spfFilters: 0 };
  for (const category of categories) {
    // пептиды — тоже активы: ради них средство и покупают
    if (category === "active" || category === "peptide") summary.actives += 1;
    else if (category === "fragrance") summary.fragrances += 1;
    else if (category === "alcohol") summary.alcohols += 1;
    else if (category === "uv-filter") summary.spfFilters += 1;
  }
  return summary;
}

/** Считает ингредиенты с безопасностными флагами. */
export function summarizeFlags(
  flags: Array<{
    comedogenic: boolean;
    feedsMalassezia: boolean;
    fragranceAllergen: boolean;
  }>,
): {
  comedogenic: number;
  malassezia: number;
  fragranceAllergens: number;
} {
  const summary = { comedogenic: 0, malassezia: 0, fragranceAllergens: 0 };
  for (const f of flags) {
    if (f.comedogenic) summary.comedogenic += 1;
    if (f.feedsMalassezia) summary.malassezia += 1;
    if (f.fragranceAllergen) summary.fragranceAllergens += 1;
  }
  return summary;
}
