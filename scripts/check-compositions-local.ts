/**
 * Замер покрытия базы без БД: словарь собирается напрямую из сида
 * (prisma/ingredients.data.ts) через чистые функции нормализатора и матчера.
 * Запуск: pnpm exec tsx scripts/check-compositions-local.ts
 * Основной замер (через БД): pnpm exec tsx scripts/check-compositions.ts
 */
import { INGREDIENTS } from "../prisma/ingredients.data";
import { normalizeInci } from "../lib/ingredients/normalize";
import { matchTokens } from "../lib/ingredients/match";
import { COMPOSITIONS } from "./compositions.data";

const dictionary = INGREDIENTS.map((ing, i) => ({
  id: String(i),
  inciName: ing.inciName,
  slug: ing.slug,
  displayName: ing.displayName,
  aliases: ing.synonyms,
}));

const aliases: Record<string, string> = Object.fromEntries(
  INGREDIENTS.flatMap((ing) =>
    ing.synonyms.map((alias) => [alias.toLowerCase(), ing.inciName.toLowerCase()]),
  ),
);

const freq = new Map<string, number>();
let totalTokens = 0;
let totalMatched = 0;

for (const { name, inci } of COMPOSITIONS) {
  const tokens = normalizeInci(inci, aliases);
  const { matched, unmatched } = matchTokens(tokens, dictionary);
  totalTokens += matched.length + unmatched.length;
  totalMatched += matched.length;
  console.log(`\n=== ${name}`);
  console.log(`  распознано: ${matched.length}, не распознано: ${unmatched.length}`);
  for (const t of unmatched) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
    console.log(`    - ${t}`);
  }
}

console.log(
  `\n=== ИТОГО: покрытие ${totalMatched}/${totalTokens} токенов (${Math.round((totalMatched / totalTokens) * 100)}%)`,
);
console.log("\n=== Частота нераспознанных токенов:");
[...freq.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([t, n]) => console.log(`  ${n}x  ${t}`));
