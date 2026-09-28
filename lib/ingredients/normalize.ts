/** Нормализация INCI-строки: чистка и разрезание на токены. */

// Разделители INCI-списков: точка с запятой, звёздочка, перевод строки, маркеры «•».
// Запятая разделяет, но не между двумя цифрами: «1,2-Hexanediol» остаётся одним
// токеном, а «Glycol, 1,2-Hexanediol» корректно разрезается (запятая после буквы).
// Слэш НЕ разделяет автоматически: целый токен сначала проверяется по словарю,
// при промахе matchTokens режет его по слэшу и матчит части по отдельности.
const SEPARATORS = /(?<=\d),(?!\s*\d)|(?<!\d),|[;*\n\r•]+/;

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
