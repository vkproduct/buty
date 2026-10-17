/**
 * Тип средства и категория каталога goldapple через Gemini (этап 1).
 *
 * Чистые функции без БД: подготовка строки для модели, валидация ответа,
 * fingerprint для кэша. Промпт и схема — в product-type-prompt.ts.
 */

import { createHash } from "node:crypto";

import { normalizeInci } from "@/lib/ingredients/normalize";
import { PRODUCT_CATEGORY_ORDER } from "@/lib/seo/product-categories";

/** Все значения PRODUCT_CATEGORY_ORDER — enum для схемы ответа модели. */
export const PRODUCT_TYPE_CATEGORIES: readonly string[] = PRODUCT_CATEGORY_ORDER;

export interface TypeProductInput {
  sku: string;
  brand: string;
  name: string;
  /** Исходный текст состава (rawIngredients). */
  inci: string;
}

export interface TypeResult {
  sku: string;
  type: string;
  category: string;
  confidence: number;
}

/** Слова-обещания эффекта, запрещённые в типе средства. */
const BANNED_TYPE_WORDS = ["лечит", "избавит", "от прыщей", "от выпадения"];

const INCI_TOKENS = 15;
const MAX_LINE = 600;
const MAX_TYPE_LEN = 40;

function firstInciTokens(inci: string): string[] {
  return normalizeInci(inci).slice(0, INCI_TOKENS);
}

/** Название без бренда: если name начинается с brand (без учёта регистра) — отрезаем. */
function nameWithoutBrand(name: string, brand: string): string {
  const b = brand.trim();
  if (b && name.toLowerCase().startsWith(b.toLowerCase())) {
    return name.slice(b.length).trim();
  }
  return name.trim();
}

/** Суффикс одноимённого варианта: « · вариант 2» или « (маска для волос)» в конце имени. */
const VARIANT_SUFFIX = /\s+(·\s+вариант\s+\d+|\([^)]*\))$/u;

/**
 * Базовое имя без суффикса варианта. После применения типов имя станет
 * «… (маска для волос)» — fingerprint должен остаться тем же, поэтому и в
 * classifyInputLine, и в typeFingerprint используется базовое имя.
 */
export function baseProductName(name: string): string {
  return name.replace(VARIANT_SUFFIX, "").trim();
}

/** Канонические типы: один смысл — одна строка (v2). */
const CANONICAL_TYPES: Record<string, string> = {
  "шампунь для волос": "шампунь",
  "кондиционер": "кондиционер для волос",
  "тоник для лица": "тоник",
  "тушь": "тушь для ресниц",
  "лак": "лак для ногтей",
  "гель для умывания лица": "гель для умывания",
  "пенка для умывания лица": "пенка для умывания",
  "мыло для рук": "мыло",
};

/**
 * Нормализация после validateTypeResult (v2):
 * - тип приводится к каноническому по словарю CANONICAL_TYPES;
 * - если type начинается со «скраб», «пилинг» или «гоммаж», а category = other — peeling.
 * Сравнение типов вариантов в resolveVariants — только по нормализованным типам.
 */
export function normalizeTypeResult(r: TypeResult): TypeResult {
  const type = CANONICAL_TYPES[r.type] ?? r.type;
  let category = r.category;
  if (category === "other" && /^(скраб|пилинг|гоммаж)/.test(type)) {
    category = "peeling";
  }
  return { ...r, type, category };
}

/**
 * Одна строка для модели:
 * `<sku> | <brand> | <name без бренда> | <первые 15 токенов normalizeInci через ", ">`.
 * Символ `|` внутри полей заменяется на `/`, строка обрезается до 600 символов.
 */
export function classifyInputLine(p: TypeProductInput): string {
  const clean = (s: string) => s.replaceAll("|", "/");
  const line = [
    clean(p.sku),
    clean(p.brand.trim()),
    clean(baseProductName(nameWithoutBrand(p.name, p.brand))),
    firstInciTokens(p.inci).join(", "),
  ].join(" | ");
  return line.slice(0, MAX_LINE);
}

/**
 * Проверка одного элемента ответа модели. Возвращает нормализованный результат
 * или null, если элемент отклонён:
 * - category не из PRODUCT_TYPE_CATEGORIES;
 * - type пустой, длиннее 40 символов, содержит латиницу, цифры, кавычки,
 *   бренд продукта (без учёта регистра) или запрещённые слова;
 * - confidence не число от 0 до 1.
 * `type` приводится к нижнему регистру и обрезается по пробелам.
 */
export function validateTypeResult(raw: unknown, brand: string): TypeResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { sku?: unknown; type?: unknown; category?: unknown; confidence?: unknown };

  if (typeof r.sku !== "string" || r.sku.length === 0) return null;

  if (typeof r.category !== "string" || !PRODUCT_TYPE_CATEGORIES.includes(r.category)) {
    return null;
  }

  if (typeof r.type !== "string") return null;
  const type = r.type.trim().toLowerCase();
  if (type.length === 0 || type.length > MAX_TYPE_LEN) return null;
  if (/[a-z0-9"«»'’]/.test(type)) return null; // латиница, цифры, кавычки
  const brandLc = brand.trim().toLowerCase();
  if (brandLc && type.includes(brandLc)) return null;
  if (BANNED_TYPE_WORDS.some((w) => type.includes(w))) return null;

  if (typeof r.confidence !== "number" || !Number.isFinite(r.confidence)) return null;
  if (r.confidence < 0 || r.confidence > 1) return null;

  return { sku: r.sku, type, category: r.category, confidence: r.confidence };
}

/** sha1 от `brand|базовое name|первые 15 токенов` — кэш-ключ, чтобы не платить повторно. */
export function typeFingerprint(p: TypeProductInput): string {
  const payload = [p.brand.trim(), baseProductName(p.name.trim()), ...firstInciTokens(p.inci)].join("|");
  return createHash("sha1").update(payload, "utf8").digest("hex");
}
