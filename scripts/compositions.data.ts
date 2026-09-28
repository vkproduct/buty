/**
 * Эталонные реальные INCI-составы для замера покрытия базы.
 * Источники INCI — официальные списки брендов/ритейлеров (сверены 2026-09).
 * Используются check-compositions.ts (через БД) и check-compositions-local.ts (через сид, без БД).
 */
export const COMPOSITIONS: Array<{ name: string; inci: string }> = [
  // ─── Исходные 7 (волны 2–4) ────────────────────────────────────────────────
  {
    name: "COSRX Advanced Snail 96 Mucin Power Essence",
    inci: "Snail Secretion Filtrate, Betaine, Butylene Glycol, 1,2-Hexanediol, Sodium Polyacrylate, Phenoxyethanol, Sodium Hyaluronate, Allantoin, Ethyl Hexanediol, Carbomer, Panthenol, Arginine",
  },
  {
    name: "ROUND LAB 1025 Dokdo Lotion",
    inci: "Water, Glycerin, Pentaerythrityl Tetraethylhexanoate, Hydrogenated Polydecene, Macadamia Integrifolia Seed Oil, Cetearyl Alcohol, Phenyl Trimethicone, Pentylene Glycol, Polymethylsilsesquioxane, Polyglyceryl-3 Distearate, Hydrogenated Lecithin, 1,2-Hexanediol, Hydrogenated Olive Oil Lauryl Esters, Polyglyceryl-3 Methylglucose Distearate, Glyceryl Stearate, Hydrogenated Rice Bran Oil, Dimethicone/Vinyl Dimethicone Crosspolymer, C12-16 Alcohols, Behenic Acid, Caprylic/Capric Triglyceride, Stearic Acid, Palmitic Acid, Behenyl Alcohol, Stearyl Alcohol, Carbomer, Panthenol, Squalane, Sea Water, Tromethamine, Xanthan Gum, Glyceryl Stearate Citrate, Ammonium Acryloyldimethyltaurate/VP Copolymer, Dipotassium Glycyrrhizate, Ethylhexylglycerin, Myristic Acid, Sodium Phytate, Silica, Allantoin, Betaine, Polyglyceryl-10 Stearate, Melia Azadirachta Flower Extract, Ocimum Sanctum Leaf Extract, Butylene Glycol, Dextrin, Theobroma Cacao Seed Extract, Melia Azadirachta Leaf Extract, Curcuma Longa Root Extract, Corallina Officinalis Extract, Tocopherol, Bacillus Ferment, Micrococcus Lysate, Hyaluronic Acid, Hydrolyzed Hyaluronic Acid, Sodium Hyaluronate",
  },
  {
    name: "CeraVe Foaming Facial Cleanser",
    inci: "Purified Water, Glycerin, Behentrimonium Methosulfate, Cetearyl Alcohol, Ceramide 3, Ceramide 6 II, Ceramide 1, Hyaluronic Acid, Cholesterol, Polyoxyl 40 Stearate, Glyceryl Monostearate, Stearyl Alcohol, Polysorbate 20, Potassium Phosphate, Dipotassium Phosphate, Sodium Lauroyl Lactylate, Cetyl Alcohol, Disodium EDTA, Phytosphingosine, Methylparaben, Propylparaben, Carbomer, Xanthan Gum",
  },
  {
    name: "Anua Heartleaf 77% Soothing Toner",
    inci: "Houttuynia Cordata Extract, Water, 1,2-Hexanediol, Glycerin, Betaine, Panthenol, Saccharum Officinarum Extract, Portulaca Oleracea Extract, Butylene Glycol, Vitex Agnus Castus Extract, Chamomilla Recutita Flower Extract, Arctium Lappa Root Extract, Phellinus Linteus Extract, Vitis Vinifera Fruit Extract, Pyrus Malus Fruit Extract, Centella Asiatica Extract, Isopentyldiol, Methylpropanediol, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Tromethamine, Disodium EDTA",
  },
  {
    name: "La Roche-Posay Effaclar Purifying Foaming Gel",
    inci: "Water, Sodium Laureth Sulfate, PEG-8, Coco-Betaine, Hexylene Glycol, Sodium Chloride, PEG-120 Methyl Glucose Dioleate, Zinc PCA, Sodium Hydroxide, Citric Acid, Sodium Benzoate, Phenoxyethanol, Caprylyl Glycol, Parfum",
  },
  {
    name: "Vichy Minéral 89",
    inci: "Aqua, PEG/PPG/Polybutylene Glycol-8/5/3 Glycerin, Glycerin, Butylene Glycol, Methyl Gluceth-20, Carbomer, Sodium Hyaluronate, Phenoxyethanol, Caprylyl Glycol, Citric Acid, Biosaccharide Gum-1",
  },
  {
    name: "Skin1004 Madagascar Centella Ampoule",
    inci: "Water, Centella Asiatica Extract, Butylene Glycol, 1,2-Hexanediol, Ethylhexylglycerin",
  },
  // ─── Волна 5: +8 массовых продуктов ───────────────────────────────────────
  {
    name: "The Ordinary Niacinamide 10% + Zinc 1%",
    inci: "Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin",
  },
  {
    name: "Paula's Choice Skin Perfecting 2% BHA Liquid Exfoliant",
    inci: "Water (Aqua), Methylpropanediol, Butylene Glycol, Salicylic Acid, Polysorbate 20, Camellia Oleifera Leaf Extract, Sodium Hydroxide, Tetrasodium EDTA",
  },
  {
    name: "La Roche-Posay Cicaplast Baume B5+",
    inci: "Aqua, Hydrogenated Polyisobutene, Dimethicone, Glycerin, Butyrospermum Parkii (Shea) Butter, Panthenol, Propanediol, Butylene Glycol, Aluminum Starch Octenylsuccinate, Cetyl PEG/PPG-10/1 Dimethicone, Trihydroxystearin, Zinc Gluconate, Madecassoside, Tribioma, Manganese Gluconate, Silica, Aluminum Hydroxide, Magnesium Sulfate, Disodium EDTA, Copper Gluconate, Capryloyl Glycine, Citric Acid, Acetylated Glycol Stearate, Polyglyceryl-4 Isostearate, Tocopherol, Pentaerythrityl Tetra-Di-T-Butyl Hydroxyhydrocinnamate, CI 77891/Titanium Dioxide",
  },
  {
    name: "Beauty of Joseon Relief Sun: Rice + Probiotics SPF50+ PA++++",
    inci: "Aqua, Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol (Nano), Niacinamide, Coco-Caprylate/Caprate, Caprylyl Methicone, Diethylhexyl Butamido Triazone, Glycerin, 1,2-Hexanediol, Butylene Glycol, Pentylene Glycol, Behenyl Alcohol, Poly C10-30 Alkyl Acrylate, Polyglyceryl-3 Methylglucose Distearate, Decyl Glucoside, Oryza Sativa (Rice) Extract, Tromethamine, Carbomer, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Sodium Stearoyl Glutamate, Polyacrylate Crosspolymer-6, Ethylhexylglycerin, Adenosine, Xanthan Gum, t-Butyl Alcohol, Tocopherol, Oryza Sativa (Rice) Germ Extract, Camellia Sinensis Leaf Extract, Aspergillus Ferment, Bacillus/Soybean Ferment Extract, Cocos Nucifera Fruit Extract, Lactobacillus/Pumpkin Ferment Extract, Lactobacillus/Rice Ferment, Macrocystis Pyrifera Extract, Monascus/Rice Ferment Filtrate, Panax Ginseng Root Extract, Saccharomyces/Rice Ferment Filtrate, Saccharum Officinarum Extract",
  },
  {
    name: "Some By Mi AHA-BHA-PHA 30 Days Miracle Toner",
    inci: "Water, Butylene Glycol, Dipropylene Glycol, Glycerin, Niacinamide, Melaleuca Alternifolia (Tea Tree) Leaf Water, Polyglyceryl-4 Caprate, Carica Papaya (Papaya) Fruit Extract, Lens Esculenta (Lentil) Seed Extract, Hamamelis Virginiana (Witch Hazel) Extract, Nelumbo Nucifera Flower Extract, Swiftlet Nest Extract, Sodium Hyaluronate, Fructan, Allantoin, Adenosine, Hydroxyethyl Urea, Xylitol, Salicylic Acid, Lactobionic Acid, Citric Acid, Sodium Citrate, 1,2-Hexanediol, Pentylene Glycol, Caprylyl Glycol, Benzyl Glycol, Ethylhexylglycerin, Ethyl Hexanediol, Raspberry Ketone, Phenoxyethanol, Mentha Piperita (Peppermint) Oil",
  },
  {
    name: "Bioderma Sensibio H2O Micellar Water",
    inci: "Aqua/Water/Eau, PEG-6 Caprylic/Capric Glycerides, Fructooligosaccharides, Mannitol, Xylitol, Rhamnose, Cucumis Sativus (Cucumber) Fruit Extract, Propylene Glycol, Cetrimonium Bromide, Disodium EDTA",
  },
  {
    name: "Torriden Dive-In Low-Molecular Hyaluronic Acid Serum",
    inci: "Water, Butylene Glycol, Glycerin, Dipropylene Glycol, 1,2-Hexanediol, Panthenol, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Sodium Hyaluronate Crosspolymer, Hydrolyzed Sodium Hyaluronate, Allantoin, Trehalose, Betaine, Propanediol, Portulaca Oleracea Extract, Hamamelis Virginiana Leaf Extract, Madecassoside, Madecassic Acid, Ceramide NP, Beta-Glucan, Malachite Extract, Cholesterol, Pentylene Glycol, Glyceryl Acrylate/Acrylic Acid Copolymer, PVM/MA Copolymer, Polyglyceryl-10 Laurate, Xanthan Gum, Tromethamine, Carbomer, Ethylhexylglycerin, Scutellaria Baicalensis Root Extract, Paeonia Suffruticosa Root Extract",
  },
  {
    name: "Goodal Green Tangerine Vita C Dark Spot Care Serum (Alpha)",
    inci: "Citrus Tangerina (Tangerine) Peel Extract, Butylene Glycol, Niacinamide, Dipropylene Glycol, Methyl Gluceth-20, Water, 1,2-Hexanediol, Glycereth-26, Arbutin, Ascorbyl Glucoside, Ammonium Acryloyldimethyltaurate/VP Copolymer, Panthenol, Chondrus Crispus Extract, Madecassoside, Asiaticoside, Asiatic Acid, Centella Asiatica Extract, Tocopherol, Sodium Hyaluronate, Allantoin, Adenosine, Disodium EDTA, Ethylhexylglycerin, Phenoxyethanol",
  },
];
