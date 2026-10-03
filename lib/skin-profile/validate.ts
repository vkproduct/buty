import {
  CONCERNS,
  CONDITIONS,
  MAX_CUSTOM_LENGTH,
  SKIN_TYPE_VALUES,
  type SkinTypeValue,
} from "./options";

export interface SkinProfileInput {
  skinType: SkinTypeValue;
  sensitive: boolean;
  concerns: string[];
  conditions: string[];
  allergies: string[];
  intolerances: string[];
}

const CONCERN_IDS = new Set(CONCERNS.map((o) => o.id));
const CONDITION_IDS = new Set(CONDITIONS.map((o) => o.id));
const MAX_LIST = 30;

function idList(value: unknown, allowed: Set<string>): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_LIST) return null;
  if (!value.every((v) => typeof v === "string" && allowed.has(v))) return null;
  return [...new Set(value as string[])];
}

/** Аллергены: id из справочника или свой текст (до MAX_CUSTOM_LENGTH символов). */
function freeList(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_LIST) return null;
  const items: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") return null;
    const t = v.trim().replace(/\s+/g, " ");
    if (t.length === 0 || t.length > MAX_CUSTOM_LENGTH) return null;
    items.push(t);
  }
  return [...new Set(items)];
}

/** Проверка тела POST /api/skin-profile. Возвращает данные или текст ошибки. */
export function parseSkinProfile(
  body: unknown,
): { ok: true; data: SkinProfileInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Некорректный запрос" };
  }
  const b = body as Record<string, unknown>;

  if (b.consent !== true) {
    return { ok: false, error: "Нужно согласие на обработку данных о коже" };
  }
  if (typeof b.skinType !== "string" || !SKIN_TYPE_VALUES.includes(b.skinType as SkinTypeValue)) {
    return { ok: false, error: "Некорректный тип кожи" };
  }
  if (b.sensitive !== undefined && typeof b.sensitive !== "boolean") {
    return { ok: false, error: "Некорректное поле sensitive" };
  }

  const concerns = idList(b.concerns, CONCERN_IDS);
  const conditions = idList(b.conditions, CONDITION_IDS);
  const allergies = freeList(b.allergies);
  const intolerances = freeList(b.intolerances);
  if (!concerns || !conditions || !allergies || !intolerances) {
    return { ok: false, error: "Некорректные списки профиля" };
  }

  // Один пункт — один уровень реакции: аллергия важнее раздражения.
  const allergySet = new Set(allergies.map((a) => a.toLowerCase()));
  return {
    ok: true,
    data: {
      skinType: b.skinType as SkinTypeValue,
      sensitive: b.sensitive === true,
      concerns,
      conditions,
      allergies,
      intolerances: intolerances.filter((i) => !allergySet.has(i.toLowerCase())),
    },
  };
}
