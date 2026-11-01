/**
 * Нормализация брендов в каталоге: сухой прогон с отчётом, применение
 * (--apply), проверка отсутствия дублей (--check).
 *
 * Прогон по умолчанию — dry-run: группирует DISTINCT brand Product по правилам
 * lib/products/brand-canonical.ts, пишет data/brands/brand-merge-report.csv и
 * печатает сводку, включая число бренд-URL в sitemap/filters.xml до и после.
 *
 * Запуск:
 *   pnpm brands:normalize                    # dry-run на БД из DATABASE_URL
 *   pnpm brands:normalize --from-file rows.json  # офлайн-разбор выгруженных строк
 *   CONFIRM_APPLY=1 pnpm brands:normalize --apply  # переименование (прод!)
 *   pnpm brands:normalize --check            # проверка: нет двух brand с одним brandKey
 *
 * Выгрузка строк с прода без доступа к БД извне (запуск с хоста, SSH):
 *   docker compose -f docker-compose.prod.yml exec -T db psql -U buty -d buty -t -A \
 *     -c "SELECT json_agg(row_to_json(t)) FROM (SELECT \"brand\", \"category\", count(*)::int AS total,
 *       count(*) FILTER (WHERE \"hidden\" = false)::int AS visible,
 *       count(*) FILTER (WHERE \"hidden\" = false AND (\"ingredientsTotal\" = 0
 *         OR \"ingredientsRecognized\"::float / \"ingredientsTotal\" >= 0.5))::int AS indexable
 *       FROM \"Product\" GROUP BY \"brand\", \"category\") t;" > data/brands/prod-brand-rows.json
 *
 * --apply (порядок см. в ТЗ): бэкап scripts/backup.sh + лог отката
 * data/brands/brand-rename-applied-ГГГГ-ММ-ДД.csv, UPDATE "Product".brand
 * по группам в транзакции, нормализация Brand.catalogBrands, перегенерация
 * lib/products/brand-redirects.data.ts (файл только дополняется), финальная
 * проверка. Slug-и продуктов, Brand.name, пороги индексации не трогаем.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  aliasCanonical,
  brandKey,
  canonicalBrand,
  resolveCanonicalGroups,
  type BrandVariant,
  type CanonicalGroup,
} from "../lib/products/brand-canonical";
import { displayBrand } from "../lib/products/brand";
import {
  MIN_BRAND_CATEGORY_PRODUCTS,
  MIN_BRAND_PRODUCTS,
} from "../lib/products/catalog-filters";

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const FROM_FILE = argValue("--from-file");
const DRY_RUN = !APPLY && !CHECK;

const DATA_DIR = path.join(process.cwd(), "data", "brands");
const REPORT_CSV = path.join(DATA_DIR, "brand-merge-report.csv");
const REDIRECTS_TS = path.join(process.cwd(), "lib", "products", "brand-redirects.data.ts");

interface BrandRow {
  brand: string;
  category: string;
  total: number;
  visible: number;
  indexable: number;
}

interface BrandTotals {
  brand: string;
  products: number;
  visible: number;
  indexable: number;
}

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

function sqlLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function loadRowsFromDb(): Promise<BrandRow[]> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ brand: string; category: string; total: number; visible: number; indexable: number }>
    >(`
      SELECT "brand", "category", count(*)::int AS total,
        count(*) FILTER (WHERE "hidden" = false)::int AS visible,
        count(*) FILTER (WHERE "hidden" = false AND ("ingredientsTotal" = 0
          OR "ingredientsRecognized"::float / "ingredientsTotal" >= 0.5))::int AS indexable
      FROM "Product"
      GROUP BY "brand", "category"
    `);
    return rows;
  } finally {
    await prisma.$disconnect();
  }
}

function loadRows(): Promise<BrandRow[]> {
  if (FROM_FILE) {
    const rows = JSON.parse(readFileSync(FROM_FILE, "utf8")) as BrandRow[];
    console.log(`Строки загружены из файла: ${FROM_FILE} (${rows.length} строк)`);
    return Promise.resolve(rows);
  }
  return loadRowsFromDb();
}

/** DISTINCT brand с суммами по всем категориям. */
function brandTotals(rows: readonly BrandRow[]): BrandTotals[] {
  const byBrand = new Map<string, BrandTotals>();
  for (const r of rows) {
    const t = byBrand.get(r.brand);
    if (t) {
      t.products += r.total;
      t.visible += r.visible;
      t.indexable += r.indexable;
    } else {
      byBrand.set(r.brand, {
        brand: r.brand,
        products: r.total,
        visible: r.visible,
        indexable: r.indexable,
      });
    }
  }
  return [...byBrand.values()];
}

