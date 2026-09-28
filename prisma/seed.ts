import { PrismaClient, EvidenceLevel } from "@prisma/client";
import { INGREDIENTS } from "./ingredients.data";

const prisma = new PrismaClient();
const CONFLICTS: Array<{ a: string; b: string; severity: string; reason: string }> = [
  // Ретиноиды × кислоты / окислители
  { a: "retinol", b: "glycolic-acid", severity: "high", reason: "Суммарное раздражение и повреждение барьера; разносить по дням или времени суток." },
  { a: "retinol", b: "lactic-acid", severity: "high", reason: "Двойная эксфолиация — риск пересушивания и воспаления." },
  { a: "retinol", b: "mandelic-acid", severity: "medium", reason: "Мягче гликолевой, но при ежедневной паре всё равно перегружает кожу." },
  { a: "retinol", b: "salicylic-acid", severity: "medium", reason: "Оба кератолитики; допустимо в одном уходе только у очень устойчивой кожи." },
  { a: "retinol", b: "ascorbic-acid", severity: "medium", reason: "Разные оптимальные pH и окисление друг друга; классика — C утром, ретинол вечером." },
  { a: "retinol", b: "benzoyl-peroxide", severity: "high", reason: "Пероксид окисляет ретинол, оба сушат; наносить в разное время суток." },
  { a: "retinal", b: "glycolic-acid", severity: "high", reason: "Как и у ретинола: суммарное раздражение от двойной эксфолиации." },
  { a: "retinal", b: "lactic-acid", severity: "high", reason: "Двойная эксфолиация — барьер не успевает восстанавливаться." },
  { a: "retinal", b: "salicylic-acid", severity: "medium", reason: "Допустимо только у устойчивой жирной кожи и в разные дни." },
  { a: "retinal", b: "ascorbic-acid", severity: "medium", reason: "Разные оптимальные pH; классика — витамин C утром, ретиналь вечером." },
  { a: "retinal", b: "benzoyl-peroxide", severity: "high", reason: "Пероксид окисляет ретиналь; разносить по времени суток." },
  { a: "tretinoin", b: "glycolic-acid", severity: "high", reason: "При терапии третиноином все кислоты отменяются — высокий риск химического ожога." },
  { a: "tretinoin", b: "lactic-acid", severity: "high", reason: "Суммарная эксфолиация на фоне рецептурного ретиноида." },
  { a: "tretinoin", b: "salicylic-acid", severity: "medium", reason: "Салициловая кислота усиливает сухость и шелушение от третиноина." },
  { a: "tretinoin", b: "ascorbic-acid", severity: "medium", reason: "Низкий pH аскорбиновой кислоты усиливает раздражение; разносить по времени." },
  { a: "tretinoin", b: "benzoyl-peroxide", severity: "medium", reason: "Пероксид окисляет третиноин при одновременном нанесении; в терапии комбинируют утро/вечер." },
  { a: "tretinoin", b: "adapalene", severity: "high", reason: "Два ретиноида одновременно не назначают — суммарный токсический дерматит." },
  { a: "adapalene", b: "benzoyl-peroxide", severity: "low", reason: "Допустимая пара (есть фиксированные комбинации), но стартовать — по очереди." },
  { a: "adapalene", b: "glycolic-acid", severity: "high", reason: "Как и с ретинолом: суммарное раздражение." },
  { a: "adapalene", b: "lactic-acid", severity: "high", reason: "Двойная эксфолиация на фоне ретиноида." },
  { a: "adapalene", b: "salicylic-acid", severity: "medium", reason: "Салициловая кислота усиливает сухость от адапалена; вводить по очереди." },
  { a: "gluconolactone", b: "retinol", severity: "low", reason: "PHA настолько мягка, что почти не конфликтует; разносить по времени из осторожности." },
  { a: "lactobionic-acid", b: "retinol", severity: "low", reason: "Мягкая PHA совместима с ретиноидами; максимум — лёгкая сухость." },
  // Витамин C × кислоты / окислители
  { a: "ascorbic-acid", b: "benzoyl-peroxide", severity: "medium", reason: "Пероксид окисляет аскорбиновую кислоту — витамин C инактивируется." },
  { a: "ascorbic-acid", b: "copper-peptides", severity: "medium", reason: "Кислый pH и ионы меди взаимно инактивируют активы." },
  { a: "ascorbic-acid", b: "glycolic-acid", severity: "medium", reason: "Суммарное раздражение от двух низких pH; допустимо в одной схеме по разным дням." },
  { a: "ascorbic-acid", b: "salicylic-acid", severity: "medium", reason: "Два агрессивных актива подряд перегружают барьер; разносить по времени." },
  { a: "benzoyl-peroxide", b: "alpha-arbutin", severity: "medium", reason: "Пероксид окисляет арбутин — осветляющий эффект теряется." },
  // Пептиды × кислоты
  { a: "glycolic-acid", b: "copper-peptides", severity: "medium", reason: "Кислоты разрушают пептидные связи — пептиды теряют активность." },
  { a: "salicylic-acid", b: "copper-peptides", severity: "low", reason: "При разном времени нанесения совместимы; в один приём кислота денатурирует пептид." },
  // Кислота × кислота
  { a: "salicylic-acid", b: "glycolic-acid", severity: "medium", reason: "Суммарная эксфолиация; сочетать не чаще 2–3 раз в неделю." },
  { a: "kojic-acid", b: "glycolic-acid", severity: "medium", reason: "Частая пара в осветлении, но высокая сенсибилизация — вводить по очереди." },
  { a: "kojic-acid", b: "retinol", severity: "medium", reason: "Оба сенсибилизируют; вместе резко растёт риск контактного дерматита." },
  // Прочее
  { a: "ascorbic-acid", b: "niacinamide", severity: "low", reason: "Совместимы; устаревший миф о конфликте основан на нестабильных смесях 1960-х." },
  { a: "benzoyl-peroxide", b: "bakuchiol", severity: "low", reason: "Данных мало; из осторожности разносить по времени." },
  { a: "benzoyl-peroxide", b: "tea-tree-oil", severity: "medium", reason: "Оба сушат и раздражают точечно; суммарно — пересушивание и шелушение." },
  { a: "sulfur", b: "retinol", severity: "medium", reason: "Оба кератолитики: на фоне ретиноидов сера усиливает сухость и шелушение." },
  { a: "avobenzone", b: "ascorbic-acid", severity: "low", reason: "В свежей формуле нейтральны; кислый pH длительно может дестабилизировать фильтр — поэтому SPF наносят отдельным слоем." },
  { a: "hpr", b: "glycolic-acid", severity: "high", reason: "Ретиноид + AHA: суммарное раздражение и повреждение барьера; разносить по дням." },
  { a: "hpr", b: "lactic-acid", severity: "high", reason: "Двойная эксфолиация на фоне ретиноида." },
  { a: "hpr", b: "salicylic-acid", severity: "medium", reason: "Два кератолитика; допустимо только у устойчивой кожи и в разные дни." },
  { a: "hpr", b: "benzoyl-peroxide", severity: "medium", reason: "Пероксид окисляет ретиноиды; наносить в разное время суток." },
  { a: "hpr", b: "ascorbic-acid", severity: "medium", reason: "Разные оптимальные pH; классика — витамин C утром, ретиноид вечером." },
  { a: "lha", b: "retinol", severity: "medium", reason: "Два липофильных кератолитика: мягче, чем BHA+ретинол, но в один приём всё равно перегружает кожу." },
  { a: "lha", b: "retinal", severity: "medium", reason: "Мягкая кислота на фоне ретиналя всё ещё даёт суммарную эксфолиацию." },
  { a: "lha", b: "hpr", severity: "medium", reason: "Двойное кератолитическое действие; вводить по очереди." },
  { a: "palmitoyl-tripeptide-5", b: "glycolic-acid", severity: "low", reason: "Кислоты постепенно денатурируют пептиды — разносить по времени нанесения." },
  { a: "palmitoyl-tetrapeptide-7", b: "glycolic-acid", severity: "low", reason: "Общее правило для пептидов: кислоты в другое время нанесения." },
  { a: "palmitoyl-tripeptide-1", b: "glycolic-acid", severity: "low", reason: "Кислый pH снижает стабильность пептида; разносить по времени." },
];

