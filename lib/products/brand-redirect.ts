/**
 * Редирект со старых написаний бренда в /products: ?brand=VICHY → ?brand=Vichy
 * (301, middleware.ts). Чистая логика — отдельно от middleware, чтобы было
 * покрыто тестами. Edge-safe: только brand-canonical + catalog-filters.
 */
import { aliasCanonical, brandKey } from "./brand-canonical";
import { BRAND_REDIRECTS } from "./brand-redirects.data";
import { compareNames } from "./catalog-filters";

/**
 * Для query-строки запроса (с ведущим «?» или без) возвращает новую
 * query-строку со старыми написаниями бренда, заменёнными на канонические,
 * или null, если редирект не нужен. Бренды без дублей, отсортированы
 * compareNames (как в productFiltersQuery); q, category, page и прочие
 * параметры сохраняются. Петель нет: каноническое значение не редиректится.
 */
export function brandRedirectSearch(rawSearch: string): string | null {
  const params = new URLSearchParams(rawSearch);
  if (!params.has("brand")) return null;

  let changed = false;
  const brands = new Set<string>();
  for (const value of params.getAll("brand")) {
    const canonical = BRAND_REDIRECTS[brandKey(value)] ?? aliasCanonical(value);
    if (canonical && canonical !== value) {
      changed = true;
      brands.add(canonical);
    } else {
      brands.add(value);
    }
  }
  if (!changed) return null;

  // Порядок как в productFiltersQuery: q, бренды (compareNames), остальное.
  const rest = new URLSearchParams();
  for (const [key, value] of params) {
    if (key !== "brand" && key !== "q") rest.append(key, value);
  }
  const next = new URLSearchParams();
  const q = params.get("q");
  if (q !== null && q !== "") next.set("q", q);
  for (const b of [...brands].sort(compareNames)) next.append("brand", b);
  for (const [key, value] of rest) next.append(key, value);
  return next.toString();
}
