#!/usr/bin/env python3
"""Импорт INCI-ингредиентов из INCIDB (https://github.com/INCIDB/cosmetics-skincare-inci-database)
в каталог Buty.

Источник — ПОЛНЫЙ архив INCIDB Complete (снимок 2026.09, купленная доставка,
incidb-complete/csv): 45 584 канонических INCI-имени (5 555 с обогащением CosIng:
функции, CAS/EC, описания, статусы Annex II–VI), рейтинги комедогенности
(Fulton 1989), эвристика грибкового акне, флаги EU-аллергенов.
Плюс публичный список аллергенов ЕС из eu-fragrance-allergens/data.json репозитория.

Что генерирует:
  prisma/incidb-ingredients.data.ts — новые карточки IngredientSeed (только те, которых ещё нет
      в курируемом ingredients.data.ts: сверка по INCI-имени, slug и синонимам);
  prisma/incidb-flags.data.ts — Record<slug, IngredientFlags>: флаги для новых карточек
      и обогащение флагов уже существующих (comedogenic при рейтинге >= 3, fragranceAllergen
      по списку ЕС; feedsMalassezia для курируемых НЕ трогаем — там решения принимаются вручную).

Перегенерация:
  # положить архив INCIDB Complete в incidb-complete/ (csv/*.csv)
  python3 scripts/import-incidb.py
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCIDB = ROOT / "incidb-complete" / "csv"
CURATED = ROOT / "prisma" / "ingredients.data.ts"
CURATED_FLAGS = ROOT / "prisma" / "flags.data.ts"
OUT_INGREDIENTS = ROOT / "prisma" / "incidb-ingredients.data.ts"
OUT_FLAGS = ROOT / "prisma" / "incidb-flags.data.ts"
ALLERGENS_JSON = ROOT / "tmp-incidb" / "eu-fragrance-allergens" / "data.json"

# Перевод значений поля functions CosIng (покрывает полный словарь выборки; неизвестное — как есть)
FUNCTION_RU = {
    "SKIN CONDITIONING": "уход за кожей",
    "SKIN CONDITIONING - EMOLLIENT": "смягчение кожи (эмолент)",
    "SKIN CONDITIONING - MISCELLANEOUS": "уход за кожей",
    "SKIN CONDITIONING - OCCLUSIVE": "окклюзия (удержание влаги)",
    "SKIN CONDITIONING - HUMECTANT": "увлажнение кожи",
    "HUMECTANT": "увлажнитель (гумектант)",
    "EMOLLIENT": "эмолент",
    "VISCOSITY CONTROLLING": "регулирование вязкости",
    "FRAGRANCE": "отдушка",
    "PERFUMING": "придание аромата",
    "MASKING": "маскировка нежелательного запаха",
    "SURFACTANT": "ПАВ",
    "SURFACTANT - CLEANSING": "ПАВ: очищение",
    "SURFACTANT - EMULSIFYING": "ПАВ: эмульгирование",
    "SURFACTANT - FOAMING": "ПАВ: пенообразование",
    "SURFACTANT - SOLUBILIZING": "ПАВ: солюбилизация",
    "SURFACTANT - HYDROTROPE": "ПАВ: гидротроп",
    "CLEANSING": "очищение",
    "FOAMING": "пенообразование",
    "HAIR CONDITIONING": "уход за волосами",
    "HAIR DYEING": "крашение волос",
    "HAIR WAVING OR STRAIGHTENING": "завивка/выпрямление волос",
    "ANTISTATIC": "антистатический эффект",
    "SOLVENT": "растворитель",
    "FILM FORMING": "плёнкообразование",
    "BINDING": "связывающее",
    "EMULSION STABILISING": "стабилизация эмульсии",
    "BUFFERING": "регулирование pH",
    "OPACIFYING": "придание непрозрачности",
    "PRESERVATIVE": "консервант",
    "ORAL CARE": "уход за полостью рта",
    "COLORANT": "краситель",
    "BULKING": "наполнитель",
    "ANTIMICROBIAL": "антимикробное действие",
    "SKIN PROTECTING": "защита кожи",
    "CHELATING": "хелатор (связывание ионов металлов)",
    "ABRASIVE": "абразив",
    "ANTIOXIDANT": "антиоксидант",
    "LIGHT STABILIZER": "фотостабилизатор",
    "ASTRINGENT": "вяжущее действие",
    "ABSORBENT": "абсорбент",
    "DEODORANT": "дезодорирующее действие",
    "UV ABSORBER": "УФ-поглотитель",
    "UV FILTER": "УФ-фильтр",
    "TONIC": "тонизирующее действие",
    "ANTICAKING": "антислеживающее",
    "DENATURANT": "денатурирующее",
    "SOOTHING": "успокаивающее действие",
    "ANTIFOAMING": "пеногашение",
    "PLASTICISER": "пластификатор",
    "EMULSIFYING": "эмульгирование",
    "TANNING": "загар",
    "NAIL CONDITIONING": "уход за ногтями",
    "BLEACHING": "осветление",
    "REDUCING": "восстановитель",
    "OXIDISING": "окислитель",
    "HUMECTANT?": "увлажнитель",
    # полный архив INCIDB Complete 2026.09 (77 значений, покрытие 100%)
    "SURFACTANT - FOAM BOOSTING": "ПАВ: усиление пены",
    "HAIR FIXING": "фиксация причёски",
    "MOISTURISING": "увлажнение",
    "FLAVOURING": "ароматизатор (для средств полости рта)",
    "ANTI-SEBORRHEIC": "противосеборейное действие",
    "SMOOTHING": "сглаживание",
    "ANTI-SEBUM": "регулирование себума",
    "REFRESHING": "освежающее действие",
    "NOT REPORTED": "функция не указана (CosIng)",
    "ANTIPLAQUE": "против зубного налёта",
    "KERATOLYTIC": "кератолитик (отшелушивание)",
    "GEL FORMING": "гелеобразование",
    "DEPILATORY": "депилятор",
    "ANTIPERSPIRANT": "антиперспирант",
    "ANTICORROSIVE": "антикоррозийное",
    "REFATTING": "восстановление липидного слоя",
    "PROPELLANT": "пропеллент",
    "EXFOLIATING": "эксфолиант",
    "SLIP MODIFIER": "модификатор скольжения",
    "SURFACTANT - DISPERSING": "ПАВ: диспергирование",
    "PH ADJUSTERS": "регулирование pH",
    "DISPERSING NON-SURFACTANT": "диспергатор (не-ПАВ)",
    "DETANGLING": "облегчение расчёсывания",
    "SURFACE MODIFIER": "модификатор поверхности",
    "EPILATING": "эпилятор",
}

ACRONYMS = {
    "CI", "PEG", "PPG", "BHT", "BHA", "EDTA", "PVP", "DMDM", "TEA", "DEA",
    "AMP", "AHA", "BHA", "SPF", "DNA", "RNA", "PVM", "MA", "VA",
}

BOTANICAL_RE = re.compile(
    r"(EXTRACT|\bOIL\b|BUTTER|\bWAX\b|LEAF|FLOWER|FRUIT|SEED|PEEL|ROOT|JUICE|BARK|HERB|WOOD|BUD|BULB|STEM|TWIG|POWDER|MILK|NECTAR|RESIN|GUM|WATER)"
)

FATTY_ALCOHOL_RE = re.compile(
    r"^(CETEARYL|CETYL|STEARYL|LAURYL|BEHENYL|ARACHIDYL|MYRISTYL|OLEYL|ISOSTEARYL|CETOSTEARYL)\s+ALCOHOL"
)

# Известная дыра снимка INCIDB 2026.09: этих консервантов нет в
# regulatory_status.csv, хотя они числятся в Annex V/12 (CosIng Annex V export,
# запись 12 — parabens). Для них берём ссылку из cosing_restriction и пишем
# её вручную заданным текстом. Источник: CosIng Annex V, запись 12.
MISSING_ANNEX_V12 = {
    "METHYLPARABEN",
    "ETHYLPARABEN",
    "SODIUM METHYLPARABEN",
    "SODIUM ETHYLPARABEN",
}

ANNEX_ROLE_RU = {"IV": "краситель", "V": "консервант", "VI": "УФ-фильтр"}

# Перенос оценок комедогенности Fulton 1989 с бытовых имён (cosing_matched=0)
# на INCI-формы. Рейтинг берётся из ingredients.csv по ИСХОДНОМУ имени;
# перенос — только если целевое INCI есть в ingredients.csv с cosing_matched=1
# и без собственной оценки. IRON OXIDES и CHAMOMILE EXTRACT намеренно
# отсутствуют: однозначного INCI нет — выводятся в отчёт.
FULTON_TRANSFER = [
    ("AVOCADO OIL", "PERSEA GRATISSIMA OIL"),
    ("COCOA BUTTER", "THEOBROMA CACAO SEED BUTTER"),
    ("CORN OIL", "ZEA MAYS GERM OIL"),
    ("EVENING PRIMROSE OIL", "OENOTHERA BIENNIS OIL"),
    ("SESAME OIL", "SESAMUM INDICUM SEED OIL"),
    ("SOYBEAN OIL", "GLYCINE SOJA OIL"),
    ("ALMOND OIL", "PRUNUS AMYGDALUS DULCIS OIL"),
    ("APRICOT KERNEL OIL", "PRUNUS ARMENIACA KERNEL OIL"),
    ("OLIVE OIL", "OLEA EUROPAEA FRUIT OIL"),
    ("BABASSU OIL", "ORBIGNYA OLEIFERA SEED OIL"),
    ("CASTOR OIL", "RICINUS COMMUNIS SEED OIL"),
    ("CARNAUBA WAX", "COPERNICIA CERIFERA CERA"),
    ("CANDELILLA WAX", "EUPHORBIA CERIFERA CERA"),
    ("CARBOMER 940", "CARBOMER"),
    ("POLYETHYLENE GLYCOL 400", "PEG-8"),
    ("SUNFLOWER OIL", "HELIANTHUS ANNUUS SEED OIL"),
    ("SAFFLOWER OIL", "CARTHAMUS TINCTORIUS SEED OIL"),
    ("CERESIN WAX", "CERESIN"),
    ("METHYL PARABEN", "METHYLPARABEN"),
    ("OCTYL METHOXYCINNAMATE", "ETHYLHEXYL METHOXYCINNAMATE"),
    ("OXYBENZONE", "BENZOPHENONE-3"),
    ("CARBOXYMETHYL CELLULOSE", "CELLULOSE GUM"),
    ("CARMINE", "CI 75470"),
]

# Оценки Fulton без однозначного INCI — не переносим, только отчёт
FULTON_UNMAPPED = ["IRON OXIDES", "CHAMOMILE EXTRACT"]

SILICONE_RE = re.compile(r"(SILOXANE|DIMETHICONE|SILICONE|POLYSILSESQUIOXANE|SILSESQUIOXANE|SILICONE)")


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return s.strip("-")


def display_name(inci: str) -> str:
    def fix_token(tok: str) -> str:
        parts = tok.split("-")
        out = []
        for p in parts:
            u = p.upper().rstrip(".")
            if u in ACRONYMS or (u == "CI" ):
                out.append(p.upper())
            elif re.fullmatch(r"[A-Z]{2,5}", p) and u in ACRONYMS:
                out.append(p.upper())
            else:
                out.append(p.capitalize())
        return "-".join(out)

    return " ".join(fix_token(t) for t in inci.split())


def ru_functions(functions: str) -> list[str]:
    out = []
    for f in functions.split(";"):
        f = f.strip()
        if not f:
            continue
        out.append(FUNCTION_RU.get(f, f.lower()))
    return out


def categorize(inci: str, functions: str) -> str:
    f = functions
    fl = f.lower()
    name = inci.upper()
    if "PEPTIDE" in name or "POLYPEPTIDE" in name:
        return "peptide"
    if "uv filter" in fl or "uv absorber" in fl:
        return "uv-filter"
    if "humectant" in fl:
        return "humectant"
    if "surfactant - cleansing" in fl or re.search(r"\bcleansing\b", fl) or "foaming" in fl:
        return "surfactant"
    if "emulsifying" in fl or "emulsion stabilising" in fl:
        return "emulsifier"
    if "preservative" in fl or ("antimicrobial" in fl and "skin conditioning" not in fl):
        return "preservative"
    if "buffering" in fl:
        return "ph-buffer"
    if "fragrance" in fl or "perfuming" in fl or "masking" in fl:
        return "fragrance"
    if "antioxidant" in fl:
        return "antioxidant"
    if SILICONE_RE.search(name):
        return "silicone"
    if re.search(r"\bALCOHOL\b", name) and not FATTY_ALCOHOL_RE.match(name) and name not in (
        "CHOLESTEROL", "PHENOL", "RESORCINOL"
    ):
        return "alcohol"
    if BOTANICAL_RE.search(name) and not name.startswith("CI "):
        return "botanical"
    if "soothing" in fl or "skin protecting" in fl:
        return "soothing"
    if "emollient" in fl or "occlusive" in fl:
        return "emollient"
    if "hair conditioning" in fl or "antistatic" in fl or "hair dyeing" in fl or "oral care" in fl:
        return "texture"
    if "skin conditioning" in fl:
        return "active"
    return "texture"


def ts_string(s: str) -> str:
    # JSON-строка — валидный TS-литерал
    return json.dumps(s, ensure_ascii=False)


def parse_curated() -> tuple[dict[str, str], dict[str, list[str]], set[str]]:
    """Возвращает (slug_by_inci, synonyms_by_slug, all_aliases_upper)."""
    text = CURATED.read_text(encoding="utf-8")
    incis = re.findall(r'inciName: "((?:[^"\\]|\\.)*)"', text)
    slugs = re.findall(r'\n\s+slug: "((?:[^"\\]|\\.)*)"', text)
    syn_blocks = re.findall(r'synonyms: \[((?:[^\]]|\\.)*)\]', text, re.S)
    slug_by_inci = {}
    synonyms_by_slug = {}
    all_aliases: set[str] = set()
    for inci, slug, block in zip(incis, slugs, syn_blocks):
        aliases = re.findall(r'"((?:[^"\\]|\\.)*)"', block)
        slug_by_inci[inci.upper()] = slug
        synonyms_by_slug[slug] = aliases
        all_aliases.add(inci.upper())
        all_aliases.update(a.upper() for a in aliases)
    return slug_by_inci, synonyms_by_slug, all_aliases


def parse_curated_flags() -> dict[str, set[str]]:
    text = CURATED_FLAGS.read_text(encoding="utf-8")
    flags: dict[str, set[str]] = {}
    for m in re.finditer(r'"?([a-z0-9-]+)"?:\s*\{([^}]*)\}', text):
        slug, body = m.group(1), m.group(2)
        flags[slug] = set(re.findall(r'(comedogenic|feedsMalassezia|fragranceAllergen):\s*true', body))
    return flags


def regulatory_notes(reg_rows: list[dict]) -> list[str]:
    """Русские формулировки статуса ЕС из regulatory_status (точный источник).

    Булевы annex_ii…annex_vi из ingredients.csv НЕ используются (известны
    ложные срабатывания: ASCORBIC ACID, ZINC и др.). condition_text,
    product_type, max_concentration выводятся verbatim на английском с пометкой
    «текст регламента». Пустая таблица для ингредиента — не статус: ничего
    не выводим и не пишем «разрешён».
    """
    notes = []
    for rr in reg_rows:
        ref = (rr.get("list_ref") or "").strip()  # "Annex III/98"
        m = re.match(r"Annex\s+([IVX]+)/(.+)", ref)
        annex = m.group(1) if m else ""
        status = rr.get("status") or ""
        cond = re.sub(r"\s+", " ", (rr.get("condition_text") or "").strip())
        ptype = re.sub(r"\s+", " ", (rr.get("product_type") or "").strip())
        maxc = re.sub(r"\s+", " ", (rr.get("max_concentration") or "").strip())
        verbatim = bool(cond or ptype or maxc)
        if status == "PROHIBITED":
            s = f"Входит в перечень запрещённых веществ ЕС ({ref})"
            if cond:
                s += f" — в рамках условия: «{cond}»"
        elif status == "RESTRICTED":
            s = f"Ограничен в ЕС ({ref})"
            parts = []
            if ptype:
                parts.append(ptype)
            if maxc:
                parts.append(f"макс. {maxc}")
            if parts:
                s += ": " + ", ".join(parts)
            if cond:
                s += f"; условия: «{cond}»"
        elif status == "ALLOWED_WITH_CONDITIONS":
            role = ANNEX_ROLE_RU.get(annex, "компонент с условиями")
            s = f"Разрешён в ЕС как {role} с условиями ({ref})"
            parts = []
            if ptype:
                parts.append(ptype)
            if maxc:
                parts.append(f"макс. {maxc}")
            if parts:
                s += ": " + ", ".join(parts)
            if cond:
                s += f"; «{cond}»"
        else:
            continue
        if verbatim:
            s += " (текст регламента — дословно, EN)"
        notes.append(s + ".")
    return notes


def main() -> int:
    ingredients_path = INCIDB / "ingredients.csv"
    if not ingredients_path.exists():
        print(f"Не найдена выборка INCIDB: {ingredients_path}", file=sys.stderr)
        print("См. инструкцию по перегенерации в шапке скрипта.", file=sys.stderr)
        return 1

    slug_by_inci, _, curated_aliases = parse_curated()
    curated_flags = parse_curated_flags()
    curated_slugs = set(slug_by_inci.values())

    rows = list(csv.DictReader(open(ingredients_path, encoding="utf-8"), delimiter="|"))
    matched = [r for r in rows if r["cosing_matched"] == "1"]

    # перенос оценок Fulton 1989 с бытовых имён на INCI-формы
    rating_by_name = {r["inci_name"].strip().upper(): (r.get("comedogenic_rating") or "") for r in rows}
    matched_names = {r["inci_name"].strip().upper() for r in matched}
    fulton_transfer: dict[str, tuple[str, str]] = {}  # target_up → (source_name, rating)
    for src, tgt in FULTON_TRANSFER:
        rating = rating_by_name.get(src, "")
        if not rating:
            print(f"  ! Fulton: у источника {src} нет оценки — пропуск", file=sys.stderr)
            continue
        if tgt not in matched_names:
            print(f"  ! Fulton: цель {tgt} без cosing_matched=1 — пропуск", file=sys.stderr)
            continue
        if rating_by_name.get(tgt):
            continue  # у цели своя оценка — не перезаписываем
        fulton_transfer[tgt] = (src, rating)
    for name in FULTON_UNMAPPED:
        if rating_by_name.get(name):
            print(f"  ! Fulton без переноса (нет однозначного INCI): {name} = {rating_by_name[name]}")

    # точный источник статусов ЕС: regulatory_status (CosIng Annex II–VI exports).
    # Ключ — вся строка: (ingredient_id, list_ref) не уникален, храним список.
    regulatory_by_ing: dict[str, list[dict]] = {}
    rs_path = INCIDB / "regulatory_status.csv"
    if rs_path.exists():
        for rr in csv.DictReader(open(rs_path, encoding="utf-8"), delimiter="|"):
            regulatory_by_ing.setdefault(rr["ingredient_id"], []).append(rr)

    # пороги декларирования аллергенов по ingredient_id
    allergen_thresholds: dict[str, tuple[str, str]] = {}
    fa_path = INCIDB / "fragrance_allergens.csv"
    if fa_path.exists():
        for r in csv.DictReader(open(fa_path, encoding="utf-8"), delimiter="|"):
            if r.get("ingredient_id") and r.get("flagged") == "1":
                allergen_thresholds[r["ingredient_id"]] = (
                    r.get("leave_on_threshold_pct") or "",
                    r.get("rinse_off_threshold_pct") or "",
                )

    # полный список аллергенов ЕС (репозиторий INCIDB)
    eu_allergen_names: set[str] = set()
    if ALLERGENS_JSON.exists():
        data = json.load(open(ALLERGENS_JSON, encoding="utf-8"))
        for e in data.get("entries", []):
            for n in e.get("legal_names", []):
                eu_allergen_names.add(n.upper())

    # сырые синонимы (raw_name → canonical) из name-map выборки
    raw_synonyms: dict[str, list[str]] = {}
    nm_path = INCIDB / "ingredient_name_map.csv"
    if nm_path.exists():
        for r in csv.DictReader(open(nm_path, encoding="utf-8"), delimiter="|"):
            raw = (r.get("raw_name") or "").strip()
            canon = (r.get("canonical_name") or "").strip()
            method = r.get("method") or ""
            if not raw or not canon or method.startswith("unresolved"):
                continue
            # split / slash_same_cas — это два имени в одном токене, как синоним бессмысленно
            if method in ("split", "slash_same_cas"):
                continue
            # только чистые написания: без фрагментов этикеток, знаков препинания,
            # звёздочек органик-маркировок и длинных цепочек слов
            if (
                len(raw) > 40
                or raw.upper() == canon.upper()
                or re.search(r"[.,;:()*®™]", raw)
                or len(raw.split()) > 2
            ):
                continue
            raw_synonyms.setdefault(canon.upper(), [])
            if raw not in raw_synonyms[canon.upper()] and len(raw_synonyms[canon.upper()]) < 6:
                raw_synonyms[canon.upper()].append(raw)

    new_items = []
    flags_new: dict[str, dict[str, bool]] = {}
    flags_enrich: dict[str, dict[str, bool]] = {}
    curated_reg_review: list[tuple[str, str, list[str]]] = []
    fulton_moved: list[tuple[str, str, str]] = []  # (источник, INCI-цель, рейтинг)
    skipped_dup = skipped_junk = 0
    used_slugs = set(curated_slugs)

    for r in matched:
        inci = r["inci_name"].strip()
        inci_up = re.sub(r"\s+", " ", inci.upper())
        slug = slugify(inci)

        # уже есть в каталоге (по INCI, slug или синонимам курируемых карточек)
        if inci_up in curated_aliases or slug in curated_slugs:
            skipped_dup += 1
            target_slug = slug_by_inci.get(inci_up, slug)
            # курируемые карточки не перезаписываем — собираем для ручной сверки
            reg_rows = regulatory_by_ing.get(r["ingredient_id"], [])
            if reg_rows:
                curated_reg_review.append(
                    (target_slug, inci, sorted({rr["list_ref"].strip() for rr in reg_rows}))
                )
            # обогащение флагов курируемой карточки
            enrich: dict[str, bool] = {}
            rating = r.get("comedogenic_rating") or ""
            if not rating and inci_up in fulton_transfer:
                rating = fulton_transfer[inci_up][1]  # перенос Fulton на INCI-форму
            if rating and float(rating) >= 3 and "comedogenic" not in curated_flags.get(target_slug, set()):
                enrich["comedogenic"] = True
            is_allergen = r.get("is_common_allergen") == "1" or inci_up in eu_allergen_names
            if is_allergen and "fragranceAllergen" not in curated_flags.get(target_slug, set()):
                enrich["fragranceAllergen"] = True
            if enrich:
                flags_enrich[target_slug] = enrich
            continue

        if not slug:
            skipped_junk += 1
            continue
        base_slug = slug
        n = 2
        while slug in used_slugs:
            slug = f"{base_slug}-{n}"
            n += 1
        used_slugs.add(slug)

        funcs_ru = ru_functions(r.get("functions") or "")
        category = categorize(inci, r.get("functions") or "")

        desc_parts = [
            "Карточка импортирована автоматически из INCIDB (обогащение CosIng, снимок 2026.09) "
            "и ждёт редакторской доработки: описание, механизм и сочетания пока не заполнены."
        ]
        chem = (r.get("chemical_description") or "").strip()
        if chem:
            chem = re.sub(r"\s+", " ", chem)
            if len(chem) > 300:
                chem = chem[:297].rsplit(" ", 1)[0] + "…"
            desc_parts.append(f"Описание CosIng (EN): {chem}")
        if funcs_ru:
            desc_parts.append("Функции в составе: " + "; ".join(funcs_ru) + ".")
        cas, ec = (r.get("cas_number") or "").strip(), (r.get("ec_number") or "").strip()
        if cas or ec:
            ids = []
            if cas:
                ids.append(f"CAS {cas}")
            if ec:
                ids.append(f"EC {ec}")
            desc_parts.append("Идентификаторы: " + ", ".join(ids) + ".")

        safety: list[str] = []
        # статусы ЕС — только из regulatory_status (точный источник);
        # cosing_restriction — лишь fallback для известной дыры Annex V/12
        reg_rows = regulatory_by_ing.get(r["ingredient_id"], [])
        safety.extend(regulatory_notes(reg_rows))
        if not reg_rows and inci_up in MISSING_ANNEX_V12:
            if "V/12" in (r.get("cosing_restriction") or ""):
                safety.append(
                    "Разрешён в ЕС как консервант с ограничением концентрации (Annex V/12)."
                )
            else:
                print(f"  ! {inci_up}: ожидался Annex V/12 в cosing_restriction, не найдено",
                      file=sys.stderr)
        is_allergen = r.get("is_common_allergen") == "1" or inci_up in eu_allergen_names
        if is_allergen:
            th = allergen_thresholds.get(r["ingredient_id"])
            if th and (th[0] or th[1]):
                safety.append(
                    "Отдушечный аллерген ЕС (Annex III, Регл. (EU) 2023/1545): декларируется "
                    f"на этикетке при >{th[0] or '—'}% (не смываемые) / >{th[1] or '—'}% (смываемые)."
                )
            else:
                safety.append("Отдушечный аллерген ЕС (Annex III, Регл. (EU) 2023/1545).")
        rating = r.get("comedogenic_rating") or ""
        rating_src = None
        if not rating and inci_up in fulton_transfer:
            rating_src, rating = fulton_transfer[inci_up]
            fulton_moved.append((rating_src, inci, rating))
        if rating:
            if rating_src:
                safety.append(f"Комедогенность (Fulton 1989, оценка для «{rating_src}»): {rating}.")
            else:
                safety.append(f"Комедогенность (шкала Fulton 1989, 0–5): {rating}.")
        if (r.get("is_fungal_acne_trigger") or "") not in ("", "0", "0.0"):
            safety.append(
                "Помечен в INCIDB как потенциальный триггер грибкового акне — правило-эвристика "
                "(жирные кислоты C11–C24 и их эфиры, полисорбаты), не измеренное свойство."
            )

        flags: dict[str, bool] = {}
        if rating and float(rating) >= 3:
            flags["comedogenic"] = True
        if is_allergen:
            flags["fragranceAllergen"] = True
        if (r.get("is_fungal_acne_trigger") or "") not in ("", "0", "0.0"):
            flags["feedsMalassezia"] = True
        if flags:
            flags_new[slug] = flags

        synonyms = raw_synonyms.get(inci_up, [])

        new_items.append(
            {
                "inciName": inci,
                "slug": slug,
                "displayName": display_name(inci),
                "category": category,
                "function": "; ".join(funcs_ru) if funcs_ru else "Компонент косметической формулы",
                "evidenceLevel": "LIMITED",
                "description": " ".join(desc_parts),
                "safetyNotes": " ".join(safety) if safety else None,
                "synonyms": synonyms,
            }
        )

    # ── вывод ingredients.data.ts ────────────────────────────────────────────
    lines = [
        "/**",
        " * АВТОГЕНЕРИРОВАНО — scripts/import-incidb.py. Не править вручную.",
        " *",
        " * Импорт из INCIDB (бесплатная выборка, снимок 2026.09): канонические INCI-имена",
        " * с обогащением CosIng. Курируемые карточки (ingredients.data.ts) имеют приоритет:",
        " * здесь только то, чего в каталоге ещё нет. Поля description заполнены заглушкой",
        " * с фактологией CosIng — ждут редакторской доработки.",
        " */",
        "",
        'import type { IngredientSeed } from "./ingredients.data";',
        "",
        "export const INCIDB_INGREDIENTS: IngredientSeed[] = [",
    ]
    for it in new_items:
        lines.append("  {")
        lines.append(f"    inciName: {ts_string(it['inciName'])},")
        lines.append(f"    slug: {ts_string(it['slug'])},")
        lines.append(f"    displayName: {ts_string(it['displayName'])},")
        lines.append(f"    category: {ts_string(it['category'])},")
        lines.append(f"    function: {ts_string(it['function'])},")
        lines.append('    evidenceLevel: "LIMITED",')
        lines.append(f"    description: {ts_string(it['description'])},")
        if it["safetyNotes"]:
            lines.append(f"    safetyNotes: {ts_string(it['safetyNotes'])},")
        syns = ", ".join(ts_string(s) for s in it["synonyms"])
        lines.append(f"    synonyms: [{syns}],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    OUT_INGREDIENTS.write_text("\n".join(lines), encoding="utf-8")

    # ── вывод incidb-flags.data.ts ───────────────────────────────────────────
    fl = [
        "/**",
        " * АВТОГЕНЕРИРОВАНО — scripts/import-incidb.py. Не править вручную.",
        " *",
        " * Флаги из INCIDB: для импортированных карточек — комедогенность (Fulton 1989, >= 3),",
        " * аллергены-отдушки ЕС (Annex III, Регл. 2023/1545), триггеры грибкового акне (эвристика).",
        " * Для курируемых карточек — только добавление опубликованных данных (комедогенность >= 3,",
        " * EU-аллергены); feedsMalassezia у курируемых решается вручную в flags.data.ts.",
        " * В seed.ts эти флаги применяются ПЕРЕД ручными INGREDIENT_FLAGS (ручные побеждают).",
        " */",
        "",
        "export interface IncidbFlags {",
        "  comedogenic?: boolean;",
        "  feedsMalassezia?: boolean;",
        "  fragranceAllergen?: boolean;",
        "}",
        "",
        "export const INCIDB_FLAGS: Record<string, IncidbFlags> = {",
    ]
    for slug, flags in sorted(flags_new.items()):
        body = ", ".join(f"{k}: true" for k in ("comedogenic", "feedsMalassezia", "fragranceAllergen") if flags.get(k))
        fl.append(f"  {ts_string(slug)}: {{ {body} }},")
    if flags_new:
        fl.append("")
        fl.append("  // обогащение курируемых карточек (только факты, которых нет в flags.data.ts)")
    for slug, flags in sorted(flags_enrich.items()):
        body = ", ".join(f"{k}: true" for k in ("comedogenic", "feedsMalassezia", "fragranceAllergen") if flags.get(k))
        fl.append(f"  {ts_string(slug)}: {{ {body} }},")
    fl.append("};")
    fl.append("")
    OUT_FLAGS.write_text("\n".join(fl), encoding="utf-8")

    cats: dict[str, int] = {}
    for it in new_items:
        cats[it["category"]] = cats.get(it["category"], 0) + 1
    print(f"Всего CosIng-matched в выборке: {len(matched)}")
    print(f"Пропущено (уже в каталоге):    {skipped_dup}")
    print(f"Пропущено (мусор):             {skipped_junk}")
    print(f"Новых карточек:                {len(new_items)}")
    print(f"Флагов у новых:                {len(flags_new)}")
    print(f"Обогащено курируемых:          {len(flags_enrich)}")
    print(f"Карточек со статусами ЕС (regulatory_status): "
          f"{sum(1 for it in new_items if 'ЕС' in (it['safetyNotes'] or ''))}")
    # отчёт для ручной сверки: курируемые карточки с записями в regulatory_status
    report_path = ROOT / "incidb-complete" / "curated-regulatory-review.md"
    rl = [
        "# Курируемые карточки с записями в regulatory_status (для ручной сверки)",
        "",
        "Сгенерировано scripts/import-incidb.py. Карточки НЕ изменены — сверить вручную,",
        "что safetyNotes в prisma/ingredients.data.ts не противоречат записям Annex.",
        "",
        "| slug | INCI | Записи Annex |",
        "| --- | --- | --- |",
    ]
    for slug, inci, refs in sorted(curated_reg_review):
        rl.append(f"| {slug} | {inci} | {', '.join(refs)} |")
    rl.append("")
    report_path.write_text("\n".join(rl), encoding="utf-8")
    print(f"Курируемых с записями Annex:   {len(curated_reg_review)} → {report_path.name}")
    print(f"Переносов комедогенности:      {len(fulton_moved)}")
    for src, tgt, rating in fulton_moved:
        print(f"    {src} → {tgt} ({rating})")
    print("Категории:", dict(sorted(cats.items(), key=lambda x: -x[1])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
