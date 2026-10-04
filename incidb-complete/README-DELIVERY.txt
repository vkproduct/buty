INCIDB Complete — Commercial Delivery Archive
================================================

Product: INCIDB Complete
Snapshot version: 2026.09

Contents: the full 7-table corpus (brands, products, ingredients,
product_ingredients, ingredient_name_map, fragrance_allergens, regulatory_status)
as pipe-delimited (`|`) UTF-8 CSV and as Apache Parquet, plus this README,
DATA_DICTIONARY.md, LICENSE, and the build_report.json quality report for
this snapshot.

Data license (product data): a derivative of the Open Beauty Facts database,
licensed under the Open Database License (ODbL) v1.0 —
https://opendatacommons.org/licenses/odbl/1-0/ — free to use, adapt, and
redistribute, including commercially, provided you:
  (a) ATTRIBUTE: "Product data © Open Beauty Facts contributors";
  (b) SHARE-ALIKE: any public redistribution of an adapted database is
      offered under ODbL in turn; and
  (c) KEEP-OPEN: no technological measure restricts others from obtaining
      the database in an ODbL-licensed form.

Ingredient enrichment: Contains data from the European Commission CosIng database
(functional categories and related fields), published under the European
Commission's reuse policy for public-sector information — free to reuse
with attribution.

Regulatory overlay: `fragrance_allergens` is transcribed from Annex III to
Regulation (EC) No 1223/2009 as amended by Regulation (EU) 2023/1545 (consolidated
text on EUR-Lex, https://eur-lex.europa.eu), and `regulatory_status` from the
CosIng Annex II-VI exports; both reused under Commission Decision 2011/833/EU
(attribution). A missing row means no list says anything about the ingredient;
it is never a status. Not legal advice.

Authored ratings: `comedogenic_rating` is transcribed from published
literature (Fulton, 1989); `is_fungal_acne_trigger` is a rule-based flag, not
a literature value. Both are informational only, not medical or safety
advice — see DATA_DICTIONARY.md for the method note and per-column
provenance.

Your purchase covers hosted delivery, ready-to-query formats, and support —
not exclusive rights to the underlying data.

Questions / re-downloads: incidb@dataengineered.io
Shopfront: https://incidb.dataengineered.io/
