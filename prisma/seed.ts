import { PrismaClient, EvidenceLevel } from "@prisma/client";

const prisma = new PrismaClient();

interface IngredientSeed {
  inciName: string;
  slug: string;
  displayName: string;
  category: string;
  function: string;
  evidenceLevel: EvidenceLevel;
  typicalConc?: string;
  description: string;
  safetyNotes?: string;
  synonyms: string[];
}

/** 30 ключевых ингредиентов с доказательной базой. */
const INGREDIENTS: IngredientSeed[] = [
  {
    inciName: "NIACINAMIDE",
    slug: "niacinamide",
    displayName: "Ниацинамид",
    category: "active",
    function: "Витамин B3: сокращает пигментацию, регулирует себум, укрепляет барьер",
    evidenceLevel: "STRONG",
    typicalConc: "2–5%",
    description:
      "Один из самых изученных активов. Снижает трансэпидермальную потерю воды, осветляет постакне, уменьшает жирность. Переносится большинством типов кожи.",
    safetyNotes: "При >10% возможно покраснение; флашинг чаще от примесей никотиновой кислоты.",
    synonyms: ["ниацинамид", "nicotinamide", "vitamin b3", "никотинамид", "витамин b3"],
  },
  {
    inciName: "RETINOL",
    slug: "retinol",
    displayName: "Ретинол",
    category: "active",
    function: "Ретиноид: ускоряет обновление клеток, стимулирует коллаген, лечит акне",
    evidenceLevel: "STRONG",
    typicalConc: "0.1–1%",
    description:
      "Золотой стандарт антивозрастного ухода и терапии акне. Конвертируется в ретиноевую кислоту в коже. Эффект нарастает 8–12 недель.",
    safetyNotes: "Фотосенсибилизирует; начинать с 1–2 раз в неделю; противопоказан при беременности.",
    synonyms: ["ретинол", "vitamin a", "витамин a", "retinol"],
  },
  {
    inciName: "GLYCOLIC ACID",
    slug: "glycolic-acid",
    displayName: "Гликолевая кислота",
    category: "active",
    function: "AHA-кислота: химическая эксфолиация, выравнивание тона и рельефа",
    evidenceLevel: "STRONG",
    typicalConc: "5–10%",
    description:
      "Самая мелкая AHA — проникает глубже всех. Растворяет межклеточные связи рогового слоя. Эффективна при фотостарении и постакне.",
    safetyNotes: "Повышает фоточувствительность — обязателен SPF; не сочетать с ретиноидами в один приём.",
    synonyms: ["гликолевая кислота", "aha", "гликолевая"],
  },
  {
    inciName: "LACTIC ACID",
    slug: "lactic-acid",
    displayName: "Молочная кислота",
    category: "active",
    function: "AHA-кислота: мягкая эксфолиация + увлажнение",
    evidenceLevel: "STRONG",
    typicalConc: "5–10%",
    description:
      "Мягче гликолевой за счёт большего размера молекулы. Подходит чувствительной коже, входит в состав NMF.",
    synonyms: ["молочная кислота"],
  },
  {
    inciName: "SALICYLIC ACID",
    slug: "salicylic-acid",
    displayName: "Салициловая кислота",
    category: "active",
    function: "BHA-кислота: липофильная эксфолиация пор, против акне и комедонов",
    evidenceLevel: "STRONG",
    typicalConc: "0.5–2%",
    description:
      "Растворима в липидах — работает внутри пор. Противовоспалительное действие. Стандарт ухода за жирной и проблемной кожей.",
    safetyNotes: "Сушит при частом применении; осторожно при аллергии на аспирин.",
    synonyms: ["салициловая кислота", "bha", "beta hydroxy acid"],
  },
  {
    inciName: "ASCORBIC ACID",
    slug: "ascorbic-acid",
    displayName: "Витамин C",
    category: "active",
    function: "Антиоксидант: осветление пигмента, стимуляция коллагена, фотозащита (усиление SPF)",
    evidenceLevel: "STRONG",
    typicalConc: "10–20%",
    description:
      "L-аскорбиновая кислота — самая доказанная форма витамина C. Стабильна при pH<3.5, быстро окисляется на воздухе.",
    safetyNotes: "Раздражает при высоких концентрациях; хранить в тёмной герметичной упаковке.",
    synonyms: ["витамин c", "vitamin c", "l-ascorbic acid", "аскорбиновая кислота", "ascorbic acid"],
  },
  {
    inciName: "HYALURONIC ACID",
    slug: "hyaluronic-acid",
    displayName: "Гиалуроновая кислота",
    category: "humectant",
    function: "Гумектант: связывает воду в роговом слое",
    evidenceLevel: "MODERATE",
    typicalConc: "0.1–2%",
    description:
      "Полисахарид, удерживающий до 1000 молекул воды. Высокомолекулярная форма работает на поверхности, низкомолекулярная — глубже.",
    synonyms: ["гиалуроновая кислота", "sodium hyaluronate", "гиалуронат натрия"],
  },
  {
    inciName: "CERAMIDE NP",
    slug: "ceramide-np",
    displayName: "Церамид NP",
    category: "barrier",
    function: "Липид барьера: восстанавливает цемент рогового слоя",
    evidenceLevel: "STRONG",
    typicalConc: "0.1–0.5%",
    description:
      "Ключевой липид кожного барьера. Дефицит церамидов связан с атопическим дерматитом и сухостью. Работает в паре с холестерином и жирными кислотами.",
    synonyms: ["церамид np", "церамиды", "ceramide", "ceramides"],
  },
  {
    inciName: "AZELAIC ACID",
    slug: "azelaic-acid",
    displayName: "Азелаиновая кислота",
    category: "active",
    function: "Дикарбоновая кислота: против акне, розацеа и пигментации",
    evidenceLevel: "STRONG",
    typicalConc: "10–20%",
    description:
      "Антибактериальная, противовоспалительная, ингибирует тирозиназу. Одна из немногих кислот, разрешённых при беременности (по согласованию с врачом).",
    synonyms: ["азелаиновая кислота"],
  },
  {
    inciName: "BENZOYL PEROXIDE",
    slug: "benzoyl-peroxide",
    displayName: "Бензоилпероксид",
    category: "active",
    function: "Антибактериальный кератолитик: лечение акне",
    evidenceLevel: "STRONG",
    typicalConc: "2.5–5%",
    description:
      "Убивает C. acnes без развития резистентности. Препарат первой линии при лёгком и среднетяжёлом акне.",
    safetyNotes: "Отбеливает ткань; сушит и раздражает; окисляет ретинол и витамин C при одновременном нанесении.",
    synonyms: ["бензоилпероксид", "benzoyl peroxide", "пероксид бензоила"],
  },
  {
    inciName: "ZINC OXIDE",
    slug: "zinc-oxide",
    displayName: "Оксид цинка",
    category: "uv-filter",
    function: "Минеральный UV-фильтр широкого спектра (UVA+UVB)",
    evidenceLevel: "STRONG",
    typicalConc: "5–25%",
    description:
      "Физический фильтр, фотостабилен, подходит чувствительной и детской коже. Может давать белёсый след.",
    synonyms: ["оксид цинка", "цинка оксид"],
  },
  {
    inciName: "TITANIUM DIOXIDE",
    slug: "titanium-dioxide",
    displayName: "Диоксид титана",
    category: "uv-filter",
    function: "Минеральный UV-фильтр (преимущественно UVB) и пигмент",
    evidenceLevel: "STRONG",
    typicalConc: "2–15%",
    description:
      "Фотостабильный минеральный фильтр; часто комбинируется с оксидом цинка для полного спектра.",
    synonyms: ["диоксид титана", "титана диоксид"],
  },
  {
    inciName: "BUTYL METHOXYDIBENZOYLMETHANE",
    slug: "avobenzone",
    displayName: "Авобензон",
    category: "uv-filter",
    function: "Химический UVA-фильтр",
    evidenceLevel: "STRONG",
    typicalConc: "1–3%",
    description:
      "Один из немногих разрешённых UVA-фильтров широкого действия. Нефотостабилен сам по себе — стабилизируется октокриленом.",
    synonyms: ["авобензон", "avobenzone"],
  },
  {
    inciName: "OCTOCRYLENE",
    slug: "octocrylene",
    displayName: "Октокрилен",
    category: "uv-filter",
    function: "Химический UVB-фильтр, стабилизатор авобензона",
    evidenceLevel: "STRONG",
    typicalConc: "2–10%",
    description:
      "Фотостабильный UVB-фильтр, повышает водостойкость формул. Возможны контактные реакции у чувствительной кожи.",
    synonyms: ["октокрилен"],
  },
  {
    inciName: "PANTHENOL",
    slug: "panthenol",
    displayName: "Пантенол",
    category: "humectant",
    function: "Провитамин B5: увлажняет, успокаивает, ускоряет заживление",
    evidenceLevel: "MODERATE",
    typicalConc: "1–5%",
    description: "Конвертируется в пантотеновую кислоту в коже. Хорошо переносится, подходит после кислот.",
    synonyms: ["пантенол", "dexpanthenol", "декспантенол", "провитамин b5"],
  },
  {
    inciName: "TOCOPHEROL",
    slug: "tocopherol",
    displayName: "Токоферол (витамин E)",
    category: "antioxidant",
    function: "Антиоксидант: защищает липиды формулы и кожи от окисления",
    evidenceLevel: "MODERATE",
    typicalConc: "0.1–1%",
    description: "Синергист витамина C — стабилизирует его и усиливает фотозащиту в паре.",
    synonyms: ["токоферол", "витамин e", "vitamin e", "tocopheryl acetate"],
  },
  {
    inciName: "SQUALANE",
    slug: "squalane",
    displayName: "Сквалан",
    category: "emollient",
    function: "Эмолент: смягчает, восполняет липиды без комедогенности",
    evidenceLevel: "MODERATE",
    typicalConc: "1–10%",
    description: "Гидрогенизированная форма сквалена, стабильна к окислению. Подходит жирной и чувствительной коже.",
    synonyms: ["сквалан", "сквален", "squalene"],
  },
  {
    inciName: "GLYCERIN",
    slug: "glycerin",
    displayName: "Глицерин",
    category: "humectant",
    function: "Гумектант: притягивает и удерживает воду",
    evidenceLevel: "STRONG",
    typicalConc: "3–10%",
    description: "Один из самых изученных увлажнителей; основа большинства формул.",
    synonyms: ["глицерин", "glycerin", "glycerol", "глицерол"],
  },
  {
    inciName: "CENTELLA ASIATICA EXTRACT",
    slug: "centella-asiatica",
    displayName: "Центелла азиатская",
    category: "botanical",
    function: "Растительный экстракт: успокаивает, поддерживает заживление",
    evidenceLevel: "MODERATE",
    typicalConc: "0.1–1%",
    description: "Азиатикозиды стимулируют синтез коллагена; популярна в к-уходе для чувствительной кожи.",
    synonyms: ["центелла", "центелла азиатская", "cica", "gotu kola", "centella"],
  },
  {
    inciName: "COPPER TRIPEPTIDE-1",
    slug: "copper-peptides",
    displayName: "Медные пептиды",
    category: "active",
    function: "Сигнальный пептид: ремоделирование, заживление, антивозрастной уход",
    evidenceLevel: "LIMITED",
    typicalConc: "0.05–0.2%",
    description:
      "GHK-Cu — исследований меньше, чем по ретиноидам, но данные по заживлению и упругости перспективны.",
    safetyNotes: "Ионы меди инактивируются кислотами и витамином C — разносить по времени.",
    synonyms: ["медные пептиды", "ghk-cu", "copper peptides", "медный трипептид"],
  },
  {
    inciName: "ALPHA-ARBUTIN",
    slug: "alpha-arbutin",
    displayName: "Альфа-арбутин",
    category: "active",
    function: "Осветляющий актив: ингибитор тирозиназы",
    evidenceLevel: "MODERATE",
    typicalConc: "1–2%",
    description: "Стабильное производное гидрохинона без его рисков. Работает при пигментации и постакне-пятнах.",
    synonyms: ["альфа-арбутин", "арбутин", "arbutin"],
  },
  {
    inciName: "KOJIC ACID",
    slug: "kojic-acid",
    displayName: "Койевая кислота",
    category: "active",
    function: "Осветляющий актив: хелатирует медь в тирозиназе",
    evidenceLevel: "MODERATE",
    typicalConc: "1–2%",
    description: "Продукт ферментации грибов. Эффективна при мелазме, но часто сенсибилизирует.",
    safetyNotes: "Частая контактная аллергия; нестабильна на свету.",
    synonyms: ["койевая кислота"],
  },
  {
    inciName: "ADAPALENE",
    slug: "adapalene",
    displayName: "Адапален",
    category: "active",
    function: "Ретиноид III поколения: лечение акне, комедонолитик",
    evidenceLevel: "STRONG",
    typicalConc: "0.1%",
    description: "Фотостабильный рецептурный/OTC-ретиноид (в РФ — по назначению врача). Мягче третиноина.",
    safetyNotes: "Период обострения 2–4 недели; противопоказан при беременности.",
    synonyms: ["адапален", "differin", "дифферин"],
  },
  {
    inciName: "ALLANTOIN",
    slug: "allantoin",
    displayName: "Аллантоин",
    category: "soothing",
    function: "Успокаивающий кератопластик: смягчает роговой слой",
    evidenceLevel: "LIMITED",
    typicalConc: "0.1–2%",
    description: "Снижает раздражение в формулах с активами; частый спутник кислот и ретиноидов.",
    synonyms: ["аллантоин"],
  },
  {
    inciName: "UREA",
    slug: "urea",
    displayName: "Мочевина",
    category: "humectant",
    function: "Гумектант и кератолитик (при >10%)",
    evidenceLevel: "STRONG",
    typicalConc: "2–10% (до 40% на стопы)",
    description: "Компонент NMF. В низких концентрациях увлажняет, в высоких — размягчает гиперкератоз.",
    synonyms: ["мочевина", "urea", "карбамид", "carbamide"],
  },
  {
    inciName: "MANDELIC ACID",
    slug: "mandelic-acid",
    displayName: "Миндальная кислота",
    category: "active",
    function: "AHA-кислота: деликатная эксфолиация, антибактериальное действие",
    evidenceLevel: "MODERATE",
    typicalConc: "5–10%",
    description: "Крупная молекула — медленное проникновение, минимум раздражения. Подходит тёмной коже при пигментации.",
    synonyms: ["миндальная кислота"],
  },
  {
    inciName: "TRANEXAMIC ACID",
    slug: "tranexamic-acid",
    displayName: "Транексамовая кислота",
    category: "active",
    function: "Антипигментный актив: блокирует плазмин-меланоцитарный путь",
    evidenceLevel: "MODERATE",
    typicalConc: "2–5%",
    description: "Перспективен при мелазме, в т.ч. устойчивой к гидрохинону. Мягкий, сочетается с ниацинамидом.",
    synonyms: ["транексамовая кислота"],
  },
  {
    inciName: "BAKUCHIOL",
    slug: "bakuchiol",
    displayName: "Бакучиол",
    category: "active",
    function: "Растительный «аналог ретинола»: стимулирует коллаген без раздражения",
    evidenceLevel: "LIMITED",
    typicalConc: "0.5–1%",
    description: "Единственное RCT показало сопоставимость с ретинолом 0.5% при лучшей переносимости; данных пока мало.",
    synonyms: ["бакучиол"],
  },
  {
    inciName: "BISABOLOL",
    slug: "bisabolol",
    displayName: "Бисаболол",
    category: "soothing",
    function: "Успокаивающий компонент ромашки: противовоспалительное действие",
    evidenceLevel: "LIMITED",
    typicalConc: "0.1–0.5%",
    description: "Альфа-бисаболол снижает покраснение; часто в формулах для чувствительной кожи.",
    synonyms: ["бисаболол", "alpha-bisabolol"],
  },
  {
    inciName: "CAFFEINE",
    slug: "caffeine",
    displayName: "Кофеин",
    category: "active",
    function: "Вазоконстриктор: уменьшает отёчность и тёмные круги (симптоматически)",
    evidenceLevel: "LIMITED",
    typicalConc: "1–5%",
    description: "Доказательная база по коже ограничена; эффект против отёков краткосрочный.",
    synonyms: ["кофеин"],
  },
];

