/**
 * Отправка URL в IndexNow (Яндекс поддерживает, до 10 000 URL за запрос).
 * Второй канал уведомления об изменениях: пока «Файлы Sitemap» и «Обход по
 * счётчикам» в Вебмастере только для чтения, sitemap Яндекс сам не перечитывает.
 *
 * URL берутся из тех же функций, что строят sitemap (lib/seo/sitemap-data) —
 * без HTTP к себе. Черновые фильтр-страницы в выборку не попадают: те же
 * пороги ≥5/≥8, что и в sitemap.
 *
 * Зуск (на сервере — внутри контейнера, оттуда env INDEXNOW_KEY):
 *   pnpm indexnow:submit                 # полный прогон
 *   pnpm indexnow:submit --since=2026-10-31   # только URL с lastmod после даты
 *
 * Env: INDEXNOW_KEY (обязателен; файл public/<ключ>.txt уже в репозитории),
 * INDEXNOW_HOST (по умолчанию buty.app).
 */

import {
  filterEntries,
  indexableProductCount,
  ingredientEntries,
  productEntries,
  sitemapFileCountForProducts,
  staticEntries,
  type SitemapEntry,
} from "../lib/seo/sitemap-data";

const HOST = process.env.INDEXNOW_HOST ?? "buty.app";
const KEY = process.env.INDEXNOW_KEY;
const BATCH = 10_000;
const PAUSE_MS = 2_000;

function parseSince(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--since="));
  if (!arg) return null;
  const value = arg.slice("--since=".length).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error(`--since: ожидается дата YYYY-MM-DD, получено «${value}»`);
    process.exit(1);
  }
  return value;
}

/** Все URL sitemap: те же данные, что отдают /sitemap/*.xml. */
async function collectEntries(): Promise<SitemapEntry[]> {
  const products = await indexableProductCount();
  const productFiles = sitemapFileCountForProducts(products);
  const [staticE, ingredients, filters] = await Promise.all([
    staticEntries(),
    ingredientEntries(),
    filterEntries(),
  ]);
  const chunks: SitemapEntry[][] = [];
  for (let n = 1; n <= productFiles; n++) {
    chunks.push(await productEntries(n));
  }
  return [...staticE, ...ingredients, ...filters, ...chunks.flat()];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!KEY) {
    console.error("INDEXNOW_KEY не задан (env). Ключ — в public/<ключ>.txt.");
    process.exit(1);
  }
  const since = parseSince();
  const entries = await collectEntries();
  const urls = entries
    .filter((e) => !since || e.lastModified >= since)
    .map((e) => e.url);

  console.log(`IndexNow: ${urls.length} URL (всего в sitemap ${entries.length}, since=${since ?? "—"})`);
  if (urls.length === 0) return;

  const keyLocation = `https://${HOST}/${KEY}.txt`;
  for (let i = 0; i < urls.length; i += BATCH) {
    const urlList = urls.slice(i, i + BATCH);
    const res = await fetch(`https://yandex.com/indexnow`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation, urlList }),
    });
    const body = await res.text().catch(() => "");
    console.log(`пачка ${i / BATCH + 1}: ${res.status} (${urlList.length} URL)`);
    if (res.status === 422 || res.status === 403) {
      console.error(`IndexNow отклонил пачку: ${res.status}\n${body}`);
      process.exit(1);
    }
    if (res.status !== 200 && res.status !== 202) {
      console.error(`IndexNow: неожиданный код ${res.status}\n${body}`);
      process.exit(1);
    }
    if (i + BATCH < urls.length) await sleep(PAUSE_MS);
  }
  console.log("IndexNow: отправка завершена.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
