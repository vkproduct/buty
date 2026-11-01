// Офлайн-проверка распознавания собранных составов (п. 3 ТЗ наполнения:
// средства с покрытием < 60 % не импортируются). Словарь ингредиентов —
// выгрузка из прод-БД (data/brands/prod-ingredients.json, см. brands-normalize.ts).
// Запуск: pnpm tsx scripts/brand-site-scrape/check-coverage.mjs <tsv> [<tsv>...]

import fs from 'node:fs';

const { normalizeInci } = await import('../../lib/ingredients/normalize.ts');
const { matchTokens } = await import('../../lib/ingredients/match.ts');

const dict = JSON.parse(fs.readFileSync('data/brands/prod-ingredients.json', 'utf8')).map((r) => ({
  id: r.id,
  inciName: r.inciName,
  slug: r.slug,
  displayName: r.displayName,
  aliases: r.aliases ?? [],
}));

for (const file of process.argv.slice(2)) {
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
  let pass = 0;
  const failed = [];
  for (const [url, code, name, brand, comp] of rows) {
    const tokens = normalizeInci(comp || '');
    const { matched, unmatched } = matchTokens([...tokens], dict);
    const total = tokens.length;
    const recognized = matched.length;
    const coverage = total > 0 ? recognized / total : 0;
    if (recognized >= 2 && coverage >= 0.6) pass++;
    else failed.push({ name, brand, total, recognized, coverage: coverage.toFixed(2), unmatched: unmatched.slice(0, 6) });
  }
  console.log(`\n=== ${file}: ${pass}/${rows.length} проходят порог (recognized>=2, coverage>=0.6) ===`);
  for (const f of failed) {
    console.log(`  SKIP ${f.brand} | ${f.name} | ${f.recognized}/${f.total} (${f.coverage}) | не распознано: ${f.unmatched.join('; ')}`);
  }
}
