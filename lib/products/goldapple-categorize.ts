import { PRODUCT_CATEGORY_ORDER } from "@/lib/seo/product-categories";

export type GoldappleCategory = (typeof PRODUCT_CATEGORY_ORDER)[number];

interface CategoryRule {
  category: GoldappleCategory;
  /** Подстроки названия (без бренда, нижний регистр). */
  keywords: string[];
}

/**
 * Правила категоризации каталога goldapple. Порядок важен: возвращается
 * категория первого сработавшего правила (правила проверяются по очереди).
 */
const RULES: CategoryRule[] = [
  {
    category: "perfume",
    keywords: ["парфюм", "туалетная вода", "духи", "eau de", "edp", "edt", "parfum"],
  },
  {
    category: "spf",
    keywords: ["spf", "солнцезащит", "sunscreen", "sun cream", "загар"],
  },
  {
    category: "makeup",
    keywords: [
      "помад", "lipstick", "тушь", "mascara", "тональн", "foundation",
      "консил", "concealer", "пудр", "powder", "румян", "blush", "тени",
      "eyeshadow", "карандаш", "pencil", "подводк", "liner", "хайлайт",
      "highlight", "праймер", "primer", "блеск для губ", "gloss", "бронз",
      "лак для ногтей", "nail",
    ],
  },
  {
    category: "hair",
    keywords: [
      "шампун", "shampoo", "кондиционер", "conditioner", "для волос",
      "hair", "ополаскив", "краска", "окрашив",
    ],
  },
  {
    category: "hygiene",
    keywords: [
      "гель для душа", "shower", "мыло", "soap", "дезодор", "deodorant",
      "антиперспир", "зубн", "toothpaste", "интим",
    ],
  },
  {
    category: "cleanser",
    keywords: ["умыван", "пенка", "очищ", "cleans", "foam", "мицелляр", "micellar", "гидрофильн"],
  },
  {
    category: "peeling",
    keywords: ["пилинг", "peel", "скраб", "scrub", "эксфол", "exfol", "гоммаж"],
  },
  {
    category: "mask",
    keywords: ["маск", "mask", "патч", "patch"],
  },
  {
    category: "serum",
    keywords: ["сыворот", "serum", "ампул", "ampoule", "эссенц"],
  },
  {
    category: "toner",
    keywords: ["тоник", "тонер", "toner"],
  },
  {
    category: "cream",
    keywords: [
      "крем", "cream", "флюид", "fluid", "эмульс", "лосьон", "lotion",
      "молочко", "баттер", "butter", "бальзам", "balm",
    ],
  },
];

/**
 * Категория продукта goldapple по названию без бренда (нижний регистр)
 * и флагам. Флаг `fragrance` (парфюм) имеет приоритет над всеми правилами.
 * Правила проверяются по порядку; по умолчанию — `other`.
 */
export function categorizeGoldapple(nameWithoutBrand: string, flags: string): GoldappleCategory {
  const name = nameWithoutBrand.toLowerCase();
  const flagSet = new Set(
    flags
      .split(";")
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean),
  );
  if (flagSet.has("fragrance")) return "perfume";
  for (const rule of RULES) {
    if (rule.keywords.some((k) => name.includes(k))) return rule.category;
  }
  return "other";
}
