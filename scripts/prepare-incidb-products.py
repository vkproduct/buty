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

# obf tag → категория каталога (lib/seo/product-categories.ts)
TAG_CATEGORY = [
    (re.compile(r"sunscreen|suncare|sun-protection|in-sun-protections|after-sun"), "spf"),
    (re.compile(r"peeling|exfoliant|face-scrub|scrub"), "peeling"),
    (re.compile(r"mask"), "mask"),
    (re.compile(r"serum|elixir|ampoule|concentrate"), "serum"),
    (re.compile(r"toner|tonic|toning|face-mist|essence"), "toner"),
    (re.compile(r"cleanser|cleansing|face-wash|micellar|makeup-remover|makeup-removing"), "cleanser"),
    (re.compile(r"treatment|acne|spot|blemish|anti-imperfection|patch|lip-balms"), "treatment"),
    (re.compile(r"cream|moisturiz|lotion|balm|emulsion|gel-cream|night-care|day-care|eye-care|face-care|face care|body-care|hand-care|skin-care|skin care|facial|body-milks|body-oils|anti-aging"), "cream"),
    (re.compile(r"shampoo|conditioner|hair|coiffant|styling"), "hair"),
    (re.compile(r"soap|shower|toothpast|mouthwash|deodorant|anti-perspirant|antiperspirant|wipes|shaving|hygiene|intimate|bath"), "hygiene"),
    (re.compile(r"makeup|make-up|mascara|lipstick|lip-makeup|nail|foundation|concealer|eyes-makeup|face-makeup|eyeshadow"), "makeup"),
    (re.compile(r"perfume|eau-de-toilette|eau-de-parfum|fragrance"), "perfume"),
]

# фолбэк по названию продукта, если теги не сработали
NAME_CATEGORY = [
    (re.compile(r"\bspf\s?\d|sunscreen|sun cream|sun milk|sun lotion", re.I), "spf"),
    (re.compile(r"peeling|exfoliat|scrub", re.I), "peeling"),
    (re.compile(r"\bmask\b|masque", re.I), "mask"),
    (re.compile(r"serum|sérum|ampoule", re.I), "serum"),
    (re.compile(r"toner|tonic|tonique|mist\b", re.I), "toner"),
    (re.compile(r"cleans(er|ing)|micellar|face wash|wash gel|gel lavant", re.I), "cleanser"),
    (re.compile(r"shampoo|conditioner|après-shampoo|hair mask", re.I), "hair"),
    (re.compile(r"toothpast|dentifrice|mouthwash|deodorant|déo\b|soap\b|savon|shower|douche|bath", re.I), "hygiene"),
    (re.compile(r"mascara|lipstick|nail|foundation|concealer|eyeshadow|make-?up|bb cream|cc cream", re.I), "makeup"),
    (re.compile(r"parfum|eau de toilette|eau de parfum|perfume", re.I), "perfume"),
    (re.compile(r"cream|creme|crème|moisturiz|lotion|balm|baume|milk\b|butter|oil\b|huile", re.I), "cream"),
]


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
    for r in csv.DictReader(open(CSV / "product_ingredients.csv", encoding="utf-8"), delimiter="|"):
        slug = ing_slug.get(r["ingredient_id"])
        if slug:
            comp.setdefault(r["product_id"], []).append((int(r["position_index"]), slug))

    items = []
    cats: Counter[str] = Counter()
    skipped = 0
    for r in csv.DictReader(open(CSV / "products.csv", encoding="utf-8"), delimiter="|"):
        pairs = sorted(comp.get(r["product_id"], []))
        # уникальные slug'и в порядке позиций (дубль slug'а сломает @@unique(productId, ingredientId))
        seen: set[str] = set()
        slugs = []
        for _, s in pairs:
            if s not in seen:
                seen.add(s)
                slugs.append(s)
        if len(slugs) < MIN_RECOGNIZED:
            skipped += 1
            continue
        name = re.sub(r"\s+", " ", r["name"]).strip()
        brand = (brands.get(r["brand_id"]) or "").strip()
        base = slugify(f"{brand} {name}" if brand else name)[:60].strip("-") or "product"
        slug = f"{base}-{r['product_id']}"
        items.append(
            {
                "brand": brand or "Без бренда",
                "name": name,
                "slug": slug,
                "category": categorize(r["obf_categories_tags"], name),
                "sourceUrl": f"https://world.openbeautyfacts.org/product/{r['barcode_ean']}",
                "ingredients": slugs,
            }
        )
        cats[items[-1]["category"]] += 1

    lines = [
        "/**",
        " * АВТОГЕНЕРИРОВАНО — scripts/prepare-incidb-products.py. Не править вручную.",
        " *",
        " * Каталог продуктов из INCIDB Complete (снимок 2026.09; данные составов",
        " * © Open Beauty Facts contributors, ODbL v1.0 — sourceUrl ведёт на карточку OBF).",
        " * Состав — slug'и карточек каталога в порядке INCI, только распознанные",
        " * (полный список токенов — в исходном архиве, products.raw_ingredient_text).",
        " * Импорт в БД: pnpm exec tsx scripts/import-incidb-products.ts",
        " */",
        "",
        "export interface IncidbProductSeed {",
        "  brand: string;",
        "  name: string;",
        "  slug: string;",
        "  category: string;",
        "  sourceUrl?: string;",
        "  ingredients: string[];",
        "}",
        "",
        "export const INCIDB_PRODUCTS: IncidbProductSeed[] = [",
    ]
    for it in items:
        syns = ", ".join(ts_string(s) for s in it["ingredients"])
        lines.append("  {")
        lines.append(f"    brand: {ts_string(it['brand'])},")
        lines.append(f"    name: {ts_string(it['name'])},")
        lines.append(f"    slug: {ts_string(it['slug'])},")
        lines.append(f"    category: {ts_string(it['category'])},")
        lines.append(f"    sourceUrl: {ts_string(it['sourceUrl'])},")
        lines.append(f"    ingredients: [{syns}],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")

    print(f"Продуктов в каталоге: {len(items)} (пропущено без распознанного состава: {skipped})")
    print("Категории:", dict(cats.most_common()))
    print(f"Файл: {OUT} ({OUT.stat().st_size / 1e6:.1f} МБ)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
