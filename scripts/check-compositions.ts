/**
 * Разовая проверка покрытия базы: прогон реальных INCI-составов через
 * нормализатор + матчер. Выводит нераспознанные токены с частотой.
 * Запуск: pnpm exec tsx scripts/check-compositions.ts
 */
import { matchInciString } from "../lib/ingredients/match";
import { COMPOSITIONS } from "./compositions.data";

async function main() {
  const freq = new Map<string, number>();
  let totalTokens = 0;
  let totalMatched = 0;

  for (const { name, inci } of COMPOSITIONS) {
    const { matched, unmatched } = await matchInciString(inci);
    totalTokens += matched.length + unmatched.length;
    totalMatched += matched.length;
    console.log(`\n=== ${name}`);
    console.log(`  распознано: ${matched.length}, не распознано: ${unmatched.length}`);
    for (const t of unmatched) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
      console.log(`    - ${t}`);
    }
  }

  console.log(`\n=== ИТОГО: покрытие ${totalMatched}/${totalTokens} токенов (${Math.round((totalMatched / totalTokens) * 100)}%)`);
  console.log("\n=== Частота нераспознанных токенов (>= 2 продукта):");
  [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => console.log(`  ${n}x  ${t}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
