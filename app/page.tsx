import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Copy,
  FlaskConical,
  LayoutGrid,
  ListOrdered,
  Minus,
  Sun,
} from "lucide-react";

import { AnalyzeForm } from "@/components/analyze-form";
import { ShelfShowcase } from "@/components/shelf-showcase";
import { SignInForm } from "@/components/sign-in-form";
import { StickyCta } from "@/components/sticky-cta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { FREE_REACTIONS_LIMIT, FREE_SHELF_LIMIT } from "@/lib/billing";
import { PLAN_PRICES } from "@/lib/payments/provider";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { RelatedLandings } from "@/components/seo/landing-blocks";
import { absoluteUrl, faqJsonLd, SITE_NAME } from "@/lib/seo/site";

const HOME_TITLE = "Проверить состав косметики онлайн бесплатно — разбор и расшифровка на русском";
const HOME_DESCRIPTION =
  "Проверка состава косметики онлайн: вставьте INCI-список — расшифруем каждый ингредиент на русском, покажем комедогенные компоненты, отдушки-аллергены и конфликты активов. Бесплатно, без регистрации.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/" },
};

// Цифры базы подтягиваются из БД на каждый запрос (без пререндера на сборке,
// иначе сборка зависит от доступности БД и может не уложиться в лимит Vercel).
export const dynamic = "force-dynamic";

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;
const MONTH = PLAN_PRICES.month;
const YEAR = PLAN_PRICES.year;
const YEAR_PER_MONTH = Math.floor(YEAR / 12);
const YEAR_PER_DAY = Math.round(YEAR / 365);
/** Русское склонение после числа: 1 средство, 2 средства, 5 средств. */
function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
const pluralItems = (n: number) => `${n} ${plural(n, "средство", "средства", "средств")}`;
const FREE_ITEMS = pluralItems(FREE_SHELF_LIMIT);
const SIGNUP = "/auth/signin";

interface Stats {
  ingredients: number;
  synonyms: number;
  conflicts: number;
}

/** Размер базы. Если БД недоступна (например, сборка без базы) — блок цифр скрывается. */
async function getStats(): Promise<Stats | null> {
  try {
    const [ingredients, synonyms, conflicts] = await Promise.all([
      prisma.ingredient.count(),
      prisma.synonym.count(),
      prisma.ingredientConflict.count(),
    ]);
    return ingredients > 0 ? { ingredients, synonyms, conflicts } : null;
  } catch {
    return null;
  }
}

/* ── Боли: почему одного разбора мало ── */
const PAINS = [
  {
    icon: AlertTriangle,
    title: "Средства конфликтуют",
    text: "Ретинол и тоник с кислотой по отдельности хороши. В один вечер — раздражение и недели восстановления барьера.",
  },
  {
    icon: Copy,
    title: "Лишние покупки",
    text: "Две сыворотки с одним и тем же активом — это двойная цена, а не двойной эффект.",
  },
  {
    icon: ListOrdered,
    title: "Непонятный порядок",
    text: "Что наносить утром, что вечером, что за чем и что можно чередовать — на упаковке этого не напишут.",
  },
];

/* ── Что делает «Моя полка» ── */
const SHELF_FEATURES = [
  {
    icon: LayoutGrid,
    title: "Все средства в одном месте",
    text: "Из каталога или свои — по названию и составу. Каждое средство сразу разбирается по активам.",
  },
  {
    icon: FlaskConical,
    title: "Проверка совместимости",
    text: "Для каждой пары средств — вердикт: «конфликт», «разнести по времени» или «можно вместе». Плюс поиск дублей.",
    pro: true,
  },
  {
    icon: Sun,
    title: "Режим утро / вечер",
    text: "Готовый порядок нанесения с учётом конфликтов и чередования активов.",
    pro: true,
  },
  {
    icon: AlertTriangle,
    title: "Дневник реакций",
    text: "Покраснение, сухость, высыпания — видно, на какое средство реагирует кожа.",
  },
  {
    icon: Bell,
    title: "Напоминания",
    text: "Напомним оценить новое средство через 28 дней и докупить привычное — через 90.",
  },
];

