/** Нормализация INCI-строки: чистка и разрезание на токены. */

// Разделители INCI-списков: запятая, точка с запятой, звёздочка, слэш, перевод строки, маркеры «•»
const SEPARATORS = /[,;*/\n\r•]+/;

/** Карта алиас → канонический INCI-токен (нижний регистр). */
export type AliasMap = Record<string, string>;

/**
 * Приводит сырую строку состава к массиву нормализованных токенов.
 * Нижний регистр, удаление скобок и их содержимого, схлопывание пробелов,
 * удаление дублей с сохранением порядка. Если передана aliasMap — токены
 * заменяются на канонические имена.
 */
export function normalizeInci(raw: string, aliases: AliasMap = {}): string[] {
  const tokens = raw
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, " ") // скобки и их содержимое
    .split(SEPARATORS)
    .map((t) => t.replace(/\s+/g, " ").trim().replace(/\.+$/, ""))
    .filter((t) => t.length > 0);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    const canonical = aliases[token] ?? token;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}
