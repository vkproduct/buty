import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Copy,
  FlaskConical,
  LayoutGrid,
  Link2,
  ListOrdered,
  Sun,
  Ticket,
} from "lucide-react";

import { AnalyzeForm } from "@/components/analyze-form";
import { ShelfShowcase } from "@/components/shelf-showcase";
import { SignInForm } from "@/components/sign-in-form";
import { StickyCta } from "@/components/sticky-cta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { RelatedLandings } from "@/components/seo/landing-blocks";
import { absoluteUrl, faqJsonLd, SITE_NAME, webApplicationJsonLd } from "@/lib/seo/site";

const HOME_TITLE = "Проверить состав косметики онлайн бесплатно — разбор и расшифровка на русском";
const HOME_DESCRIPTION =
  "Бесплатная проверка состава косметики онлайн: вставьте INCI-список — расшифруем каждый ингредиент на русском, покажем комедогенность, отдушки и конфликты активов.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/" },
};

// Цифры базы подтягиваются из БД на каждый запрос (без пререндера на сборке,
// иначе сборка зависит от доступности БД и может не уложиться в лимит Vercel).
export const dynamic = "force-dynamic";

/** Русское склонение после числа: 1 средство, 2 средства, 5 средств. */
function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
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
  },
  {
    icon: Sun,
    title: "Режим утро / вечер",
    text: "Готовый порядок нанесения с учётом конфликтов и чередования активов.",
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
    q: "Почему Buty бесплатный?",
    a: "Мы зарабатываем на B2B: бренды и дистрибьюторы платят за обезличенную аналитику рынка и за ссылки на покупку своих средств. Ваши данные мы брендам не передаём, а оценки составов не продаются.",
  },
  {
    q: "Есть ли лимит на полке?",
    a: "Нет. Добавляйте сколько угодно средств, все функции полки бесплатны.",
  },
  {
    q: "Нужна ли регистрация?",
    a: "Для разбора состава — нет. Для «Моей полки» нужен вход по email: пришлём ссылку, пароль не нужен.",
  },
  {
    q: "Как добавить средство, которого нет в каталоге?",
    a: "Добавьте его как «своё средство»: укажите название и вставьте состав (INCI-список). Активы из состава будут учтены в проверке совместимости и в режиме.",
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

/* ── Что получают бренды (тёмный B2B-блок) ── */
const BRAND_PERKS = [
  {
    icon: Link2,
    title: "Ссылка «Где купить»",
    text: "На официальный магазин или карточку на маркетплейсе — прямо в карточке средства.",
  },
  {
    icon: Ticket,
    title: "Промокод в карточке",
    text: "Открывается по клику покупателя, поэтому конкуренты не соберут его парсером.",
  },
  {
    icon: BarChart3,
    title: "Аналитика спроса",
    text: "Просмотры карточек и переходы — обезличенно, без персональных данных пользователей.",
  },
];

export default async function HomePage() {
  const stats = await getStats();

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "ru",
    isAccessibleForFree: true,
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
      <JsonLd data={webApplicationJsonLd()} />
      <JsonLd data={faqJsonLd(FAQ)} />

      {/* ═══ 1. HERO: градиентная карточка с бесплатным разбором ═══ */}
      <section id="hero" className="bg-portal pb-12 pt-8 sm:pt-12 lg:pb-16 lg:pt-[clamp(24px,3vh,48px)]">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-spotlight shadow-sm">
            {/* Декоративные кольца — «молекулы» на фоне, без смысловой нагрузки */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full border border-white/15"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 top-16 h-[260px] w-[260px] rounded-full border border-white/10"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 left-1/3 h-[360px] w-[360px] rounded-full bg-white/5"
            />

            <div className="relative grid items-center gap-10 p-5 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:px-16 lg:py-[clamp(32px,5vh,64px)]">
              <div className="text-white lg:col-span-7">
                <Badge variant="glass" className="mb-6 px-3.5 lg:mb-4 py-1.5 text-[13px]">
                  Доказательный уход, а не маркетинг
                </Badge>
                <h1 className="text-[29px] font-bold leading-[1.1] min-[400px]:text-[32px] sm:text-[48px] lg:text-[clamp(40px,5.5vh,58px)]">
                  Проверьте состав косметики онлайн и&nbsp;узнайте, как она работает
                </h1>
                <p className="mt-5 max-w-xl text-lg lg:mt-4 font-medium leading-relaxed text-white/90">
                  Разбираем составы по научным данным, а «Моя полка» проверяет,
                  сочетаются ли ваши средства, и собирает режим утро / вечер.
                </p>
                <ul className="check-list mt-6 lg:mt-4 [&>li::before]:border-white [&>li]:text-white/90">
                  <li>Функция, рабочая концентрация и уровень доказательности каждого ингредиента</li>
                  <li>Конфликты активов — в одном средстве и между средствами</li>
                  <li>Готовый порядок нанесения для вашей полки</li>
                </ul>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-6">
                  <Button asChild variant="white" size="lg" className="px-8">
                    <Link href="#razbor">Разобрать состав бесплатно</Link>
                  </Button>
                  <Button asChild variant="glass" size="lg" className="px-8">
                    <Link href="#polka">Что такое «Моя полка»</Link>
                  </Button>
                </div>
                <p className="mt-4 text-sm text-white/75 lg:mt-3">
                  Всё бесплатно. Разбор — без регистрации, полка — вход по email без пароля.
                </p>
              </div>

              <div
                id="razbor"
                className="scroll-mt-28 rounded-2xl bg-white p-6 text-foreground shadow-pop sm:p-8 lg:col-span-5"
              >
                <h2 className="text-[22px] font-bold">Разбор состава</h2>
                <p className="mb-5 mt-1.5 text-[15px] leading-relaxed text-ink-muted">
                  Вставьте INCI-список с карточки товара или загрузите фото состава
                  с упаковки — разберём каждый ингредиент за несколько секунд.
                </p>
                <AnalyzeForm id="inci-hero" />
                <p className="mt-4 text-center text-sm text-ink-muted">
                  Бесплатно и без регистрации
                </p>
              </div>
            </div>
          </div>

          {/* ═══ 2. ДОВЕРИЕ: размер базы ═══ */}
          {stats ? (
            <div className="mt-8 grid grid-cols-2 rounded-2xl bg-white shadow-soft lg:grid-cols-4">
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
                    i % 2 === 1 && "border-l border-ink-hair",
                    i >= 2 && "border-t border-ink-hair lg:border-t-0",
                    i === 2 && "lg:border-l",
                  )}
                >
                  <div className="text-[28px] font-bold leading-none tracking-tight">
                    {s.num.toLocaleString("ru-RU")}
                  </div>
                  <div className="mx-auto mt-2 max-w-[200px] text-sm leading-snug text-ink-muted">
                    {s.txt}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Container>
      </section>

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
              <div key={title} className="rounded-2xl bg-portal p-7 sm:p-8">
                <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-soft">
                  <Icon className="h-6 w-6 text-coral-600" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="text-lg font-bold leading-snug">{title}</h3>
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

      {/* ═══ 4. МОЯ ПОЛКА: карточки-инструменты + промо-карточка ═══ */}
      <section id="polka" className="scroll-mt-20 border-t border-ink-hair bg-portal py-16 lg:py-24">
        <Container>
          <SectionHeading
            center
            eyebrow="Моя полка"
            title="Ваш уход в одном месте — с проверкой совместимости"
            lead="Добавьте то, чем пользуетесь, и сервис покажет, что с чем нельзя сочетать, что дублируется и в каком порядке всё наносить."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SHELF_FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="tool-card">
                <span className="tool-icon">
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="text-xl font-bold leading-snug">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{text}</p>
              </div>
            ))}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-promo p-7 text-white shadow-float sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-white/10"
              />
              <div className="relative">
                <h3 className="text-2xl font-bold leading-tight">Соберите полку</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/90">
                  Вход по email без пароля. Полка без лимита — всё бесплатно, без карты.
                </p>
              </div>
              <div className="relative mt-8">
                <Button asChild variant="white" className="px-6">
                  <Link href={SIGNUP}>
                    Собрать полку бесплатно <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══ 5. ПУТЬ: от разбора до полки + демо полки ═══ */}
      <section className="py-16 lg:py-24">
        <Container className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="min-w-0 lg:col-span-5">
            <SectionHeading eyebrow="Как начать" title="Три шага к уходу, в котором всё сочетается" />
            <ol className="mt-8 space-y-4">
              {[
                {
                  title: "Разберите состав",
                  text: "Бесплатно и без регистрации: функции, концентрации, доказательная база, конфликты.",
                },
                {
                  title: "Добавьте средства на полку",
                  text: "Вход по email без пароля. Полка без лимита, с дневником реакций и напоминаниями.",
                },
                {
                  title: "Соберите режим",
                  text: "Совместимость всей полки, поиск дублей и готовый порядок нанесения утром и вечером.",
                },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-5 rounded-2xl bg-portal p-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-base font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{s.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-w-0 lg:col-span-7">
            <ShelfShowcase />
          </div>
        </Container>
      </section>

      {/* ═══ 6. ВСЁ БЕСПЛАТНО ═══ */}
      <section id="tarify" className="scroll-mt-20 border-t border-ink-hair bg-portal py-16 lg:py-24">
        <Container>
          <SectionHeading
            center
            eyebrow="Стоимость"
            title="Всё бесплатно — начните с разбора состава"
            lead="Разбор составов и вся «Моя полка» бесплатны: без подписки, без карты, без лимитов."
          />
          <div className="mx-auto mt-12 max-w-[640px]">
            <div className="relative flex flex-col rounded-3xl bg-white shadow-float">
              <div className="mx-6 border-b border-ink-hair pb-5 pt-7 sm:mx-8">
                <h3 className="text-lg font-bold">Бесплатно. Полностью.</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[36px] font-bold leading-none tracking-tight">0 ₽</span>
                </div>
                <p className="mt-2 text-sm leading-normal text-ink-muted">Без оплаты и привязки карты</p>
              </div>
              <ul className="flex-grow px-6 py-5 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:px-8">
                {[
                  "Разбор составов текстом и по фото",
                  "Полка без лимита",
                  "Совместимость всех средств",
                  "Режим утро / вечер",
                  "Поиск дублей",
                  "Дневник реакций и напоминания",
                  "Экспорт полки в PDF",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 py-2 text-sm leading-normal text-ink-soft">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={2.5} aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="px-6 pb-7 sm:px-8">
                <Button asChild size="lg" className="w-full">
                  <Link href={SIGNUP}>Собрать полку</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══ 7. НАУКА, А НЕ МАРКЕТИНГ ═══ */}
      <section className="py-16 lg:py-24">
        <Container>
          <div className="grid overflow-hidden rounded-3xl bg-portal lg:grid-cols-2">
            <div className="flex flex-col justify-center px-7 py-10 sm:px-12 sm:py-14">
              <span className="eyebrow">Шкала доказательности</span>
              <h2 className="text-[26px] font-bold leading-tight sm:text-[30px]">
                Наука, а не маркетинг
              </h2>
              <ul className="check-list mt-5">
                <li>«Натуральное» не значит «безопасное», а «химия» не значит «вредное»</li>
                <li>Ингредиенты оцениваются по качеству доказательств, а не по громкости обещаний</li>
                <li>Конфликты активов важнее, чем «натуральность» состава</li>
              </ul>
              <div className="mt-7">
                <Button asChild variant="outline">
                  <Link href="/ingredients">Каталог ингредиентов</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5 px-7 pb-10 sm:px-12 lg:py-14">
              <div className="rounded-2xl bg-white p-6 shadow-soft">
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

      {/* ═══ 8. ДЛЯ БРЕНДОВ: тёмный B2B-блок ═══ */}
      <section className="bg-foreground py-16 text-white lg:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <span className="mb-3 block text-xs font-bold uppercase tracking-[0.12em] text-brand-400">
              Для брендов и дистрибьюторов
            </span>
            <h2 className="text-[28px] font-bold leading-tight sm:text-[36px]">
              Покажите свои средства тем, кто читает составы
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              Buty бесплатен для пользователей и зарабатывает на брендах. При этом оценки
              составов не продаются: бренды не покупают и не меняют их.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="white" size="lg" className="px-8">
                <Link href="/for-brands">Тарифы для брендов</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border border-white/20 bg-white/5 px-8 font-bold text-white shadow-none hover:bg-white/10"
              >
                <Link href="/for-brands#zayavka">Оставить заявку</Link>
              </Button>
            </div>
          </div>
          <ul className="grid gap-4 lg:col-span-6">
            {BRAND_PERKS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-300">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ═══ 9. РАЗБОРЫ СОСТАВОВ: перелинковка на посадочные ═══ */}
      <section className="py-16 lg:py-24">
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

      {/* ═══ 10. FAQ ═══ */}
      <section className="border-t border-ink-hair bg-portal py-16 lg:py-24">
        <Container className="grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading eyebrow="Вопросы" title="Часто задаваемые вопросы" />
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              Не нашли ответ? Начните с бесплатного разбора — это займёт меньше минуты.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-6 shadow-soft sm:px-8 lg:col-span-8">
            <div className="divide-y divide-ink-hair">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0} className="accordion-item">
                  <summary>{f.q}</summary>
                  <div className="pb-6 pr-10 text-[15px] leading-relaxed text-ink-muted">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ═══ 11. ФИНАЛЬНЫЙ CTA: два входа ═══ */}
      <section id="start" className="py-16 lg:py-24">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-ink-hair bg-white p-6 shadow-soft sm:p-8">
              <span className="eyebrow">Моя полка</span>
              <h2 className="text-[22px] font-bold leading-tight sm:text-[26px]">
                Соберите свою полку
              </h2>
              <p className="mb-6 mt-2 text-[15px] leading-relaxed text-ink-muted">
                Пришлём ссылку для входа на email — пароль не нужен.{" "}
                Вся полка, реакции и напоминания — бесплатно.
              </p>
              <SignInForm cta="Собрать полку бесплатно" />
            </div>
            <div className="rounded-2xl border border-ink-hair bg-white p-6 shadow-soft sm:p-8">
              <span className="eyebrow">Разбор состава</span>
              <h2 className="text-[22px] font-bold leading-tight sm:text-[26px]">
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
        priceNote="вся полка бесплатно"
        href={SIGNUP}
        cta="Собрать полку"
      />
    </main>
  );
}
