/**
 * Разовая проверка покрытия базы: прогон реальных INCI-составов через
 * нормализатор + матчер. Выводит нераспознанные токены с частотой.
 * Запуск: pnpm exec tsx scripts/check-compositions.ts
 */
import { matchInciString } from "../lib/ingredients/match";

const COMPOSITIONS: Array<{ name: string; inci: string }> = [
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
];

async function main() {
  const freq = new Map<string, number>();
  let totalTokens = 0;
  let totalMatched = 0;

  for (const { name, inci } of COMPOSITIONS) {
    const { matched, unmatched } = await matchInciString(inci);
    totalTokens += matched.length + unmatched.length;
    totalMatched += matched.length;
    console.log(`\n=== ${name}`);
    console.log(`  распознано: ${matched.length}, не распознано: ${unmatched.length}`);
    for (const t of unmatched) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
      console.log(`    - ${t}`);
    }
  }

  console.log(`\n=== ИТОГО: покрытие ${totalMatched}/${totalTokens} токенов (${Math.round((totalMatched / totalTokens) * 100)}%)`);
  console.log("\n=== Частота нераспознанных токенов (>= 2 продукта):");
  [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => console.log(`  ${n}x  ${t}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
