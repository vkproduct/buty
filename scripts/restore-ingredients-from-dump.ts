/**
 * Разовое восстановление словаря ингредиентов из выгрузки прода
 * (data/brands/prod-ingredients.json, выгрузка от 01.11).
 *
 * Сравнивает БД с выгрузкой по slug: inciName, displayName, синонимы.
 * DRY_RUN=1 (по умолчанию) — только отчёт расхождений, ничего не пишет.
 * APPLY=1 — применить: обновить inciName/displayName, добавить недостающие синонимы.
 *
 * Новые ингредиенты (есть в выгрузке, нет в БД) НЕ создаются: в выгрузке нет
 * обязательных полей модели (category, function, evidenceLevel, description) —
 * они выводятся в отчёт отдельным списком.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN !== "0" && process.env.APPLY !== "1";
const DUMP_PATH = process.env.DUMP_PATH ?? "data/brands/prod-ingredients.json";

type DumpRow = {
  id: string;
  inciName: string;
  slug: string;
  displayName: string;
  aliases: string[];
};

async function main() {
  const dump: DumpRow[] = JSON.parse(fs.readFileSync(DUMP_PATH, "utf8"));
  const db = await prisma.ingredient.findMany({
    select: {
      id: true,
      inciName: true,
      slug: true,
      displayName: true,
      synonyms: { select: { alias: true } },
    },
  });
  const bySlug = new Map(db.map((i) => [i.slug, i]));

  const missingInDb: DumpRow[] = [];
  const missingInDump = db.filter((i) => !dump.some((d) => d.slug === i.slug));
  const nameDiffs: { slug: string; field: string; db: string; dump: string }[] = [];
  const aliasToAdd: { ingredientId: string; slug: string; alias: string }[] = [];

  for (const row of dump) {
    const cur = bySlug.get(row.slug);
    if (!cur) {
      missingInDb.push(row);
      continue;
    }
    if (cur.inciName !== row.inciName) {
      nameDiffs.push({ slug: row.slug, field: "inciName", db: cur.inciName, dump: row.inciName });
    }
    if (cur.displayName !== row.displayName) {
      nameDiffs.push({ slug: row.slug, field: "displayName", db: cur.displayName, dump: row.displayName });
    }
    const dbAliases = new Set(cur.synonyms.map((s) => s.alias.toLowerCase()));
    for (const alias of row.aliases ?? []) {
      if (!dbAliases.has(alias.toLowerCase())) {
        aliasToAdd.push({ ingredientId: cur.id, slug: row.slug, alias });
      }
    }
  }

  console.log(`Выгрузка: ${dump.length} ингредиентов, БД: ${db.length}`);
  console.log(`Нет в БД (нельзя создать без полных полей): ${missingInDb.length}`);
  for (const m of missingInDb.slice(0, 20)) console.log(`  - ${m.slug} (${m.inciName})`);
  console.log(`Есть в БД, нет в выгрузке: ${missingInDump.length}`);
  for (const m of missingInDump.slice(0, 20)) console.log(`  - ${m.slug} (${m.inciName})`);
  console.log(`Расхождения имён: ${nameDiffs.length}`);
  for (const d of nameDiffs.slice(0, 20)) {
    console.log(`  - ${d.slug}.${d.field}: БД="${d.db}" → выгрузка="${d.dump}"`);
  }
  console.log(`Синонимов добавить: ${aliasToAdd.length}`);
  for (const a of aliasToAdd.slice(0, 20)) console.log(`  - ${a.slug}: +${a.alias}`);

  if (DRY_RUN) {
    console.log("DRY_RUN — в БД ничего не записано.");
    return;
  }

  for (const d of nameDiffs) {
    await prisma.ingredient.update({
      where: { slug: d.slug },
      data: { [d.field]: d.dump },
    });
  }
  if (aliasToAdd.length) {
    await prisma.synonym.createMany({
      data: aliasToAdd.map(({ ingredientId, alias }) => ({ ingredientId, alias })),
      skipDuplicates: true,
    });
  }
  console.log(`Применено: имён ${nameDiffs.length}, синонимов ${aliasToAdd.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