/** Число URL в sitemap/filters.xml при заданном маппинге брендов. */
function countFilterUrls(
  rows: readonly BrandRow[],
  mapBrand: (brand: string) => string
): { categoryOnly: number; brandUrls: number; pairUrls: number; total: number } {
  const byBrand = new Map<string, number>();
  const byPair = new Map<string, number>();
  const categories = new Set<string>();
  for (const r of rows) {
    if (displayBrand(r.brand) === null) continue;
    const brand = mapBrand(r.brand);
    byBrand.set(brand, (byBrand.get(brand) ?? 0) + r.indexable);
    byPair.set(`${brand}|${r.category}`, (byPair.get(`${brand}|${r.category}`) ?? 0) + r.indexable);
    categories.add(r.category);
  }
  let brandUrls = 0;
  for (const n of byBrand.values()) if (n >= MIN_BRAND_PRODUCTS) brandUrls++;
  let pairUrls = 0;
  for (const n of byPair.values()) if (n >= MIN_BRAND_CATEGORY_PRODUCTS) pairUrls++;
  const categoryOnly = categories.size;
  return { categoryOnly, brandUrls, pairUrls, total: categoryOnly + brandUrls + pairUrls };
}

function writeReportCsv(
  groups: readonly CanonicalGroup[],
  totals: ReadonlyMap<string, BrandTotals>
): { renamedVariants: number; affectedProducts: number } {
  const lines = ["canonical,variant,products,visible_products,will_rename"];
  let renamedVariants = 0;
  let affectedProducts = 0;
  const sorted = [...groups].sort((a, b) => b.products - a.products || a.canonical.localeCompare(b.canonical, "ru"));
  for (const g of sorted) {
    for (const v of [...g.variants].sort((a, b) => b.products - a.products)) {
      const willRename = v.name !== g.canonical ? "yes" : "no";
      if (willRename === "yes") {
        renamedVariants++;
        affectedProducts += v.products;
      }
      const t = totals.get(v.name);
      lines.push(
        [
          csvField(g.canonical),
          csvField(v.name),
          String(v.products),
          String(t?.visible ?? 0),
          willRename,
        ].join(",")
      );
    }
  }
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(REPORT_CSV, lines.join("\n") + "\n");
  return { renamedVariants, affectedProducts };
}

/** BRAND_REDIRECTS из существующего файла (файл только дополняем). */
function readExistingRedirects(): Record<string, string> {
  if (!existsSync(REDIRECTS_TS)) return {};
  const text = readFileSync(REDIRECTS_TS, "utf8");
  const out: Record<string, string> = {};
  const re = /"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out[JSON.parse(`"${m[1]}"`) as string] = JSON.parse(`"${m[2]}"`) as string;
  }
  return out;
}

function writeRedirects(redirects: Record<string, string>): void {
  const lines = Object.entries(redirects)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  const content = `/**
 * Сгенерировано scripts/brands-normalize.ts --apply: brandKey → каноническое
 * имя бренда. Middleware делает 301 со старых написаний (?brand=VICHY →
 * ?brand=Vichy). ФАЙЛ НЕ УДАЛЯТЬ: старые URL месяцами живут в индексе Яндекса,
 * при следующих прогонах дополнять, не пересоздавать с нуля.
 */
export const BRAND_REDIRECTS: Record<string, string> = {
${lines.join("\n")}
};
`;
  writeFileSync(REDIRECTS_TS, content);
}