/* ── Тарифы ── */
type Feature = { text: string; on: boolean };
const PLANS: {
  id: string;
  name: string;
  price: string;
  per: string;
  note: string;
  flag?: string;
  highlight?: boolean;
  cta: string;
  href: string;
  features: Feature[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "0 ₽",
    per: "",
    note: "Без оплаты и привязки карты",
    cta: "Начать бесплатно",
    href: SIGNUP,
    features: [
      { text: "Разбор составов — всегда бесплатно", on: true },
      { text: `Полка: ${FREE_ITEMS}`, on: true },
      { text: `Реакции: последние ${FREE_REACTIONS_LIMIT}`, on: true },
      { text: "Напоминания", on: true },
      { text: "Совместимость и поиск дублей", on: false },
      { text: "Режим утро / вечер", on: false },
      { text: "Экспорт полки в PDF", on: false },
    ],
  },
  {
    id: "year",
    name: "Pro — год",
    price: rub(YEAR),
    per: "/год",
    note: `≈ ${rub(YEAR_PER_MONTH)} в месяц · 2 месяца в подарок`,
    flag: "Выгоднее",
    highlight: true,
    cta: "Оформить Pro на год",
    href: "/pricing",
    features: [
      { text: "Всё из Free", on: true },
      { text: "Полка без лимита средств", on: true },
      { text: "Совместимость и поиск дублей", on: true },
      { text: "Режим утро / вечер", on: true },
      { text: "Вся история реакций", on: true },
      { text: "Экспорт полки в PDF", on: true },
    ],
  },
  {
    id: "month",
    name: "Pro — месяц",
    price: rub(MONTH),
    per: "/мес",
    note: "Ежемесячная подписка",
    cta: "Оформить Pro на месяц",
    href: "/pricing",
    features: [
      { text: "Всё из Free", on: true },
      { text: "Полка без лимита средств", on: true },
      { text: "Совместимость и поиск дублей", on: true },
      { text: "Режим утро / вечер", on: true },
      { text: "Вся история реакций", on: true },
      { text: "Экспорт полки в PDF", on: true },
    ],
  },
];

