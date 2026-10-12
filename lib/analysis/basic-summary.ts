import { hasPhotosensitizer, ONE_PERCENT_LINE_SLUGS } from "./photosensitivity";
import type { AnalysisResult, AnalyzedIngredient } from "./types";

/**
 * Сводка состава без ИИ — по правилам и данным базы Buty.
 * Показывается в блоке «Коротко о составе», когда резюме ИИ недоступно
 * (ИИ выключен, лимит, ошибка, мало распознано), чтобы сводка была всегда.
 */
export interface BasicSummary {
  verdict: string;
  inside: string;
  suits: string; // пустая строка — нечего сказать
  caution: string;
}

/** Категории-«направления» ухода → на что сделан акцент (винительный падеж, после «на»). */
const FOCUS: Record<string, string> = {
  humectant: "увлажнение",
  barrier: "восстановление защитного барьера",
  soothing: "успокаивание кожи",
  antioxidant: "антиоксидантную защиту",
  peptide: "пептидный уход",
  emollient: "смягчение кожи",
  "uv-filter": "защиту от солнца",
  surfactant: "очищение",
};

/** Что считаем «главными активами». */
const KEY_ACTIVE_CATEGORIES = new Set(["active", "peptide", "antioxidant", "uv-filter"]);

const MAX_FOCUS = 2;
const MAX_BASE = 3;
const MAX_ACTIVES = 4;
/** Если «линии 1%» (консерванта) нет — смотрим на начало списка. */
const HEAD_WITHOUT_LINE = 10;

function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

/** «Ниацинамид» → «ниацинамид» внутри фразы; аббревиатуры (PEG-40, CI 77891) не трогаем. */
function inPhrase(name: string): string {
  const clean = name.trim();
  if (clean.length < 2) return clean;
  const [first, second] = [clean[0], clean[1]];
  if (second !== second.toLowerCase()) return clean;
  return first.toLowerCase() + clean.slice(1);
}

/** «a», «a и b», «a, b и c». */
function joinRu(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
}

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** Индекс «линии 1%»: всё, что после консерванта, обычно содержится в концентрации ≤1%. */
function onePercentLine(ingredients: AnalyzedIngredient[]): number {
  return ingredients.findIndex((i) => ONE_PERCENT_LINE_SLUGS.has(i.slug));
}

/** Направления ухода: самые частые категории до «линии 1%», при равенстве — что раньше в списке. */
function focusAreas(ingredients: AnalyzedIngredient[], line: number): string[] {
  const head = ingredients.slice(0, line >= 0 ? line : HEAD_WITHOUT_LINE);
  const stats = new Map<string, { count: number; first: number }>();
  head.forEach((ing, idx) => {
    if (!FOCUS[ing.category]) return;
    const s = stats.get(ing.category);
    if (s) s.count += 1;
    else stats.set(ing.category, { count: 1, first: idx });
  });
  return [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)
    .map(([category]) => category);
}

export function buildBasicSummary(result: AnalysisResult): BasicSummary {
  const { ingredients, summary, conflicts } = result;
  const line = onePercentLine(ingredients);
  const fully = summary.total > 0 && summary.recognized >= summary.total;
  const categories = focusAreas(ingredients, line);

  // ── verdict ──
  const isSpf = summary.spfFilters > 0;
  const isCleanser = !isSpf && ingredients.slice(0, 5).some((i) => i.category === "surfactant");
  const restFocus = categories
    .filter((c) => !(isSpf && c === "uv-filter") && !(isCleanser && c === "surfactant"))
    .slice(0, MAX_FOCUS)
    .map((c) => FOCUS[c]);
  const accent = restFocus.length ? ` с акцентом на ${joinRu(restFocus)}` : "";

  let verdict: string;
  if (ingredients.length === 0) verdict = "Ингредиенты из нашей базы в составе не нашлись";
  else if (isSpf) verdict = `Солнцезащитный состав${accent}`;
  else if (isCleanser) verdict = `Очищающий состав${accent}`;
  else if (restFocus.length) verdict = `Состав${accent}`;
  else verdict = "Состав без выраженной специализации";

  // ── inside ──
  const insideParts: string[] = [];
  const base = ingredients.slice(0, MAX_BASE).map((i) => inPhrase(i.displayName));
  if (base.length) insideParts.push(`Основа состава — ${joinRu(base)}.`);

  const actives = ingredients
    .map((ing, idx) => ({ ing, idx }))
    .filter(({ ing }) => KEY_ACTIVE_CATEGORIES.has(ing.category));
  if (actives.length) {
    const names = actives.slice(0, MAX_ACTIVES).map(({ ing }) => inPhrase(ing.displayName));
    const more = actives.length > MAX_ACTIVES ? ` и ещё ${actives.length - MAX_ACTIVES}` : "";
    insideParts.push(`Главные активы: ${joinRu(names)}${more}.`);
    const tail = line >= 0 ? actives.filter(({ idx }) => idx > line).length : 0;
    if (tail === actives.length) {
      insideParts.push("Все они стоят после консерванта — вероятно, в небольшом количестве.");
    } else if (tail > 0) {
      insideParts.push("Часть из них стоит после консерванта — вероятно, в небольшом количестве.");
    }
  } else if (ingredients.length) {
    insideParts.push("Выраженных активов в распознанной части состава нет.");
  }

  // ── suits ──
  let suits = "";
  if (isSpf) {
    suits = "Может подойти для ежедневной защиты от солнца.";
  } else if (isCleanser) {
    suits = "Может подойти для очищения кожи.";
  } else if (restFocus.length) {
    suits = `Может подойти, если вы ищете средство на ${joinRu(restFocus)}.`;
  }

  // ── caution ──
  const caution: string[] = [];
  if (conflicts.length) {
    caution.push(
      `${conflicts.length} ${plural(conflicts.length, "конфликт", "конфликта", "конфликтов")} активов внутри состава — подробности ниже.`,
    );
  }
  if (hasPhotosensitizer(ingredients.map((i) => i.slug)) && !isSpf) {
    caution.push("Есть компоненты, повышающие чувствительность к солнцу, — утром нужен SPF.");
  }
  if (summary.fragranceAllergens > 0) {
    caution.push(
      `${summary.fragranceAllergens} ${plural(summary.fragranceAllergens, "отдушка-аллерген", "отдушки-аллергена", "отдушек-аллергенов")} из списка ЕС — осторожнее при чувствительной коже.`,
    );
  } else if (summary.fragrances > 0) {
    caution.push("В составе есть отдушка.");
  }
  if (summary.comedogenic > 0) {
    caution.push(
      `${summary.comedogenic} ${plural(summary.comedogenic, "ингредиент", "ингредиента", "ингредиентов")} с опубликованными данными о комедогенности.`,
    );
  }
  if (summary.malassezia > 0) {
    caution.push(
      `${summary.malassezia} ${plural(summary.malassezia, "компонент может", "компонента могут", "компонентов могут")} служить питанием для дрожжей Malassezia.`,
    );
  }
  if (!fully && summary.total > 0) {
    caution.push(
      `Распознано ${summary.recognized} из ${summary.total} компонентов — сводка может быть неполной.`,
    );
  }
  if (caution.length === 0 && fully) {
    caution.push("Конфликтов активов, отдушек и компонентов с данными о комедогенности не нашли.");
  }

  return {
    verdict: capitalize(verdict),
    inside: insideParts.join(" "),
    suits,
    caution: caution.join(" "),
  };
}