async function main(): Promise<void> {
  if (CHECK) {
    await check();
    return;
  }

  const rows = await loadRows();
  const totalsList = brandTotals(rows);
  const totals = new Map(totalsList.map((t) => [t.brand, t]));
  const groups = resolveCanonicalGroups(
    totalsList.map((t) => ({ name: t.brand, products: t.products }))
  );
  const brandToCanonical = new Map<string, string>();
  for (const g of groups) for (const v of g.variants) brandToCanonical.set(v.name, g.canonical);

  if (DRY_RUN) {
    const { renamedVariants, affectedProducts } = writeReportCsv(groups, totals);
    const dupGroups = groups.filter((g) => g.variants.length > 1);
    const before = countFilterUrls(rows, (b) => b);
    const after = countFilterUrls(rows, (b) => brandToCanonical.get(b) ?? b);

    console.log("\n=== Сводка сухого прогона (без изменений в БД) ===");
    console.log(`Вариантов написания бренда в БД:  ${totalsList.length}`);
    console.log(`Брендов после склейки:            ${groups.length}`);
    console.log(`Групп с дублями (≥ 2 вариантов):  ${dupGroups.length}`);
    console.log(`Вариантов к переименованию:       ${renamedVariants}`);
    console.log(`Затронутых средств:               ${affectedProducts}`);
    console.log(`Отчёт: ${REPORT_CSV}`);
    console.log("\n--- filters.xml: URL «только категория» / бренд / бренд+категория ---");
    console.log(`Сейчас:  категорий ${before.categoryOnly}, брендов ${before.brandUrls}, пар ${before.pairUrls}, всего ${before.total}`);
    console.log(`После:   категорий ${after.categoryOnly}, брендов ${after.brandUrls}, пар ${after.pairUrls}, всего ${after.total}`);
    console.log("\nДля применения: CONFIRM_APPLY=1 pnpm brands:normalize --apply");
    return;
  }

  // --apply
  if (process.env.CONFIRM_APPLY !== "1") {
    console.error("--apply требует CONFIRM_APPLY=1. Сначала изучите отчёт dry-run.");
    process.exit(1);
  }
  if (FROM_FILE) {
    console.error("--apply нельзя с --from-file: нужен прямой доступ к БД.");
    process.exit(1);
  }
  await apply(groups, totals);
}

/** Проверка: в Product нет двух разных brand с одинаковым brandKey. */
async function check(): Promise<void> {
  const rows = await loadRows();
  const byKey = new Map<string, Set<string>>();
  for (const { brand } of brandTotals(rows)) {
    const key = brandKey(brand);
    const set = byKey.get(key) ?? new Set<string>();
    set.add(brand);
    byKey.set(key, set);
  }
  const collisions = [...byKey.entries()].filter(([, set]) => set.size > 1);
  if (collisions.length === 0) {
    console.log("OK: дублей брендов с одинаковым brandKey нет.");
    return;
  }
  console.error(`Найдено ${collisions.length} групп дублей:`);
  for (const [key, set] of collisions) {
    console.error(`  ${key}: ${[...set].join(" | ")}`);
  }
  process.exit(1);
}

