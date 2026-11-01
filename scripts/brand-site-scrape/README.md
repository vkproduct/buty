# Скрейпер составов с сайтов брендов

Работает локально, без токенов Kimi. Формат — как в `../za-composition-scrape`:
TSV `url, код, название, бренд, состав`, дозапись, пропуск уже собранных URL,
паузы 2–5 с, `--retries`.

Источники (по ТЗ `Claude outputs/kimi-brand-dedupe.md`, п. 6):
сначала официальные сайты брендов, фолбэк — Wildberries / Ozon / Яндекс Маркет.
Соблюдаем robots.txt: нагрузка минимальная (паузы, один поток, десятки URL).

## Запуск

```bash
cd scripts/brand-site-scrape
node scrape.mjs nevcos urls/nevcos.txt out/nevcos.tsv
node scrape.mjs nevcos urls/nevcos.txt out/nevcos.tsv --delay=2000,5000 --retries=3
```

- `urls/<site>.txt` — список путей (nevcos) или полных URL карточек, по одному на строку.
- Если out-файл существует — дозаписывает и пропускает собранные URL.

## Парсеры

- `nevcos` — www.nevcos.ru (официальный сайт АО «Невская косметика»). HTML
  отдаётся без JS: состав — `<p class="product-sostav">`, ингредиенты в
  `<span class="tip">`. Код карточки = последний сегмент пути.