/** Конфликты активов (пары не упорядочены — seed нормализует порядок). */
const CONFLICTS: Array<{ a: string; b: string; severity: string; reason: string }> = [
  { a: "retinol", b: "glycolic-acid", severity: "high", reason: "Суммарное раздражение и повреждение барьера; разносить по дням или времени суток." },
  { a: "retinol", b: "lactic-acid", severity: "high", reason: "Двойная эксфолиация — риск пересушивания и воспаления." },
  { a: "retinol", b: "mandelic-acid", severity: "medium", reason: "Мягче гликолевой, но при ежедневной паре всё равно перегружает кожу." },
  { a: "retinol", b: "salicylic-acid", severity: "medium", reason: "Оба кератолитики; допустимо в одном уходе только у очень устойчивой кожи." },
  { a: "retinol", b: "ascorbic-acid", severity: "medium", reason: "Разные оптимальные pH и окисление друг друга; классика — C утром, ретинол вечером." },
  { a: "retinol", b: "benzoyl-peroxide", severity: "high", reason: "Пероксид окисляет ретинол, оба сушат; наносить в разное время суток." },
  { a: "adapalene", b: "benzoyl-peroxide", severity: "low", reason: "Допустимая пара (есть фиксированные комбинации), но стартовать — по очереди." },
  { a: "adapalene", b: "glycolic-acid", severity: "high", reason: "Как и с ретинолом: суммарное раздражение." },
  { a: "ascorbic-acid", b: "benzoyl-peroxide", severity: "medium", reason: "Пероксид окисляет аскорбиновую кислоту — витамин C инактивируется." },
  { a: "ascorbic-acid", b: "copper-peptides", severity: "medium", reason: "Кислый pH и ионы меди взаимно инактивируют активы." },
  { a: "glycolic-acid", b: "copper-peptides", severity: "medium", reason: "Кислоты разрушают пептидные связи — пептиды теряют активность." },
  { a: "salicylic-acid", b: "glycolic-acid", severity: "medium", reason: "Суммарная эксфолиация; сочетать не чаще 2–3 раз в неделю." },
  { a: "ascorbic-acid", b: "niacinamide", severity: "low", reason: "Совместимы; устаревший миф о конфликте основан на нестабильных смесях 1960-х." },
  { a: "kojic-acid", b: "glycolic-acid", severity: "medium", reason: "Частая пара в осветлении, но высокая сенсибилизация — вводить по очереди." },
  { a: "benzoyl-peroxide", b: "bakuchiol", severity: "low", reason: "Данных мало; из осторожности разносить по времени." },
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
  // Часть 4: +10 продуктов с реальными составами (только распознанные ингредиенты)
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
      create: data,
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
