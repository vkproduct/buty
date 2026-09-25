import { prisma } from "@/lib/prisma";
import { normalizeInci, type AliasMap } from "./normalize";

export interface IngredientHit {
  id: string;
  inciName: string;
  slug: string;
  displayName: string;
}

export interface MatchedIngredient {
  ingredient: IngredientHit;
  matchedVia: string; // токен, по которому нашли: INCI или синоним
}

export interface MatchResult {
  matched: MatchedIngredient[];
  unmatched: string[];
}

interface DictEntry extends IngredientHit {
  aliases: string[];
}

/**
 * Чистая функция матчинга: сопоставляет токены со словарём
 * (INCI-имена + алиасы), нераспознанное возвращает отдельно.
 */
export function matchTokens(tokens: string[], dictionary: DictEntry[]): MatchResult {
  const byToken = new Map<string, IngredientHit>();
  for (const entry of dictionary) {
    byToken.set(entry.inciName.toLowerCase(), entry);
    for (const alias of entry.aliases) {
      if (!byToken.has(alias.toLowerCase())) byToken.set(alias.toLowerCase(), entry);
    }
  }

  const matched: MatchedIngredient[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const hit = byToken.get(token);
    if (hit) {
      if (!seen.has(hit.id)) {
        seen.add(hit.id);
        matched.push({ ingredient: hit, matchedVia: token });
      }
    } else {
      unmatched.push(token);
    }
  }
  return { matched, unmatched };
}

/** Загружает словарь из БД и мапит сырые токены на ингредиенты. */
export async function matchIngredients(tokens: string[]): Promise<MatchResult> {
  const rows = await prisma.ingredient.findMany({
    select: {
      id: true,
      inciName: true,
      slug: true,
      displayName: true,
      synonyms: { select: { alias: true } },
    },
  });
  const dictionary: DictEntry[] = rows.map((r) => ({
    id: r.id,
    inciName: r.inciName,
    slug: r.slug,
    displayName: r.displayName,
    aliases: r.synonyms.map((s) => s.alias),
  }));
  return matchTokens(tokens, dictionary);
}

/** Удобная обёртка: сырая строка состава → результат матчинга. */
export async function matchInciString(raw: string): Promise<MatchResult> {
  const rows = await prisma.synonym.findMany({
    select: { alias: true, ingredient: { select: { inciName: true } } },
  });
  const aliases: AliasMap = Object.fromEntries(
    rows.map((r) => [r.alias.toLowerCase(), r.ingredient.inciName.toLowerCase()]),
  );
  return matchIngredients(normalizeInci(raw, aliases));
}
