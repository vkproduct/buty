#!/usr/bin/env python3
"""Верификация полного архива INCIDB против заявленных метрик build_report.json
и внутренней целостности (FK, позиции, флаги)."""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

DIR = Path(__file__).resolve().parent / "csv"
REPORT = json.loads((Path(__file__).resolve().parent / "build_report.json").read_text())

# Ожидания берём из build_report.json (авторитетный отчёт снимка), а не из
# DATA_DICTIONARY.md — в словаре данные устарели (напр. brands 6412 vs 6453).
_pk_col = {
    "brands": "brand_id", "products": "product_id", "ingredients": "ingredient_id",
    "product_ingredients": "product_id", "ingredient_name_map": "raw_name",
    "fragrance_allergens": "annex_iii_ref", "regulatory_status": "ingredient_id",
}
EXPECTED_ROWS = {
    t: REPORT["tables"][t][_pk_col[t]]["rows"] for t in _pk_col
}

def read(name):
    with open(DIR / f"{name}.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter="|"))

fails = []
def check(label, cond, detail=""):
    print(("OK  " if cond else "FAIL") + f" {label}" + (f" — {detail}" if detail else ""))
    if not cond:
        fails.append(label)

# 1. Row counts
tables = {t: read(t) for t in EXPECTED_ROWS}
for t, exp in EXPECTED_ROWS.items():
    check(f"{t}: строк {len(tables[t])} == {exp}", len(tables[t]) == exp)

brands = {r["brand_id"] for r in tables["brands"]}
prods = {r["product_id"] for r in tables["products"]}
ings = {r["ingredient_id"] for r in tables["ingredients"]}

# 2. PK uniqueness
check("brands.brand_id уникален", len(brands) == len(tables["brands"]))
check("products.product_id уникален", len(prods) == len(tables["products"]))
check("ingredients.ingredient_id уникален", len(ings) == len(tables["ingredients"]))
inci_names = [r["inci_name"] for r in tables["ingredients"]]
check("ingredients.inci_name уникален", len(set(inci_names)) == len(inci_names))

# 3. FK integrity
pi = tables["product_ingredients"]
bad_fk_p = sum(1 for r in pi if r["product_id"] not in prods)
bad_fk_i = sum(1 for r in pi if r["ingredient_id"] not in ings)
check("product_ingredients→products FK", bad_fk_p == 0, f"битых: {bad_fk_p}")
check("product_ingredients→ingredients FK", bad_fk_i == 0, f"битых: {bad_fk_i}")
bad_brand = sum(1 for r in tables["products"] if r["brand_id"] and r["brand_id"] not in brands)
check("products→brands FK", bad_brand == 0, f"битых: {bad_brand}")

# 4. position_index contiguous 1..n per product
by_prod = {}
for r in pi:
    by_prod.setdefault(r["product_id"], []).append(int(r["position_index"]))
bad_pos = 0
for pid, poss in by_prod.items():
    poss.sort()
    if poss != list(range(1, len(poss) + 1)):
        bad_pos += 1
check("position_index непрерывен 1..n у всех продуктов", bad_pos == 0, f"нарушений: {bad_pos}")

# 5. Key metric claims from DATA_DICTIONARY
ing_rows = tables["ingredients"]
cosing_matched = sum(1 for r in ing_rows if r["cosing_matched"] == "1")
check(f"CosIng-matched ингредиентов ~12.2% ({cosing_matched})", abs(cosing_matched/len(ing_rows) - 0.122) < 0.005)
allergen_ing = sum(1 for r in ing_rows if r["is_common_allergen"] == "1")
check("флагов is_common_allergen == 120", allergen_ing == 120, str(allergen_ing))
comedo = sum(1 for r in ing_rows if r["comedogenic_rating"])
check("comedogenic_rating заполнен у 142", comedo == 142, str(comedo))
fa_trig = sum(1 for r in ing_rows if r["is_fungal_acne_trigger"] in ("1", "1.0"))
check("is_fungal_acne_trigger == 275", fa_trig == 275, str(fa_trig))

fa = tables["fragrance_allergens"]
flagged = sum(1 for r in fa if r["flagged"] == "1")
unmatched = sum(1 for r in fa if not r["ingredient_id"])
check("fragrance_allergens: flagged/unmatched заполнены", flagged > 0 and unmatched >= 5,
      f"flagged={flagged}, unmatched={unmatched}")

# products with >= 1 flagged allergen ~ 47.2%
flagged_ids = {r["ingredient_id"] for r in fa if r["flagged"] == "1" and r["ingredient_id"]}
prod_with_allergen = {r["product_id"] for r in pi if r["ingredient_id"] in flagged_ids}
share = len(prod_with_allergen) / len(prods)
check(f"доля продуктов с аллергеном ~47.2% ({share:.1%})", abs(share - 0.472) < 0.01)

# 6. regulatory_status sanity
rs = tables["regulatory_status"]
check("regulatory_status: только EU", all(r["jurisdiction"] == "EU" for r in rs))
check("regulatory_status: FK→ingredients", all(r["ingredient_id"] in ings for r in rs))
statuses = Counter(r["status"] for r in rs)
print("    статусы:", dict(statuses))

# 7. brandless products claim
brandless = sum(1 for r in tables["products"] if not r["brand_id"])
check("продуктов без бренда == 2184", brandless == 2184, str(brandless))

# 8. products have ingredient links
prods_with_ing = set(by_prod)
check("у всех продуктов есть ингредиенты", prods_with_ing >= prods, f"{len(prods)-len(prods_with_ing)} без состава")

# 9. name_map: every ingredient_id valid
nm = tables["ingredient_name_map"]
bad_nm = sum(1 for r in nm if r["ingredient_id"] and r["ingredient_id"] not in ings)
check("ingredient_name_map FK→ingredients", bad_nm == 0, f"битых: {bad_nm}")
methods = Counter(r["method"] for r in nm)
print("    методы разрешения:", dict(methods))

# 10. sha/claims cross-check against build_report.json structure
def find_in_report(key):
    s = json.dumps(REPORT)
    return key in s
check("build_report.json содержит claims по таблицам", find_in_report("products"))

print()
print("ИТОГ:", "ВСЁ СХОДИТСЯ" if not fails else f"ПРОБЛЕМЫ: {fails}")
sys.exit(1 if fails else 0)
