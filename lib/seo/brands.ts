/**
 * «Бренды» — так их ищут в Яндексе («миксит состав», «виши состав»).
 * Ключи словаря сравниваются через brandKey: «l'oreal paris» и «L'Oréal Paris» —
 * один ключ. Кириллические бренды не переводим.
 */
import { brandKey } from "@/lib/products/brand-canonical";

const BRAND_RU: Record<string, string> = {
  "the ordinary": "Зе Ординари",
  cerave: "Цераве",
  "la roche-posay": "Ля Рош-Позе",
  vichy: "Виши",
  uriage: "Урьяж",
  "paula's choice": "Пола Чойс",
  cosrx: "Косрикс",
  bioderma: "Биодерма",
  avene: "Авен",
  "avène": "Авен",
  mixit: "Миксит",
  aravia: "Аравия",
  "aravia laboratories": "Аравия",
  "aravia professional": "Аравия",
  librederm: "Либридерм",
  angiopharm: "Ангиофарм",
  geltek: "Гельтек",
  vois: "Войс",
  "art&fact": "Арт энд Факт",
  "art & fact": "Арт энд Факт",
  "beauty of joseon": "Бьюти оф Чосон",
  "some by mi": "Сам бай ми",
  "round lab": "Раунд Лаб",
  "skin1004": "Скин1004",
  "anua": "Ануа",
  "axis-y": "Аксис-Уай",
  "celimax": "Селимакс",
  "dr.althea": "Доктор Алтея",
  "the act": "Зе Акт",
  "likato": "Ликато",
  "estel": "Эстель",
  "garnier": "Гарньер",
  "l'oreal paris": "Лореаль",
  "nivea": "Нивея",
  "eucerin": "Эуцерин",
  "ducray": "Дюкрей",
  "a-derma": "А-Дерма",
  "svr": "СВР",
  "lador": "Ладор",
  "kerasys": "Керасис",
  "natura siberica": "Натура Сиберика",
  "synergetic": "Синергетик",
  "levrana": "Леврана",
};

// brandKey(BRAND_RU key) → русское написание. Дубли ключей («avene»/«avène»)
// схлопываются: побеждает первая запись.
const BRAND_RU_BY_KEY = new Map<string, string>();
for (const [brand, ru] of Object.entries(BRAND_RU)) {
  const key = brandKey(brand);
  if (!BRAND_RU_BY_KEY.has(key)) BRAND_RU_BY_KEY.set(key, ru);
}

const HAS_CYRILLIC = /[а-яё]/i;

/** Русское написание бренда или null, если оно совпадает с оригиналом / неизвестно. */
export function brandRu(brand: string): string | null {
  // Кириллические бренды не переводим.
  if (HAS_CYRILLIC.test(brand)) return null;
  const ru = BRAND_RU_BY_KEY.get(brandKey(brand));
  return ru && ru.toLowerCase() !== brand.toLowerCase() ? ru : null;
}

/** «Vichy (Виши)» — для title и description. */
export function brandWithRu(brand: string): string {
  const ru = brandRu(brand);
  return ru ? `${brand} (${ru})` : brand;
}
