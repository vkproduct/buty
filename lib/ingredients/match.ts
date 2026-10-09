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

// Одиночные слова, которые не вытаскиваем из «мусорных» фрагментов: это обычные слова
// с упаковки («Peptide Cream»), хотя в словаре есть одноимённые INCI.
const SALVAGE_STOPWORDS = new Set(["cream", "water", "milk", "honey", "oil", "extract", "complex"]);
const MAX_PHRASE_WORDS = 7;

export interface SalvageHit {
  hit: IngredientHit;
  phrase: string;
}

/**
 * Достаёт известные ингредиенты из токена, который целиком не распознан:
 * склейки без запятой («butylene glycol benzoic acid») и фрагменты с чужим текстом
 * («renewing peptide cream. tocopherol»). Жадный поиск самой длинной фразы из словаря.
 */
export function salvageToken(token: string, byToken: Map<string, IngredientHit>): SalvageHit[] {
  const words = token
    .split(/[\s.]+/)
    .map((w) => w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ""))
    .filter((w) => w.length > 0);
  const hits: SalvageHit[] = [];
  let covered = 0;
  let i = 0;
  while (i < words.length) {
    let found = 0;
    for (let len = Math.min(MAX_PHRASE_WORDS, words.length - i); len >= 1; len--) {
      const phrase = words.slice(i, i + len).join(" ");
      if (len === 1 && (phrase.length < 5 || SALVAGE_STOPWORDS.has(phrase))) continue;
      const hit = byToken.get(phrase);
      if (hit) {
        hits.push({ hit, phrase });
        covered += len;
        found = len;
        break;
      }
    }
    i += found || 1;
  }
  // Принимаем находку, только если она похожа на правду: несколько ингредиентов,
  // фрагмент явно склеен с чужим предложением (есть точка) или найденное покрывает
  // хотя бы половину слов. Иначе одно знакомое слово из длинной неизвестной фразы
  // выдавало бы ложный ингредиент.
  const plausible = hits.length >= 2 || token.includes(".") || covered * 2 >= words.length;
  return plausible ? hits : [];
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
  const add = (hit: IngredientHit, via: string) => {
    if (seen.has(hit.id)) return;
    seen.add(hit.id);
    matched.push({ ingredient: hit, matchedVia: via });
  };

  for (const token of tokens) {
    const hit = byToken.get(token);
    if (hit) {
      add(hit, token);
      continue;
    }
    // Промах по целому токену: режем по слэшу и матчим части по отдельности
    // («Caprylic/Capric Triglyceride», «Aqua/Water» и т.п.).
    if (token.includes("/")) {
      const parts = token
        .split("/")
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter((p) => p.length > 0);
      const partHits = parts.map((part) => byToken.get(part));
      if (partHits.some(Boolean)) {
        // «X/Y» на этикетке — это одно вещество под двумя именами (INCI/бытовое):
        // если узнали хотя бы одно имя, второе считаем синонимом, а не новым ингредиентом.
        parts.forEach((part, i) => {
          const partHit = partHits[i];
          if (partHit) add(partHit, part);
        });
        continue;
      }
      // ни одна часть не узнана — пробуем вытащить ингредиенты из каждой части
      for (const part of parts) {
        const salvaged = salvageToken(part, byToken);
        if (salvaged.length > 0) salvaged.forEach((h) => add(h.hit, h.phrase));
        else unmatched.push(part);
      }
      continue;
    }
    // Склейка или фрагмент с чужим текстом: если удалось вытащить известные ингредиенты,
    // остаток — шум распознавания, в «не распознано» его не показываем.
    const salvaged = salvageToken(token, byToken);
    if (salvaged.length > 0) {
      salvaged.forEach((h) => add(h.hit, h.phrase));
      continue;
    }
    unmatched.push(token);
  }
  return { matched, unmatched: [...new Set(unmatched)] };
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
