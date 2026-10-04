#!/usr/bin/env python3
"""Подготовка каталога продуктов из полного архива INCIDB Complete (incidb-complete/csv).

Генерирует prisma/incidb-products.data.ts — массив INCIDB_PRODUCTS для
scripts/import-incidb-products.ts: бренд (verbatim из Open Beauty Facts),
название, стабильный slug с суффиксом product_id, категория каталога
(маппинг obf_categories_tags), ссылка на Open Beauty Facts (ODbL-атрибуция)
и состав — slug'и карточек каталога в порядке INCI (только распознанные).

В каталог попадают только продукты с >= 2 распознанными ингредиентами.

Перегенерация: python3 scripts/prepare-incidb-products.py
(после scripts/import-incidb.py — использует его slug-маппинг).
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "incidb-complete" / "csv"
CURATED = ROOT / "prisma" / "ingredients.data.ts"
GENERATED = ROOT / "prisma" / "incidb-ingredients.data.ts"
OUT = ROOT / "prisma" / "incidb-products.data.ts"

MIN_RECOGNIZED = 2

# Не-косметика: исключаем из каталога (аудит 2026-10-04; пример —
# «Vitassium Electrolyte Capsules», product_id 11046)
EXCLUDED_TAGS = re.compile(
    r"(en:(dietary-supplements|beverages|carbonated-drinks|foods|snacks|"
    r"sweet-snacks|plant-based-foods|confectioneries|supplements?|laundry|"
    r"laundry-detergent|dishwashing-liquid|household|medicines?|accessories|"
    r"razors?|razor-blades|couches)\b|fr:liquide-vaisselle|fr:complement-alimentaire|"
    r"fr:tampons-hygieniques|de:waschmittel)\b"
)
# …и по названию (явная не-косметика без информативных тегов)
EXCLUDED_NAMES = re.compile(
    r"\b(lessive|detergent|supplement|vaisselle)\b", re.I
)

# obf tag → категория каталога (lib/seo/product-categories.ts)
TAG_CATEGORY = [
    (re.compile(r"sunscreen|suncare|sun-protection|in-sun-protections|after-sun|creme-solaire"), "spf"),
    (re.compile(r"peeling|exfoliant|face-scrub|scrub"), "peeling"),
    (re.compile(r"mask"), "mask"),
    (re.compile(r"serum|elixir|ampoule|concentrate"), "serum"),
    (re.compile(r"toner|tonic|toning|face-mist|essence|gesichtswasser"), "toner"),
    (re.compile(r"cleanser|cleansing|face-wash|micellar|micellaire|nettoyant|makeup-remover|makeup-removing"), "cleanser"),
    (re.compile(r"treatment|acne|spot|blemish|anti-imperfection|patch|lip-balms|lippenpflege"), "treatment"),
    (re.compile(r"cream|moisturiz|lotion|balm|emulsion|gel-cream|night-care|day-care|eye-care|face-care|face care|body-care|hand-care|handverzorging|skin-care|skin care|skincare|cuidados-com-a-pele|facial|body-milks|body-oils|body-powders|baby-oil|petroleum-jelly|anti-aging|contours-des-yeux|soin-visage|hidratante|hudsalva|huidverzorging|babyverzorging"), "cream"),
    (re.compile(r"shampoo|shampoing|conditioner|condicionador|hair|coiffant|styling|coloration|colourant|haarspülung|haarspray|spülung|haarpflege|developer|cuidados-com-os-cabelos"), "hair"),
    (re.compile(r"soap|shower|toothpast|mouthwash|deodorant|anti-perspirant|antiperspirant|wipes|lingettes|shaving|rasierschaum|rasiergel|hygiene|intimate|bath|badezusatz|body-wash|hand-?wash|handzeep|baño|geles?-de-ducha|duschschaum|dentifrici?o|zahnpasta|enjuague-bucal|tandpasta|tandvlees|mondverzorging|sapone|savon|bagnoschiuma|duschbad|sabonete|mundwasser|mundspülung|body-gels|depilacao"), "hygiene"),
    (re.compile(r"makeup|make-up|mascara|lipstick|lip-makeup|nail|nagellackentferner|foundation|concealer|eyes-makeup|face-makeup|eyeshadow"), "makeup"),
    (re.compile(r"perfume|eau-de-toilette|eau-de-parfum|fragrance|profumo"), "perfume"),
]

# фолбэк по названию продукта, если теги не сработали
# (en/de/fr/es/it/ru; аудит 2026-10-04: цель — «other» < 15%)
NAME_CATEGORY = [
    (re.compile(r"\bspf\s?\d|sunscreen|sun cream|sun milk|sun lotion|sonnencreme|sonnenmilch|crème solaire|protector solar|солнцезащит", re.I), "spf"),
    (re.compile(r"peeling|exfoliat|scrub|gommage|пилинг|скраб", re.I), "peeling"),
    (re.compile(r"\bmask\b|masque|maske|mascarilla|маска", re.I), "mask"),
    (re.compile(r"serum|sérum|ampoule|сыворотка", re.I), "serum"),
    (re.compile(r"toner|tonic|tonique|tonico|mist\b|тоник", re.I), "toner"),
    (re.compile(r"cleans(er|ing)|nettoyant|micellar|micellaire|face wash|wash gel|gel lavant|reinigung|limpieza|пенка|гель для умывания|мицелляр", re.I), "cleanser"),
    (re.compile(r"shampoo|shampoing|conditioner|après-shampoo|hair mask|haarspülung|haarkur|champú|acondicionador|coloration|colourant|hair colou?r|styling|pomade|laque|шампунь|кондиционер", re.I), "hair"),
    (re.compile(r"toothpast|dentifrice|dentifricio|mouthwash|deodorant|desodorante|déodorant|anti-?transpirant|déo\b|deo\b|roll-?on|sanitizer|soap\b|sapone|savon|seife|shower|douche|dusch|ducha|\bbath\b|baño|zahnpasta|jabón|lingettes|wipes|\bwash\b|washing|depila|гель для душа|зубная паста|дезодорант|мыло", re.I), "hygiene"),
    (re.compile(r"mascara|lipstick|nail|foundation|concealer|eyeshadow|make-?up|bb cream|cc cream|maquill|\bbrow\b|eye-?liner|gloss|blush|тушь|помада|лак для ногтей|тональн", re.I), "makeup"),
    (re.compile(r"parfum|eau de toilette|eau de parfum|perfume|парфюм|туалетная вода", re.I), "perfume"),
    (re.compile(r"cream|creme|crème|moisturiz|moisturis|lotion|balm|balsam|baume|milk\b|butter|oil\b|huile|körperlotion|gesichtscreme|lait\b|crema|leche corporal|corporal|liniment|hidratante|krem\b|крем|бальзам|лосьон|молочко", re.I), "cream"),
]


def normalize_brand(raw: str, canon: dict[str, Counter]) -> str:
    """Первый бренд из списка через запятую; группировка без учёта регистра и
    пробелов по краям; отображаемое написание — самое частое в группе."""
    first = raw.split(",")[0].strip()
    if not first:
        return ""
    key = first.lower()
    canon.setdefault(key, Counter())[first] += 1
    return key


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return s.strip("-")


def parse_slug_map(path: Path) -> dict[str, str]:
    """inciName (upper) → slug из data-файла."""
    text = path.read_text(encoding="utf-8")
    incis = re.findall(r'inciName: "((?:[^"\\]|\\.)*)"', text)
    slugs = re.findall(r'\n    slug: "((?:[^"\\]|\\.)*)"', text)
    out = {}
    for inci, slug in zip(incis, slugs):
        out[json.loads(f'"{inci}"').upper()] = json.loads(f'"{slug}"')
    return out


def categorize(tags: str, name: str) -> str:
    t = " " + (tags or "").lower().replace(";", " ").replace("en:", "") + " "
    for rx, cat in TAG_CATEGORY:
        if rx.search(t):
            return cat
    for rx, cat in NAME_CATEGORY:
        if rx.search(name):
            return cat
    return "other"


def ts_string(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def main() -> int:
    # курируемые карточки приоритетнее импортированных (порядок слияния это даёт)
    slug_by_inci = {**parse_slug_map(GENERATED), **parse_slug_map(CURATED)}

    brands = {}
    for r in csv.DictReader(open(CSV / "brands.csv", encoding="utf-8"), delimiter="|"):
        brands[r["brand_id"]] = r["name"]

    ing_slug: dict[str, str] = {}
    ing_name: dict[str, str] = {}
    for r in csv.DictReader(open(CSV / "ingredients.csv", encoding="utf-8"), delimiter="|"):
        inci = r["inci_name"]
        ing_name[r["ingredient_id"]] = inci
        slug = slug_by_inci.get(re.sub(r"\s+", " ", inci.upper()))
        if slug:
            ing_slug[r["ingredient_id"]] = slug

    comp: dict[str, list[tuple[int, str]]] = {}
    total_rows: Counter[str] = Counter()  # все строки product_ingredients (полнота состава)
    for r in csv.DictReader(open(CSV / "product_ingredients.csv", encoding="utf-8"), delimiter="|"):
        total_rows[r["product_id"]] += 1
        slug = ing_slug.get(r["ingredient_id"])
        if slug:
            comp.setdefault(r["product_id"], []).append((int(r["position_index"]), slug))

    rows = list(csv.DictReader(open(CSV / "products.csv", encoding="utf-8"), delimiter="|"))

    # первый проход — нормализация брендов: первый бренд до запятой, группировка
    # без учёта регистра, отображаемое написание = самое частое в группе
    canon: dict[str, Counter] = {}
    for r in rows:
        normalize_brand(brands.get(r["brand_id"]) or "", canon)
    brand_display = {k: c.most_common(1)[0][0] for k, c in canon.items()}

    items = []
    cats: Counter[str] = Counter()
    skipped = 0
    excluded_noncosmetic = 0
    for r in rows:
        if EXCLUDED_TAGS.search(r["obf_categories_tags"] or "") or EXCLUDED_NAMES.search(r["name"] or ""):
            excluded_noncosmetic += 1
            continue
        pairs = sorted(comp.get(r["product_id"], []))
        # уникальные slug'и с ИСХОДНЫМИ позициями этикетки (position_index);
        # дубль slug'а сломает @@unique(productId, ingredientId) — оставляем первую позицию
        seen: set[str] = set()
        entries: list[tuple[str, int]] = []
        for pos, s in pairs:
            if s not in seen:
                seen.add(s)
                entries.append((s, pos))
        if len(entries) < MIN_RECOGNIZED:
            skipped += 1
            continue
        name = re.sub(r"\s+", " ", r["name"]).strip()
        raw_brand = (brands.get(r["brand_id"]) or "").strip()
        brand = brand_display.get(raw_brand.split(",")[0].strip().lower(), "") if raw_brand else ""
        base = slugify(f"{brand} {name}" if brand else name)[:60].strip("-") or "product"
        prod_slug = f"{base}-{r['product_id']}"
        raw = (r["raw_ingredient_text"] or "").strip() or None
        items.append(
            {
                "brand": brand or "Без бренда",
                "name": name,
                "slug": prod_slug,
                "category": categorize(r["obf_categories_tags"], name),
                "sourceUrl": f"https://world.openbeautyfacts.org/product/{r['barcode_ean']}",
                "rawIngredients": raw,
                "ingredientsTotal": total_rows[r["product_id"]],
                "ingredientsRecognized": len(entries),
                "ingredients": entries,
            }
        )
        cats[items[-1]["category"]] += 1

    lines = [
        "/**",
        " * АВТОГЕНЕРИРОВАНО — scripts/prepare-incidb-products.py. Не править вручную.",
        " *",
        " * Каталог продуктов из INCIDB Complete (снимок 2026.09; данные составов",
        " * © Open Beauty Facts contributors, ODbL v1.0 — sourceUrl ведёт на карточку OBF).",
        " * Состав — slug'и карточек каталога с ИСХОДНЫМИ позициями этикетки",
        " * (position_index источника, без перенумерации); rawIngredients — verbatim-текст",
        " * объявления; ingredientsTotal/ingredientsRecognized — полнота распознавания.",
        " * Импорт в БД: pnpm exec tsx scripts/import-incidb-products.ts",
        " */",
        "",
        "export interface IncidbProductSeed {",
        "  brand: string;",
        "  name: string;",
        "  slug: string;",
        "  category: string;",
        "  sourceUrl?: string;",
        "  rawIngredients?: string;",
        "  ingredientsTotal: number;",
        "  ingredientsRecognized: number;",
        "  ingredients: Array<{ slug: string; position: number }>;",
        "}",
        "",
        "export const INCIDB_PRODUCTS: IncidbProductSeed[] = [",
    ]
    for it in items:
        entries = ", ".join(f"{{ slug: {ts_string(s)}, position: {p} }}" for s, p in it["ingredients"])
        lines.append("  {")
        lines.append(f"    brand: {ts_string(it['brand'])},")
        lines.append(f"    name: {ts_string(it['name'])},")
        lines.append(f"    slug: {ts_string(it['slug'])},")
        lines.append(f"    category: {ts_string(it['category'])},")
        lines.append(f"    sourceUrl: {ts_string(it['sourceUrl'])},")
        if it["rawIngredients"]:
            lines.append(f"    rawIngredients: {ts_string(it['rawIngredients'])},")
        lines.append(f"    ingredientsTotal: {it['ingredientsTotal']},")
        lines.append(f"    ingredientsRecognized: {it['ingredientsRecognized']},")
        lines.append(f"    ingredients: [{entries}],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")

    print(f"Продуктов в каталоге: {len(items)} (пропущено без распознанного состава: {skipped}, исключено не-косметики: {excluded_noncosmetic})")
    print("Категории:", dict(cats.most_common()))
    if items:
        other = cats.get("other", 0)
        print(f"Доля «other»: {other}/{len(items)} ({other / len(items) * 100:.1f}%) — цель <15%")
    # полнота распознавания: аудитные пороги 25% / 50% / 80%
    low25 = sum(1 for it in items if it["ingredientsTotal"] and it["ingredientsRecognized"] / it["ingredientsTotal"] < 0.25)
    low50 = sum(1 for it in items if it["ingredientsTotal"] and it["ingredientsRecognized"] / it["ingredientsTotal"] < 0.5)
    low80 = sum(1 for it in items if it["ingredientsTotal"] and it["ingredientsRecognized"] / it["ingredientsTotal"] < 0.8)
    print(f"Полнота состава: <25% — {low25}, <50% (noindex) — {low50}, <80% (баннер) — {low80}")
    print(f"Файл: {OUT} ({OUT.stat().st_size / 1e6:.1f} МБ)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
