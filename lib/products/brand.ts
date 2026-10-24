/**
 * Заглушка бренда у части продуктов INCIDB (prepare-incidb-products.py).
 * В БД поле остаётся (на нём завязаны дедуп и slug), но на сайте такой
 * бренд не показываем: ни в title, ни в карточках, ни в фильтрах.
 */

export const NO_BRAND = "Без бренда";

/** Бренд для показа: null — бренда у продукта нет (NO_BRAND или пустая строка). */
export function displayBrand(brand: string): string | null {
  const b = brand.trim();
  return b === "" || b === NO_BRAND ? null : b;
}
