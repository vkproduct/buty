# OCR-переходник (Google Cloud Run functions, Европа)

Зачем: сервер Buty стоит в РФ; запросы к Google Vision идут через эту функцию в Европе.

Схема: `buty.app (РФ) → POST <URL функции>?key=<PROXY_SECRET> → функция сверяет секрет → Vision API с настоящим ключом`.
Настоящий ключ Google хранится только в переменных функции; на сервере в РФ его нет.

## Переменные функции
- `PROXY_SECRET` — общий секрет с сервером (на сервере он лежит в `GOOGLE_VISION_API_KEY`).
- `GOOGLE_VISION_API_KEY` — настоящий API-ключ Google, ограниченный только Cloud Vision API.

## Переменные сервера (/opt/buty/.env)
- `GOOGLE_VISION_ENDPOINT=https://ocr-proxy-....europe-west3.run.app`
- `GOOGLE_VISION_API_KEY=<PROXY_SECRET>` — код сайта подставляет его в `?key=`, менять код не нужно.

## Деплой
Cloud Run → «Write a function» → имя `ocr-proxy`, регион `europe-west3`, Node.js 22, публичный доступ (защита — секрет), переменные выше.
Вставить `index.js` и `package.json`, entry point `ocrProxy`. GET на URL отвечает `{"ok":true}`.

## Ответы
- 403 forbidden — неверный секрет; 400 — не тот JSON; 500 — не заданы переменные; 504 — Google не ответил за 25 с.
- Остальное — ответ Vision API как есть.
