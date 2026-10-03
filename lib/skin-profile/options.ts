/**
 * Справочник профиля кожи: типы, задачи, особые состояния, аллергены.
 * В базе хранятся стабильные id (а не подписи) — по ним позже сверяются составы.
 * Пользовательские пункты («своё») хранятся как есть, текстом.
 */

export type SkinTypeValue = "dry" | "oily" | "combination" | "normal";

export interface Option {
  id: string;
  label: string;
  hint?: string;
}

export const SKIN_TYPES: (Option & { id: SkinTypeValue })[] = [
  { id: "dry", label: "Сухая", hint: "Стягивает после умывания, бывает шелушение" },
  { id: "oily", label: "Жирная", hint: "К обеду блестит всё лицо, поры заметны" },
  {
    id: "combination",
    label: "Комбинированная",
    hint: "Блестят лоб, нос и подбородок, щёки — нет",
  },
  { id: "normal", label: "Нормальная", hint: "Комфортно весь день, без блеска и стянутости" },
];

export const SKIN_TYPE_VALUES = SKIN_TYPES.map((t) => t.id);

/** Подсказка «Не знаю»: один вопрос — тест через 2–3 часа после умывания. */
export const SKIN_TYPE_QUIZ: { answer: string; type: SkinTypeValue }[] = [
  { answer: "Стягивает, хочется нанести крем", type: "dry" },
  { answer: "Блестят только лоб, нос и подбородок", type: "combination" },
  { answer: "Блестит всё лицо", type: "oily" },
  { answer: "Ничего особенного — комфортно", type: "normal" },
];

export const CONCERN_GROUPS: { title: string; note?: string; options: Option[] }[] = [
  {
    title: "Что хочется улучшить",
    options: [
      { id: "acne", label: "Высыпания и акне" },
      { id: "post-acne", label: "Постакне: пятна и рубцы" },
      { id: "pores", label: "Чёрные точки и поры" },
      { id: "pigmentation", label: "Пигментные пятна" },
      { id: "redness", label: "Покраснения и сосудики" },
      { id: "dehydration", label: "Обезвоженность" },
      { id: "aging", label: "Морщины и упругость" },
      { id: "dullness", label: "Тусклый цвет лица" },
    ],
  },
  {
    title: "Состояния, которые диагностировал врач",
    note: "Отмечайте, только если диагноз ставил дерматолог.",
    options: [
      { id: "rosacea", label: "Розацеа" },
      { id: "atopic", label: "Атопический дерматит / экзема" },
      { id: "perioral", label: "Периоральный дерматит" },
      { id: "seborrheic", label: "Себорейный дерматит" },
    ],
  },
];

export const CONDITIONS: Option[] = [
  {
    id: "pregnancy",
    label: "Беременна или планирую",
    hint: "Отметим ретиноиды и другие нежелательные компоненты",
  },
  {
    id: "breastfeeding",
    label: "Кормлю грудью",
    hint: "Отметим ретиноиды",
  },
  {
    id: "isotretinoin",
    label: "Принимаю изотретиноин",
    hint: "Роаккутан, Акнекутан и аналоги — кожа особенно уязвима",
  },
  {
    id: "rx-retinoids",
    label: "Использую ретиноиды по назначению врача",
    hint: "Третиноин, адапален — учтём при сочетании с кислотами",
  },
];

export type ReactionLevel = "allergy" | "intolerance";

export interface AllergenOption extends Option {
  /** Как обычно проявляется — уровень по умолчанию при выборе. */
  defaultLevel: ReactionLevel;
}

export const ALLERGEN_GROUPS: { title: string; options: AllergenOption[] }[] = [
  {
    title: "Частые аллергены",
    options: [
      { id: "fragrance", label: "Отдушки", hint: "Parfum, Linalool, Limonene…", defaultLevel: "allergy" },
      { id: "essential-oils", label: "Эфирные масла", defaultLevel: "allergy" },
      { id: "mi-mci", label: "Метилизотиазолинон (MI/MCI)", defaultLevel: "allergy" },
      {
        id: "formaldehyde",
        label: "Формальдегид и его доноры",
        hint: "DMDM Hydantoin, Imidazolidinyl Urea…",
        defaultLevel: "allergy",
      },
      { id: "lanolin", label: "Ланолин", defaultLevel: "allergy" },
      {
        id: "uv-filters",
        label: "Органические УФ-фильтры",
        hint: "Октокрилен, оксибензон",
        defaultLevel: "allergy",
      },
      {
        id: "compositae",
        label: "Ромашка, календула, арника",
        hint: "Растения семейства сложноцветных",
        defaultLevel: "allergy",
      },
      { id: "propolis", label: "Прополис и продукты пчеловодства", defaultLevel: "allergy" },
      { id: "capb", label: "Кокамидопропилбетаин", defaultLevel: "allergy" },
      { id: "propylene-glycol", label: "Пропиленгликоль", defaultLevel: "allergy" },
      { id: "parabens", label: "Парабены", defaultLevel: "allergy" },
      { id: "phenoxyethanol", label: "Феноксиэтанол", defaultLevel: "allergy" },
      { id: "nut-oils", label: "Масла орехов", hint: "Миндальное, макадамии…", defaultLevel: "allergy" },
      { id: "salicylates", label: "Аспирин / салицилаты", defaultLevel: "allergy" },
    ],
  },
  {
    title: "Часто раздражают",
    options: [
      { id: "acids", label: "Кислоты AHA/BHA", defaultLevel: "intolerance" },
      { id: "retinoids", label: "Ретиноиды", defaultLevel: "intolerance" },
      { id: "alcohol", label: "Спирт (Alcohol denat.)", defaultLevel: "intolerance" },
      { id: "sulfates", label: "Сульфаты (SLS, SLES)", defaultLevel: "intolerance" },
      { id: "niacinamide", label: "Ниацинамид", defaultLevel: "intolerance" },
      { id: "vitamin-c", label: "Витамин C", hint: "Аскорбиновая кислота", defaultLevel: "intolerance" },
    ],
  },
];

export const ALLERGENS: AllergenOption[] = ALLERGEN_GROUPS.flatMap((g) => g.options);
export const CONCERNS: Option[] = CONCERN_GROUPS.flatMap((g) => g.options);

const LABELS = new Map<string, string>(
  [...SKIN_TYPES, ...CONCERNS, ...CONDITIONS, ...ALLERGENS].map((o) => [o.id, o.label]),
);

/** Подпись по id; для «своих» пунктов возвращает сам текст. */
export function labelFor(id: string): string {
  if (id === "sensitive") return "Чувствительная";
  return LABELS.get(id) ?? id;
}

export const MAX_CUSTOM_LENGTH = 60;

/** Старые подписи из первой версии онбординга → новые id. */
const LEGACY: Record<string, string | string[]> = {
  "Акне и воспаления": "acne",
  "Пигментация": "pigmentation",
  "Морщины и фотостарение": "aging",
  "Обезвоженность": "dehydration",
  "Покраснения и купероз": "redness",
  "Чёрные точки и поры": "pores",
  "Неровный тон": "pigmentation",
  "Атопичность": "atopic",
  "Отдушки / парфюмерные композиции": "fragrance",
  "Эфирные масла": "essential-oils",
  "Химические SPF-фильтры": "uv-filters",
  "Консерванты (феноксиэтанол, MI/MCI)": ["mi-mci", "phenoxyethanol"],
  "Ланолин": "lanolin",
  "Ниацинамид": "niacinamide",
};

export function migrateLegacy(list: string[]): string[] {
  return [...new Set(list.flatMap((v) => LEGACY[v] ?? v))];
}
