# Переходник в Google (Cloud Run functions, Европа)

Зачем: сервер Buty стоит в РФ; запросы к Google Vision и Gemini идут через эту функцию в Европе.

Схема:
- распознавание фото: `buty.app (РФ) → POST <URL функции>?key=<PROXY_SECRET> → Vision API`;
- резюме состава: `buty.app (РФ) → POST <URL функции>?key=<PROXY_SECRET>&target=gemini → Gemini Interactions API`.

Функция сверяет секрет и подставляет настоящий ключ Google. Настоящие ключи хранятся только
в переменных функции; на сервере в РФ их нет.

## Переменные функции
- `PROXY_SECRET` — общий секрет с сервером (на сервере он лежит в `GOOGLE_VISION_API_KEY` и `GEMINI_API_KEY`).
- `GOOGLE_VISION_API_KEY` — настоящий API-ключ Google, ограниченный только Cloud Vision API.
- `GEMINI_API_KEY` — ключ Gemini API из Google AI Studio (https://aistudio.google.com/apikey).

## Переменные сервера (/opt/buty/.env)
- `GOOGLE_VISION_ENDPOINT=https://ocr-proxy-....europe-west3.run.app`
- `GOOGLE_VISION_API_KEY=<PROXY_SECRET>`
- `GEMINI_ENDPOINT=https://ocr-proxy-....europe-west3.run.app` — тот же адрес
- `GEMINI_API_KEY=<PROXY_SECRET>` — тот же секрет

## Деплой
Cloud Run → функция `ocr-proxy` → «Edit & deploy new revision» (при первом создании — «Write a function»,
регион `europe-west3`, Node.js 22, публичный доступ — защита секретом). Вставить `index.js` и `package.json`,
entry point `ocrProxy`, добавить переменные выше. GET на URL отвечает `{"ok":true}`.

## Ответы
- 403 forbidden — неверный секрет; 400 — не тот JSON; 500 — не заданы переменные; 504 — Google не ответил за 25 с.
- Остальное — ответ Google как есть.