const EVIDENCE_LADDER = [
  { label: "Сильная", note: "много РКИ, метаанализы", width: "100%", cls: "bg-success" },
  { label: "Умеренная", note: "ограниченные клинические данные", width: "72%", cls: "bg-teal" },
  { label: "Ограниченная", note: "in vitro, единичные исследования", width: "44%", cls: "bg-amber" },
  { label: "Без данных", note: "традиция и маркетинг", width: "20%", cls: "bg-ink-line" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Как проверить состав косметики онлайн бесплатно?",
    a: "Скопируйте INCI-список с упаковки или из карточки товара на маркетплейсе и вставьте в форму разбора. Сервис распознает каждый ингредиент, переведёт название на русский, покажет функцию, рабочую концентрацию, уровень доказательной базы и конфликты активов. Бесплатно и без регистрации.",
  },
  {
    q: "Можно ли проверить состав косметики на комедогенность?",
    a: "Да. В разборе комедогенные ингредиенты отмечены отдельным флагом — если для них есть опубликованные данные. Отдельно отмечаем отдушки-аллергены и компоненты, которые питают малассезию.",
  },
  {
    q: "Как перевести состав косметики на русский?",
    a: "Состав на упаковке написан по международной номенклатуре INCI латиницей. Вставьте его в форму разбора — каждое название будет показано на русском с пояснением, зачем ингредиент в формуле.",
  },
  {
    q: "Что такое «Моя полка»?",
    a: "Личный кабинет с вашими средствами ухода. Вы добавляете то, чем пользуетесь, а сервис проверяет, как средства сочетаются между собой, собирает порядок нанесения утром и вечером, находит дубли, ведёт дневник реакций кожи и напоминает оценить новое средство или докупить привычное.",
  },
  {
    q: "Зачем Pro, если разбор состава бесплатный?",
    a: "Разбор отвечает на вопрос, что внутри одного средства. Pro — на вопрос, как все ваши средства работают вместе: совместимость каждой пары, поиск дублей, готовый режим утро/вечер, полная история реакций и экспорт полки в PDF.",
  },
  {
    q: "Нужна ли регистрация?",
    a: `Для разбора состава — нет. Для «Моей полки» нужен вход по email: пришлём ссылку, пароль не нужен. На бесплатном тарифе на полку можно добавить ${FREE_ITEMS}.`,
  },
  {
    q: "Как добавить средство, которого нет в каталоге?",
    a: "Добавьте его как «своё средство»: укажите название и вставьте состав (INCI-список). Активы из состава будут учтены в проверке совместимости и в режиме.",
  },
  {
    q: `Что будет, когда на бесплатной полке уже ${FREE_ITEMS}?`,
    a: "Добавленные средства останутся на полке, реакции и напоминания продолжат работать. Чтобы добавить следующее средство, понадобится Pro — в нём лимита нет.",
  },
  {
    q: "Почему в разборе нет точной концентрации ингредиента?",
    a: "Производители, как правило, не раскрывают концентрации. Ингредиенты в INCI перечисляются по убыванию содержания (для компонентов от 1%), поэтому мы показываем типичную рабочую концентрацию актива из исследований — как ориентир.",
  },
  {
    q: "Можно ли загрузить фото состава?",
    a: "Распознавание по фото сейчас в разработке. Пока вставьте INCI-список текстом — его можно скопировать с карточки товара на маркетплейсе или сайте бренда.",
  },
  {
    q: "Заменяет ли Buty.app консультацию дерматолога?",
    a: "Нет. Сервис описывает ингредиенты и их сочетания, но не ставит диагнозов. При заболеваниях кожи обращайтесь к дерматологу.",
  },
];

/** Разделитель секций — тонкая линия внутри контейнера. */
function Divider() {
  return (
    <Container>
      <hr className="border-ink-hair" />
    </Container>
  );
}

