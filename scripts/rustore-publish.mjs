#!/usr/bin/env node
/**
 * Публикация Android-приложения Buty в RuStore через RuStore Public API.
 *
 * Запуск:  node scripts/rustore-publish.mjs <путь к .apk> ["Что нового"]
 * Настройки берутся из android-keystore/rustore.env (папка в .gitignore):
 *   RUSTORE_KEY_ID=...          — ID ключа из RuStore Консоли (Компания → API RuStore)
 *   RUSTORE_PRIVATE_KEY=...     — приватный ключ из консоли (Base64, одной строкой)
 *   RUSTORE_CONTACT_EMAIL=...   — email поддержки, который увидят пользователи
 *
 * Шаги: токен → черновик версии → загрузка APK → отправка на модерацию.
 * После одобрения модерацией версия публикуется сразу (publishType INSTANTLY).
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const API = "https://public-api.rustore.ru";
const PACKAGE = "app.buty.android";
const ENV_FILE = "android-keystore/rustore.env";

const SHORT_DESCRIPTION =
  "Разбор состава косметики по INCI: функции ингредиентов, конфликты активов";
const FULL_DESCRIPTION = `Buty — научный разбор составов косметики без маркетинговых мифов.

Вставьте состав (INCI) или сфотографируйте этикетку — Buty покажет функцию каждого ингредиента на русском, рабочие концентрации, уровень доказательности, комедогенность, отдушки и аллергены ЕС, а также конфликты активов.

Что умеет приложение:
• Разбор состава текстом и по фото упаковки.
• Каталог из более чем 5 000 ингредиентов и 17 000 средств с разобранными составами.
• «Моя полка»: соберите свой уход и проверьте совместимость средств, порядок нанесения, дубли активов.
• История реакций кожи и напоминания: оценить результат, пора докупить.
• Профиль кожи: тип, задачи, особые периоды (беременность, ГВ, ретиноиды) — предупреждения подстраиваются под вас.
• «Поделиться» → Buty: отправьте текст состава из любого приложения и сразу получите разбор.

Без рекламы брендов в оценках: только данные исследований и регуляторов.`;

function fail(msg) {
  console.error(`ОШИБКА: ${msg}`);
  process.exit(1);
}

function loadEnv() {
  if (!existsSync(ENV_FILE)) fail(`нет файла ${ENV_FILE}`);
  const env = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  for (const k of ["RUSTORE_KEY_ID", "RUSTORE_PRIVATE_KEY", "RUSTORE_CONTACT_EMAIL"]) {
    if (!env[k]) fail(`в ${ENV_FILE} не заполнено ${k}`);
  }
  return env;
}

async function call(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers["Public-Token"] = token;
  let body;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(API + path, { method, headers, body });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { code: `HTTP ${res.status}`, message: text.slice(0, 300) };
  }
  if (!res.ok || (data.code && data.code !== "OK")) {
    fail(`${method} ${path} → ${res.status} ${data.code ?? ""} ${data.message ?? ""}`);
  }
  return data;
}

// Ключ из консоли — Base64 (PKCS#8 или PKCS#1); на всякий случай принимаем и PEM.
function parsePrivateKey(raw) {
  if (raw.includes("BEGIN")) return createPrivateKey(raw.replace(/\\n/g, "\n"));
  const der = Buffer.from(raw.replace(/\s+/g, ""), "base64");
  for (const type of ["pkcs8", "pkcs1"]) {
    try {
      return createPrivateKey({ key: der, format: "der", type });
    } catch {
      // пробуем следующий формат
    }
  }
  fail("RUSTORE_PRIVATE_KEY не похож на RSA-ключ (ожидается Base64 из RuStore Консоли)");
}

async function getToken(keyId, privateKeyB64) {
  // Время с явным смещением, как в примерах RuStore: 2026-10-08T18:00:00.000+00:00
  const timestamp = new Date().toISOString().replace("Z", "+00:00");
  const key = parsePrivateKey(privateKeyB64);
  const signature = sign("sha512", Buffer.from(keyId + timestamp), key).toString("base64");
  const data = await call("POST", "/public/auth/", { json: { keyId, timestamp, signature } });
  const token = data.body?.jwe;
  if (!token) fail("в ответе авторизации нет body.jwe");
  return token;
}

async function main() {
  const apkPath = process.argv[2];
  const whatsNew = process.argv[3] || "Первая версия Buty для Android.";
  if (!apkPath || !apkPath.endsWith(".apk") || !existsSync(apkPath)) {
    fail("укажите путь к существующему .apk: node scripts/rustore-publish.mjs <файл.apk>");
  }
  const env = loadEnv();

  const token = await getToken(env.RUSTORE_KEY_ID, env.RUSTORE_PRIVATE_KEY);
  console.log("1/4 токен получен");

  const draft = await call("POST", `/public/v1/application/${PACKAGE}/version`, {
    token,
    json: {
      appName: "Buty: разбор состава косметики",
      appType: "MAIN",
      minAndroidVersion: 7,
      developerContacts: { email: env.RUSTORE_CONTACT_EMAIL, website: "https://buty.app" },
      shortDescription: SHORT_DESCRIPTION,
      fullDescription: FULL_DESCRIPTION,
      whatsNew,
      publishType: "INSTANTLY",
    },
  });
  const versionId = typeof draft.body === "number" ? draft.body : draft.body?.versionId;
  if (!versionId) fail(`не удалось получить versionId: ${JSON.stringify(draft).slice(0, 300)}`);
  console.log(`2/4 черновик создан, versionId=${versionId}`);

  const form = new FormData();
  form.append(
    "file",
    new Blob([readFileSync(apkPath)], { type: "application/vnd.android.package-archive" }),
    basename(apkPath),
  );
  await call(
    "POST",
    `/public/v1/application/${PACKAGE}/version/${versionId}/apk?servicesType=Unknown&isMainApk=true`,
    { token, form },
  );
  console.log("3/4 APK загружен");

  await call("POST", `/public/v1/application/${PACKAGE}/version/${versionId}/commit`, { token });
  console.log("4/4 отправлено на модерацию. Статус — в RuStore Консоли.");
}

main().catch((e) => fail(e?.message ?? String(e)));