/** Демонстрационные продукты (позиции — порядок в INCI среди распознанных). */
const PRODUCTS: Array<{
  brand: string;
  name: string;
  slug: string;
  category: string;
  sourceUrl?: string;
  ingredients: string[]; // slug'и в порядке INCI
}> = [
  {
    brand: "The Ordinary",
    name: "Niacinamide 10% + Zinc 1%",
    slug: "the-ordinary-niacinamide-10-zinc-1",
    category: "serum",
    sourceUrl: "https://theordinary.com/product/rdn-niacinamide-10pct-zinc-1pct-30ml",
    ingredients: ["niacinamide", "panthenol"],
  },
  {
    brand: "CeraVe",
    name: "Moisturizing Cream",
    slug: "cerave-moisturizing-cream",
    category: "cream",
    sourceUrl: "https://www.cerave.com/skincare/moisturizers/moisturizing-cream",
    ingredients: ["glycerin", "ceramide-np", "hyaluronic-acid"],
  },
  {
    brand: "La Roche-Posay",
    name: "Effaclar Duo+",
    slug: "lrp-effaclar-duo-plus",
    category: "treatment",
    sourceUrl: "https://www.laroche-posay.ru/effaclar/effaclar-duo-plus",
    ingredients: ["niacinamide", "salicylic-acid", "glycerin"],
  },
  {
    brand: "The Ordinary",
    name: "AHA 30% + BHA 2% Peeling Solution",
    slug: "the-ordinary-aha-30-bha-2-peeling-solution",
    category: "peeling",
    sourceUrl: "https://theordinary.com/product/rdn-aha-30pct-bha-2pct-peeling-solution-30ml",
    ingredients: [
      "glycolic-acid",
      "lactic-acid",
      "salicylic-acid",
      "hyaluronic-acid",
      "panthenol",
    ],
  },
  {
    brand: "Paula's Choice",
    name: "Skin Perfecting 2% BHA Liquid Exfoliant",
    slug: "paulas-choice-2-bha-liquid-exfoliant",
    category: "toner",
    sourceUrl: "https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201.html",
    ingredients: ["salicylic-acid", "caffeine", "tocopherol"],
  },
  {
    brand: "Vichy",
    name: "Minéral 89",
    slug: "vichy-mineral-89",
    category: "serum",
    sourceUrl: "https://www.vichy.ru/mineral-89",
    ingredients: ["glycerin", "hyaluronic-acid"],
  },
  {
    brand: "La Roche-Posay",
    name: "Anthelios UVMune 400 Invisible Fluid SPF50+",
    slug: "lrp-anthelios-uvmune-400-fluid-spf50",
    category: "spf",
    sourceUrl: "https://www.laroche-posay.ru/anthelios/anthelios-uvmune-400-invisible-fluid-spf50",
    ingredients: ["avobenzone", "octocrylene", "glycerin", "niacinamide"],
  },
  {
    brand: "La Roche-Posay",
    name: "Cicaplast Baume B5+",
    slug: "lrp-cicaplast-baume-b5-plus",
    category: "cream",
    sourceUrl: "https://www.laroche-posay.ru/cicaplast/cicaplast-baume-b5",
    ingredients: [
      "panthenol",
      "centella-asiatica",
      "zinc-oxide",
      "bisabolol",
      "tocopherol",
    ],
  },
  {
    brand: "The Ordinary",
    name: "Retinol 1% in Squalane",
    slug: "the-ordinary-retinol-1-in-squalane",
    category: "serum",
    sourceUrl: "https://theordinary.com/product/rdn-retinol-1pct-in-squalane-30ml",
    ingredients: ["squalane", "retinol", "tocopherol"],
  },
  {
    brand: "CeraVe",
    name: "Resurfacing Retinol Serum",
    slug: "cerave-resurfacing-retinol-serum",
    category: "serum",
    sourceUrl: "https://www.cerave.com/skincare/serums/resurfacing-retinol-serum",
    ingredients: [
      "glycerin",
      "niacinamide",
      "ceramide-np",
      "retinol",
      "hyaluronic-acid",
    ],
  },
  {
    brand: "Uriage",
    name: "Bariéderm Cica-Cream with Copper-Zinc",
    slug: "uriage-bariederm-cica-cream",
    category: "cream",
    sourceUrl: "https://www.uriage.com/ru/en/products/bariederm-cica-cream-with-copper-zinc",
    ingredients: [
      "zinc-oxide",
      "panthenol",
      "centella-asiatica",
      "hyaluronic-acid",
    ],
  },
  {
    brand: "The Ordinary",
    name: "Azelaic Acid Suspension 10%",
    slug: "the-ordinary-azelaic-acid-suspension-10",
    category: "treatment",
    sourceUrl: "https://theordinary.com/product/rdn-azelaic-acid-suspension-10pct-30ml",
    ingredients: ["azelaic-acid", "tocopherol"],
  },
  {
    brand: "COSRX",
    name: "AHA 7 Whitehead Power Liquid",
    slug: "cosrx-aha-7-whitehead-power-liquid",
    category: "toner",
    sourceUrl: "https://www.cosrx.com/products/aha-7-whitehead-power-liquid",
    ingredients: [
      "glycolic-acid",
      "niacinamide",
      "panthenol",
      "allantoin",
      "hyaluronic-acid",
    ],
  },
];