export default async function HomePage() {
  const stats = await getStats();

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "ru",
    description: HOME_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/ingredients")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main>
      <JsonLd data={webSite} />
      <JsonLd data={faqJsonLd(FAQ)} />
      {/* ═══ 1. HERO: бесплатный разбор как вход в воронку ═══ */}
      <section id="hero">
        <Container className="grid items-center gap-10 pb-14 pt-10 lg:grid-cols-12 lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="lg:col-span-7">
            <Badge variant="outline" className="mb-5">
              Доказательный уход, а не маркетинг
            </Badge>
            <h1 className="text-[32px] font-semibold leading-[1.08] sm:text-[48px] lg:text-[56px]">
              Проверьте состав косметики онлайн — и&nbsp;узнайте, как она работает
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
              Разбираем составы по научным данным, а «Моя полка» проверяет,
              сочетаются ли ваши средства, и собирает режим утро / вечер.
            </p>
            <ul className="check-list mt-6">
              <li>Функция, рабочая концентрация и уровень доказательности каждого ингредиента</li>
              <li>Конфликты активов — в одном средстве и между средствами</li>
              <li>Готовый порядок нанесения для вашей полки</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="#razbor">Разобрать состав бесплатно</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <Link href="#polka">Что такое «Моя полка»</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Разбор — без регистрации. Полка — вход по email, без пароля.
            </p>
          </div>

          <div
            id="razbor"
            className="scroll-mt-28 rounded-3xl border border-ink-hair bg-white p-6 shadow-pop sm:p-8 lg:col-span-5"
          >
            <h2 className="text-[22px] font-semibold">Разбор состава</h2>
            <p className="mb-5 mt-1.5 text-[15px] leading-relaxed text-ink-muted">
              Вставьте INCI-список с упаковки или карточки товара — разберём
              каждый ингредиент за несколько секунд.
            </p>
            <AnalyzeForm id="inci-hero" />
            <p className="mt-4 text-center text-sm text-ink-muted">
              Бесплатно и без регистрации
            </p>
          </div>
        </Container>
      </section>

      {/* ═══ 2. ДОВЕРИЕ: размер базы ═══ */}
      {stats ? (
        <section className="pb-14 lg:pb-20">
          <Container>
            <div className="grid grid-cols-2 rounded-2xl border border-ink-line lg:grid-cols-4">
              {[
                {
                  num: stats.ingredients,
                  txt: plural(
                    stats.ingredients,
                    "ингредиент с дерматологической карточкой",
                    "ингредиента с дерматологическими карточками",
                    "ингредиентов с дерматологическими карточками",
                  ),
                },
                {
                  num: stats.synonyms,
                  txt: `${plural(stats.synonyms, "вариант", "варианта", "вариантов")} написания INCI распознаёт разбор`,
                },
                {
                  num: stats.conflicts,
                  txt: plural(
                    stats.conflicts,
                    "известный конфликт между активами",
                    "известных конфликта между активами",
                    "известных конфликтов между активами",
                  ),
                },
                { num: 4, txt: "уровня в шкале доказательности" },
              ].map((s, i) => (
                <div
                  key={s.txt}
                  className={cn(
                    "px-5 py-6 text-center",
                    i % 2 === 1 && "border-l border-ink-line",
                    i >= 2 && "border-t border-ink-line lg:border-t-0",
                    i === 2 && "lg:border-l",
                  )}
                >
                  <div className="text-[28px] font-semibold leading-none tracking-tight">
                    {s.num.toLocaleString("ru-RU")}
                  </div>
                  <div className="mx-auto mt-2 max-w-[200px] text-sm leading-snug text-ink-muted">
                    {s.txt}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <Divider />

      {/* ═══ 3. ПРОБЛЕМА: одного разбора мало ═══ */}
      <section className="py-14 lg:py-20">
        <Container>
          <SectionHeading
            eyebrow="Почему этого мало"
            title="Хорошие средства по отдельности — ещё не хороший уход"
            lead="Разбор показывает, что внутри одного флакона. Но кожа получает всё сразу: сыворотку, тоник, крем и SPF."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PAINS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-ink-wash p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-glass">
                  <Icon className="h-5 w-5 text-coral-600" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{text}</p>
              </div>
            ))}
          </div>
          <Link
            href="#polka"
            className="mt-8 inline-flex items-center gap-2 text-base font-semibold underline underline-offset-4 hover:text-brand-700"
          >
            Это решает «Моя полка» <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Container>
      </section>

      <Divider />

      {/* ═══ 4. МОЯ ПОЛКА ═══ */}
      <section id="polka" className="scroll-mt-20 py-14 lg:py-20">
        <Container>
          <SectionHeading
            eyebrow="Моя полка"
            title="Ваш уход в одном месте — с проверкой совместимости"
            lead="«Моя полка» — личный кабинет с вашими средствами. Добавьте то, чем пользуетесь, и сервис покажет, что с чем нельзя сочетать, что дублируется и в каком порядке всё наносить."
          />
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="min-w-0 lg:col-span-5">
              <ul className="divide-y divide-ink-hair">
                {SHELF_FEATURES.map(({ icon: Icon, title, text, pro }) => (
                  <li key={title} className="flex gap-4 py-5 first:pt-0">
                    <Icon className="mt-0.5 h-6 w-6 shrink-0 text-foreground" strokeWidth={1.5} aria-hidden />
                    <div>
                      <h3 className="flex items-center gap-2 text-base font-semibold">
                        {title}
                        {pro ? <Badge variant="brand">Pro</Badge> : null}
                      </h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button asChild size="lg">
                  <Link href={SIGNUP}>Собрать полку бесплатно</Link>
                </Button>
                <span className="text-sm leading-snug text-ink-muted">
                  {FREE_ITEMS} — бесплатно,
                  <br />
                  без карты
                </span>
              </div>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <ShelfShowcase />
            </div>
          </div>
        </Container>
      </section>

      {/* ═══ 5. ПУТЬ: от разбора до Pro ═══ */}
      <section className="bg-ink-wash py-14 lg:py-20">
        <Container>
          <SectionHeading eyebrow="Как начать" title="Три шага к уходу, в котором всё сочетается" />
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Разберите состав",
                text: "Бесплатно и без регистрации: функции, концентрации, доказательная база, конфликты.",
                tag: "Free",
              },
              {
                title: "Добавьте средства на полку",
                text: `Вход по email без пароля. ${FREE_ITEMS} — бесплатно, с дневником реакций и напоминаниями.`,
                tag: "Free",
              },
              {
                title: "Подключите Pro",
                text: `Совместимость всей полки, режим утро / вечер, поиск дублей и экспорт в PDF — от ${rub(YEAR_PER_MONTH)} в месяц.`,
                tag: "Pro",
              },
            ].map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-7 shadow-glass">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-base font-semibold text-white">
                    {i + 1}
                  </span>
                  <Badge variant={s.tag === "Pro" ? "brand" : "outline"}>{s.tag}</Badge>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ═══ 6. ТАРИФЫ ═══ */}
      <section id="tarify" className="scroll-mt-20 py-14 lg:py-20">
        <Container>
          <SectionHeading
            center
            eyebrow="Стоимость"
            title="Начните бесплатно — подключите Pro, когда полка вырастет"
            lead={`Разбор составов бесплатный всегда. Pro на год — около ${YEAR_PER_DAY} ₽ в день: дешевле, чем одно средство, купленное зря или отложенное из-за раздражения.`}
          />
          <div className="mx-auto mt-12 grid max-w-[1060px] items-stretch gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "relative flex flex-col rounded-2xl bg-white",
                  p.highlight
                    ? "border-2 border-foreground shadow-glass-lg"
                    : "border border-ink-line",
                )}
              >
                {p.flag ? (
                  <span className="absolute -top-3.5 left-6 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold leading-none text-white">
                    {p.flag}
                  </span>
                ) : null}
                <div className="mx-6 border-b border-ink-hair pb-5 pt-7">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-[32px] font-semibold leading-none tracking-tight">{p.price}</span>
                    <span className="text-base text-ink-muted">{p.per}</span>
                  </div>
                  <p className="mt-2 text-sm leading-normal text-ink-muted">{p.note}</p>
                </div>
                <ul className="flex-grow px-6 py-5">
                  {p.features.map((f) => (
                    <li
                      key={f.text}
                      className={cn(
                        "flex items-start gap-3 py-2 text-sm leading-normal",
                        f.on ? "text-ink-soft" : "text-ink-faint line-through decoration-ink-line",
                      )}
                    >
                      {f.on ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-ink-line" aria-hidden />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-6">
                  <Button asChild variant={p.highlight ? "default" : "secondary"} className="w-full">
                    <Link href={p.href}>{p.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-ink-muted">
            Подробности и оплата — на странице{" "}
            <Link href="/pricing" className="font-semibold text-foreground underline underline-offset-4">
              «Тарифы»
            </Link>
          </p>
        </Container>
      </section>

      {/* ═══ 7. НАУКА, А НЕ МАРКЕТИНГ ═══ */}
      <section className="pb-14 lg:pb-20">
        <Container>
          <div className="grid overflow-hidden rounded-3xl bg-mist lg:grid-cols-2">
            <div className="flex flex-col justify-center px-7 py-10 sm:px-12 sm:py-14">
              <span className="eyebrow text-mist-700">Шкала доказательности</span>
              <h2 className="text-[24px] font-semibold leading-tight sm:text-[32px]">
                Наука, а не маркетинг
              </h2>
              <ul className="check-list mt-5">
                <li>«Натуральное» не значит «безопасное», а «химия» не значит «вредное»</li>
                <li>Ингредиенты оцениваются по качеству доказательств, а не по громкости обещаний</li>
                <li>Конфликты активов важнее, чем «натуральность» состава</li>
              </ul>
              <div className="mt-7">
                <Button asChild variant="secondary">
                  <Link href="/ingredients">Каталог ингредиентов</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5 px-7 pb-10 sm:px-12 lg:py-14">
              <div className="rounded-2xl bg-white p-6 shadow-glass">
                {EVIDENCE_LADDER.map((lvl) => (
                  <div key={lvl.label} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold text-foreground">{lvl.label}</span>
                      <span className="text-right text-ink-muted">{lvl.note}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-wash">
                      <div className={cn("h-full rounded-full", lvl.cls)} style={{ width: lvl.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Divider />

      {/* ═══ 7б. РАЗБОРЫ СОСТАВОВ: перелинковка на посадочные ═══ */}
      <section className="py-14 lg:py-20">
        <Container className="grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading
              eyebrow="Составы"
              title="Как читать состав средства"
              lead="Что должно быть в составе крема, шампуня или сыворотки и чего стоит избегать — по научным данным."
            />
          </div>
          <div className="space-y-6 lg:col-span-8">
            <RelatedLandings />
            <Link href="/sostav" className="inline-flex items-center gap-1.5 text-[15px] font-medium underline">
              Как читать состав косметики <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      <Divider />

      {/* ═══ 8. FAQ ═══ */}
      <section className="py-14 lg:py-20">
        <Container className="grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading eyebrow="Вопросы" title="Часто задаваемые вопросы" />
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              Не нашли ответ? Начните с бесплатного разбора — это займёт меньше минуты.
            </p>
          </div>
          <div className="divide-y divide-ink-hair border-y border-ink-hair lg:col-span-8">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0} className="accordion-item">
                <summary>{f.q}</summary>
                <div className="pb-6 pr-10 text-[15px] leading-relaxed text-ink-muted">{f.a}</div>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══ 9. ФИНАЛЬНЫЙ CTA: два входа ═══ */}
      <section id="start" className="pb-16 lg:pb-24">
        <Container>
          <div className="grid gap-5 rounded-3xl bg-ink-wash p-5 sm:p-8 lg:grid-cols-2 lg:gap-8 lg:p-12">
            <div className="rounded-2xl bg-white p-6 shadow-glass sm:p-8">
              <span className="eyebrow">Моя полка</span>
              <h2 className="text-[22px] font-semibold leading-tight sm:text-[26px]">
                Соберите свою полку
              </h2>
              <p className="mb-6 mt-2 text-[15px] leading-relaxed text-ink-muted">
                Пришлём ссылку для входа на email — пароль не нужен.{" "}
                {FREE_ITEMS} на полке, реакции и напоминания — бесплатно.
              </p>
              <SignInForm cta="Собрать полку бесплатно" />
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-glass sm:p-8">
              <span className="eyebrow">Разбор состава</span>
              <h2 className="text-[22px] font-semibold leading-tight sm:text-[26px]">
                Или начните с одного средства
              </h2>
              <p className="mb-6 mt-2 text-[15px] leading-relaxed text-ink-muted">
                Вставьте INCI-список целиком — через запятую, как на упаковке.
              </p>
              <AnalyzeForm id="inci-bottom" rows={3} />
            </div>
          </div>
        </Container>
      </section>

      <StickyCta
        afterId="hero"
        hideFromId="start"
        title="«Моя полка»: совместимость и режим для ваших средств"
        subtitle={
          stats
            ? `${stats.ingredients.toLocaleString("ru-RU")} ${plural(stats.ingredients, "ингредиент", "ингредиента", "ингредиентов")} · ${stats.conflicts.toLocaleString("ru-RU")} ${plural(stats.conflicts, "конфликт", "конфликта", "конфликтов")} активов · режим утро / вечер`
            : "Проверка совместимости · поиск дублей · режим утро / вечер"
        }
        price="0 ₽"
        priceNote={`${FREE_ITEMS} на полке`}
        href={SIGNUP}
        cta="Собрать полку"
      />
    </main>
  );
}
