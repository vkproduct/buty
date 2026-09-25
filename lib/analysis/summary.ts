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
    if (category === "active") summary.actives += 1;
    else if (category === "fragrance") summary.fragrances += 1;
    else if (category === "alcohol") summary.alcohols += 1;
    else if (category === "uv-filter") summary.spfFilters += 1;
  }
  return summary;
}
