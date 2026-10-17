/**
 * Дедупликация строк каталога Золотого яблока внутри одного импорта.
 *
 * Пары бренд+название в CSV часто принадлежат РАЗНЫМ продуктам (шампунь /
 * маска / кондиционер под одним названием линейки): по построению выборки
 * (is_family_primary) составы у них разные. Поэтому внутри ЗЯ дубль — это
 * совпадение бренд+название И сходство составов (Жаккар по токенам
 * normalizeInci) >= DUP_SIMILARITY. Разные составы — отдельные продукты,
 * одноимённым дописываем суффикс: категорию в скобках («… (шампунь)»), если
 * она отличается от первой и не "other", иначе « · вариант N» по порядку sku.
 * Проверка дублей против INCIDB остаётся по паре бренд+название (в скрипте).
 */

/** Порог сходства составов: >= — тот же продукт (переформулировка/опечатки). */
export const DUP_SIMILARITY = 0.8;

/** Нормализация для сравнения бренд+название при поиске дублей. */
export function dupKey(brand: string, name: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return `${norm(brand)}|${norm(name)}`;
}

/** Коэффициент Жаккара по множествам токенов: |A∩B| / |A∪B|, пустые → 1. */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

export interface VariantRow {
  sku: string;
  brand: string;
  /** Название после stripBrand. */
  name: string;
  /** Токены состава (normalizeInci). */
  tokens: readonly string[];
  /** Категория из categorizeGoldapple или из ИИ-кэша типов. */
  category: string;
  /** Нормализованный тип средства из ИИ-кэша (null — типа нет). */
  productType?: string | null;
}

export interface ResolvedRow extends VariantRow {
  /** Итоговое имя продукта (с суффиксом у одноимённых вариантов). */
  finalName: string;
  /** sku строки, дублём которой признана эта (null — строка импортируется). */
  duplicateOf: string | null;
}

const bySku = (a: VariantRow, b: VariantRow) =>
  a.sku.localeCompare(b.sku, undefined, { numeric: true });

/**
 * Разрешает группы одинаковых бренд+название. Возвращает Map sku → ResolvedRow.
 * Детерминировано: группы — в порядке первого появления, внутри — по sku.
 * `categoryLabel` — русская подпись категории в единственном числе
 * (PRODUCT_CATEGORY_LABEL), undefined → суффикс «вариант N».
 */
export function resolveVariants(
  rows: readonly VariantRow[],
  categoryLabel: (category: string) => string | undefined
): Map<string, ResolvedRow> {
  const groups = new Map<string, VariantRow[]>();
  for (const r of rows) {
    const key = dupKey(r.brand, r.name);
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }

  const out = new Map<string, ResolvedRow>();
  for (const group of groups.values()) {
    const kept: ResolvedRow[] = [];
    for (const r of [...group].sort(bySku)) {
      const dup = kept.find((k) => jaccard(k.tokens, r.tokens) >= DUP_SIMILARITY);
      if (dup) {
        out.set(r.sku, { ...r, finalName: r.name, duplicateOf: dup.sku });
        continue;
      }
      let finalName = r.name;
      if (kept.length > 0) {
        const t0 = kept[0].productType ?? null;
        const t = r.productType ?? null;
        const label = categoryLabel(r.category);
        if (t && t0 && t !== t0) {
          // Типы известны и разные: «AMBIENT ANTI YELLOW Cool Violet (маска для волос)».
          finalName = `${r.name} (${t})`;
        } else if (t && t0 && t === t0) {
          // Типы одинаковые — суффикс по типу ничего не различает.
          finalName = `${r.name} · вариант ${kept.length + 1}`;
        } else {
          finalName =
            r.category !== kept[0].category && r.category !== "other" && label
              ? `${r.name} (${label})`
              : `${r.name} · вариант ${kept.length + 1}`;
        }
      }
      const resolved: ResolvedRow = { ...r, finalName, duplicateOf: null };
      kept.push(resolved);
      out.set(r.sku, resolved);
    }
  }
  return out;
}