async function apply(
  groups: readonly CanonicalGroup[],
  totals: ReadonlyMap<string, BrandTotals>
): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const renameGroups = groups.filter((g) => g.variants.some((v) => v.name !== g.canonical));
  const renamedFrom = new Set(renameGroups.flatMap((g) => g.variants.map((v) => v.name)));

  console.log(`К переименованию групп: ${renameGroups.length}, вариантов: ${renamedFrom.size}`);

  // 1. Бэкап БД (обычный backup.sh; на хосте с docker — работает).
  if (process.env.SKIP_BACKUP === "1") {
    console.log("SKIP_BACKUP=1 — бэкап пропущен (должен быть сделан отдельно!).");
  } else {
    console.log("Бэкап БД: bash scripts/backup.sh ...");
    const { execFileSync } = await import("node:child_process");
    execFileSync("bash", ["scripts/backup.sh"], { stdio: "inherit" });
  }

  // 2. Лог для отката: все затронутые продукты до изменений.
  mkdirSync(DATA_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const rollbackPath = path.join(DATA_DIR, `brand-rename-applied-${stamp}.csv`);
  const affected = await prisma.product.findMany({
    where: { brand: { in: [...renamedFrom] } },
    select: { id: true, brand: true },
    orderBy: { id: "asc" },
  });
  writeFileSync(
    rollbackPath,
    "product_id,old_brand,new_brand\n" +
      affected
        .map((p) => `${p.id},${csvField(p.brand)},${csvField(brandToCanonicalOf(p.brand))}`)
        .join("\n") +
      "\n"
  );
  console.log(`Лог отката: ${rollbackPath} (${affected.length} продуктов)`);

  // 3. UPDATE по группам в транзакции. updatedAt ставим вручную — raw SQL
  //    не обновляет @updatedAt Prisma, а новый lastmod нужен в sitemap.
  await prisma.$transaction(async (tx) => {
    for (const g of renameGroups) {
      for (const v of g.variants) {
        if (v.name === g.canonical) continue;
        const n = await tx.$executeRawUnsafe(
          `UPDATE "Product" SET "brand" = ${sqlLiteral(g.canonical)}, "updatedAt" = now()
           WHERE "brand" = ${sqlLiteral(v.name)}`
        );
        console.log(`  ${v.name} → ${g.canonical}: ${n} продуктов`);
      }
    }
  });

  // 4. Brand.catalogBrands: нормализация, дедуп, канон имени в списке. Brand.name не трогаем.
  const knownByKey = new Map<string, string>();
  for (const g of groups) knownByKey.set(g.key, g.canonical);
  const brandRows = await prisma.brand.findMany({ select: { id: true, catalogBrands: true } });
  for (const b of brandRows) {
    const next = new Set<string>();
    for (const cb of b.catalogBrands) {
      next.add(canonicalBrand(cb, knownByKey));
      const alias = aliasCanonical(cb);
      const key = brandKey(cb);
      next.add(alias ?? knownByKey.get(key) ?? cb.trim());
    }
    const list = [...next].filter(Boolean);
    if (list.length !== b.catalogBrands.length || list.some((v, i) => v !== b.catalogBrands[i])) {
      await prisma.brand.update({ where: { id: b.id }, data: { catalogBrands: list } });
      console.log(`  Brand.catalogBrands [${b.catalogBrands.join(", ")}] → [${list.join(", ")}]`);
    }
  }

  // 5. brand-redirects.data.ts: группы с дублями/алиасами + бренды ≥ порога.
  //    Существующий файл читаем и только дополняем.
  const redirects = readExistingRedirects();
  let added = 0;
  const put = (key: string, canonical: string) => {
    if (redirects[key] !== canonical) {
      redirects[key] = canonical;
      added++;
    }
  };
  for (const g of groups) {
    const hasAlias = g.variants.some((v) => aliasCanonical(v.name) !== null);
    if (g.variants.length > 1 || hasAlias) put(g.key, g.canonical);
    const t = totals.get(g.canonical);
    if ((t?.products ?? g.products) >= MIN_BRAND_PRODUCTS) put(g.key, g.canonical);
  }
  writeRedirects(redirects);
  console.log(`brand-redirects.data.ts: записей ${Object.keys(redirects).length} (новых ${added})`);

  // 6. Финальная проверка: нет двух brand с одинаковым brandKey.
  const distinct = await prisma.product.findMany({
    select: { brand: true },
    distinct: ["brand"],
  });
  const byKey = new Map<string, Set<string>>();
  for (const { brand } of distinct) {
    const key = brandKey(brand);
    const set = byKey.get(key) ?? new Set<string>();
    set.add(brand);
    byKey.set(key, set);
  }
  const collisions = [...byKey.values()].filter((s) => s.size > 1);
  if (collisions.length > 0) {
    console.error("ОШИБКА: остались группы с одинаковым brandKey:");
    for (const set of collisions) console.error(`  ${[...set].join(" | ")}`);
    process.exit(1);
  }
  console.log("Проверка пройдена: дублей с одинаковым brandKey нет.");

  function brandToCanonicalOf(brand: string): string {
    for (const g of renameGroups) {
      if (g.variants.some((v) => v.name === brand)) return g.canonical;
    }
    return brand;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
