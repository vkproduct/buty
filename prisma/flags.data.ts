/**
 * Безопасностные флаги ингредиентов: «комедогенно», «кормит малассезию»,
 * «аллерген-отдушка».
 *
 * Хранятся отдельно от карточек (ingredients.data.ts) и подтягиваются по slug
 * при сиде — так не нужно трогать 281 карточку, а флаги остаются
 * редактируемым списком.
 *
 * Критерии — строже, чем у конкурентов:
 * - comedogenic: только там, где есть опубликованные данные о комедогенности
 *   (классика жанра — тесты Kligman на кроличьем ухе 1970–80-х + поздние
 *   подтверждения). Ингредиенты с противоречивыми или только анекдотическими
 *   оценками (ланолин, масла авокадо/оливы и т.п.) НЕ получают флаг.
 * - feedsMalassezia: субстраты Malassezia furfur по данным исследований роста
 *   дрожжей (эфиры жирных кислот C11–C24, масла, богатые олеиновой/
 *   пальмитиновой кислотами). Спорные случаи (арган, ши, сквалан,
 *   каприлик/каприк триглицериды) остаются без флага.
 * - fragranceAllergen: компоненты из списка 26 декларируемых отдушечных
 *   аллергенов ЕС + «parfum» как общий случай.
 */

export interface IngredientFlags {
  comedogenic?: boolean;
  feedsMalassezia?: boolean;
  fragranceAllergen?: boolean;
}

export const INGREDIENT_FLAGS: Record<string, IngredientFlags> = {
  // ─── КОМЕДОГЕННЫЕ (опубликованные данные, классика — кроличье ухо) ────────
  "isopropyl-myristate": { comedogenic: true, feedsMalassezia: true },
  "acetylated-glycol-stearate": { comedogenic: true },
  "ethylhexyl-palmitate": { comedogenic: true, feedsMalassezia: true },
  "coconut-oil": { comedogenic: true, feedsMalassezia: true },
  "cocoa-butter": { comedogenic: true, feedsMalassezia: true },

  // ─── КОРМЯТ MALASSEZIA (масла и эфиры — субстраты дрожжей) ────────────────
  "cocos-nucifera-fruit-extract": { feedsMalassezia: true },
  "olive-oil": { feedsMalassezia: true },
  "sweet-almond-oil": { feedsMalassezia: true },
  "avocado-oil": { feedsMalassezia: true },
  "macadamia-integrifolia-seed-oil": { feedsMalassezia: true },

  // ─── АЛЛЕРГЕНЫ-ОТДУШКИ (список ЕС, 26 декларируемых) ─────────────────────
  parfum: { fragranceAllergen: true },
  "benzyl-alcohol": { fragranceAllergen: true },
  "benzyl-salicylate": { fragranceAllergen: true },
  citral: { fragranceAllergen: true },
  citronellol: { fragranceAllergen: true },
  coumarin: { fragranceAllergen: true },
  eugenol: { fragranceAllergen: true },
  farnesol: { fragranceAllergen: true },
  geraniol: { fragranceAllergen: true },
  "hexyl-cinnamal": { fragranceAllergen: true },
  limonene: { fragranceAllergen: true },
  linalool: { fragranceAllergen: true },
};
