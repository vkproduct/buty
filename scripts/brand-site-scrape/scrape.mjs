// Скрейпер составов (INCI) с сайтов брендов — образец ../za-composition-scrape.
// Использование:
//   node scrape.mjs <site> urls.txt out.tsv
//   node scrape.mjs nevcos urls/nevcos.txt out/nevcos.tsv --delay=3000,7000 --retries=3
//
// Формат urls.txt: для nevcos — пути /catalog/.../ (по одному на строку);
// для остальных — полные URL. Формат out.tsv (табуляция): url \t код \t название \t бренд \t состав
// Скрипт дозаписывает результат и при перезапуске пропускает уже собранные URL.

import fs from 'node:fs';
import path from 'node:path';

const [site, inputFile, outFile = 'compositions.tsv', ...rest] = process.argv.slice(2);
if (!site || !inputFile) {
  console.error('Использование: node scrape.mjs <site> urls.txt out.tsv [--delay=2000,5000] [--retries=3]');
  process.exit(1);
}
const arg = (name, dflt) => {
  const a = rest.find(r => r.startsWith(`--${name}=`));
  if (!a) return dflt;
  return a.split('=')[1].split(',').map(Number);
};
const [delayMin, delayMax] = arg('delay', [2000, 5000]);
const retries = arg('retries', [3])[0];

const BASE = { nevcos: 'https://www.nevcos.ru', profcosmetology: 'https://www.profcosmetology.ru' };
const BRAND = { nevcos: 'Невская косметика', profcosmetology: 'Angiopharm' };

// ---------- чекпоинт ----------
const done = new Set();
fs.mkdirSync(path.dirname(outFile), { recursive: true });
if (fs.existsSync(outFile)) {
  for (const line of fs.readFileSync(outFile, 'utf8').split('\n')) {
    const url = line.split('\t')[0]?.trim();
    if (url) done.add(url);
  }
}
const out = fs.createWriteStream(outFile, { flags: 'a' });
const write = row => new Promise(res => out.write(row + '\n', res));

const rawUrls = fs.readFileSync(inputFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const urls = rawUrls
  .map(u => (u.startsWith('http') ? u : BASE[site] + u))
  .filter(u => !done.has(u));
console.log(`Новых URL: ${urls.length}, уже собрано: ${done.size}`);

// ---------- парсеры карточек ----------
const clean = s => (s || '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

const PARSERS = {
  // nevcos.ru: состав в <p class="product-sostav">, ингредиенты в span.tip.
  nevcos(html) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '';
    const name = clean(h1.replace(/<[^>]+>/g, ' '));
    const m = html.match(/<p class="product-sostav">([\s\S]*?)<\/p>/i);
    if (!m) return { name, composition: '' };
    const composition = clean(
      m[1]
        .replace(/^[\s\S]*?Состав:\s*<\/span>/i, '')
        .replace(/<[^>]+>/g, ', ')
        .replace(/,\s*,+/g, ',')
        .replace(/^[\s,]+|[\s,]+$/g, '')
    );
    return { name, composition };
  },

  // profcosmetology.ru: состав — <div class="header">Состав:</div> <div class="text"><p>INCI</p>.
  // h1: «Angiopharm / Ретиноиды <br> Retisolve … - Крем …» — имя берём без префикса бренда/линейки.
  profcosmetology(html) {
    const h1raw = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '';
    let name = clean(h1raw.replace(/<[^>]+>/g, ' '));
    name = name.replace(/^Angiopharm\s*\/\s*[^ ]+(\s+[^ ]+)*?\s+(?=[A-ZА-Я0-9])/i, '');
    name = name.replace(/^Angiopharm\s*\/\s*\S+\s*/i, '');
    const m = html.match(/Состав:<a name="composition">[\s\S]*?<div class="text">([\s\S]*?)<\/div>/i);
    if (!m) return { name, composition: '' };
    const composition = clean(
      m[1]
        .replace(/<[^>]+>/g, ', ')
        .replace(/,\s*,+/g, ',')
        .replace(/^[\s,]+|[\s,]+$/g, '')
    );
    return { name, composition };
  },
};

const codeOf = url => url.split('/').filter(Boolean).pop() || '';

// ---------- основной цикл ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

for (const url of urls) {
  let row = null;
  for (let attempt = 1; attempt <= retries && !row; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, 'accept-language': 'ru-RU,ru;q=0.9' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const { name, composition } = PARSERS[site](html);
      if (!name && !composition) throw new Error('пустая карточка');
      row = [url, codeOf(url), name, BRAND[site] ?? '', composition].join('\t');
    } catch (e) {
      console.error(`  попытка ${attempt}/${retries} ${url}: ${e.message}`);
      if (attempt < retries) await sleep(rnd(3000, 8000));
    }
  }
  await write(row ?? [url, codeOf(url), '', '', `ERROR: не удалось после ${retries} попыток`].join('\t'));
  console.log(`ok: ${url}`);
  await sleep(rnd(delayMin, delayMax));
}

out.end();
console.log('Готово.');