async function main() {
  const idBySlug = new Map<string, string>();

  for (const item of INGREDIENTS) {
    const { synonyms, ...data } = item;
    const ingredient = await prisma.ingredient.upsert({
      where: { slug: item.slug },
      update: { ...data },
      create: { ...data },
    });
    idBySlug.set(item.slug, ingredient.id);

    await prisma.synonym.deleteMany({ where: { ingredientId: ingredient.id } });
    await prisma.synonym.createMany({
      data: synonyms.map((alias) => ({ ingredientId: ingredient.id, alias })),
    });
  }

  await prisma.ingredientConflict.deleteMany();
  for (const c of CONFLICTS) {
    const aId = idBySlug.get(c.a);
    const bId = idBySlug.get(c.b);
    if (!aId || !bId) throw new Error(`Unknown slug in conflict: ${c.a}/${c.b}`);
    // канонический порядок пары — чтобы уникальный индекс ловил дубли
    const [ingredientAId, ingredientBId] = aId < bId ? [aId, bId] : [bId, aId];
    await prisma.ingredientConflict.create({
      data: { ingredientAId, ingredientBId, severity: c.severity, reason: c.reason },
    });
  }

  for (const p of PRODUCTS) {
    const { ingredients, ...data } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { ...data },
    });
    await prisma.productIngredient.deleteMany({ where: { productId: product.id } });
    await prisma.productIngredient.createMany({
      data: ingredients.map((slug, i) => ({
        productId: product.id,
        ingredientId: idBySlug.get(slug)!,
        position: i + 1,
      })),
    });
  }

  const counts = {
    ingredients: await prisma.ingredient.count(),
    synonyms: await prisma.synonym.count(),
    conflicts: await prisma.ingredientConflict.count(),
    products: await prisma.product.count(),
  };
  console.log("Seed done:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
