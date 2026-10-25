import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import {
  BarChart3,
  Check,
  Images,
  Link2,
  Megaphone,
  Minus,
  Search,
  ShieldCheck,
  TicketPercent,
  X,
} from "lucide-react";

import { BrandCardPreview } from "@/components/brands/brand-card-preview";
import { BrandPricing } from "@/components/brands/brand-pricing";
import { BrandLeadForm } from "@/components/brand-lead-form";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { EXTRA_PRODUCTS_PACK, FOUNDING_OFFER, formatRub } from "@/lib/brands/tariffs";
import { prisma } from "@/lib/prisma";
import { NO_BRAND } from "@/lib/products/brand";
import { faqJsonLd } from "@/lib/seo/site";
import { cn, pluralRu } from "@/lib/utils";

const TITLE = "Buty для брендов: ссылки на покупку, промокоды и аналитика";
const DESCRIPTION =
  "Разместите на карточках своих средств в Buty ссылки на официальный магазин или маркетплейс, фото бренда, промокоды и рекламное описание. Тарифы от 9 900 ₽ в месяц, бренд-аккаунт бесплатно.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/for-brands" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-brands" },
};

// Цифры каталога — из БД на запрос (без пререндера на сборке), с кэшем на час.
export const dynamic = "force-dynamic";

interface CatalogStats {
  products: number;
  brands: number;
  ingredients: number;
}

const getCatalogStats = unstable_cache(
  async (): Promise<CatalogStats | null> => {
    try {
      const [products, brandRows, ingredients] = await Promise.all([
        prisma.product.count({ where: { hidden: false } }),
        prisma.product.groupBy({
          by: ["brand"],
          where: { hidden: false, brand: { notIn: [NO_BRAND, ""] } },
        }),
        prisma.ingredient.count(),
      ]);
      return products > 0 ? { products, brands: brandRows.length, ingredients } : null;
    } catch {
      return null;
    }
  },
  ["for-brands-stats"],
  { revalidate: 3600 },
);

/* ── Что получает бренд ── */
const FEATURES = [
  {
    icon: Link2,
    title: "Ссылки на покупку",
    text: "Ведите покупательницу сразу в карточку товара: на официальный сайт бренда или на маркетплейс.",
    points: [
      "До 3 ссылок на средство",
      "UTM-метки добавляем сами",
      "Проверяем, что ссылки открываются",
    ],
  },
  {
    icon: Images,
    title: "Фото бренда",
    text: "Ваши фотографии продукта вместо пустой карточки: упаковка, текстура, способ применения.",
    points: ["До 6 фото на карточку", "Модерация перед публикацией", "Без «до/после» и обещаний на фото"],
  },
  {
    icon: TicketPercent,
    title: "Промокоды в карточке",
    text: "Скидка на покупку по вашей ссылке или в любом магазине. Код скрыт, пока покупательница не нажмёт «Показать промокод».",
    points: [
      "Кода нет в HTML страницы — парсеры и агрегаторы промокодов его не соберут",
      "Срок действия: после даты код скроется сам",
      "Видно, сколько раз код раскрыли и скопировали",
    ],
  },
  {
    icon: Megaphone,
    title: "Рекламное описание",
    text: "Расскажите о продукте своими словами в блоке «От бренда». Он стоит под нашим разбором и помечен «Реклама».",
    points: ["До 600 знаков", "Модерация: без медицинских обещаний", "Маркировку рекламы (erid) делаем мы"],
  },
];

/* ── Что видно в кабинете ── */
const ANALYTICS: { title: string; tier: string }[] = [
  { title: "Сколько раз разобрали состав ваших средств", tier: "Бесплатно" },
  { title: "Просмотры карточек средств", tier: "Базовый" },
  { title: "Переходы по каждой ссылке: магазин, маркетплейс", tier: "Базовый" },
  { title: "Раскрытия и копирования промокодов", tier: "Витрина" },
  { title: "Сколько людей держат средство на полке и используют", tier: "Бренд Про" },
  { title: "С чем сочетают ваше средство и на что меняют", tier: "Бренд Про" },
  { title: "Реакции кожи — агрегатом, от 10 человек в выборке", tier: "Бренд Про" },
];

/* ── Таблица сравнения ── */
type Cell = boolean | string;
const COMPARE_HEAD = ["Бренд-аккаунт", "Базовый", "Витрина", "Бренд Про", "Сеть"];
const COMPARE: { label: string; cells: Cell[] }[] = [
  { label: "Средств в тарифе", cells: ["все", "до 30", "до 60", "до 200", "без лимита"] },
  { label: "Профиль бренда, исправление составов", cells: [true, true, true, true, true] },
  { label: "Ссылки на покупку (до 3 на средство)", cells: [false, true, true, true, true] },
  { label: "Аналитика просмотров и переходов", cells: [false, true, true, true, true] },
  { label: "Фото бренда (до 6 на карточку)", cells: [false, false, true, true, true] },
  { label: "Промокоды, скрытые до клика", cells: [false, false, "1 на средство", "несколько", "несколько"] },
  { label: "Рекламное описание «От бренда»", cells: [false, false, true, true, true] },
  { label: "Аналитика промокодов", cells: [false, false, true, true, true] },
  { label: "Промо по расписанию", cells: [false, false, false, true, true] },
  { label: "Аналитика полки (обезличенно)", cells: [false, false, false, true, true] },
  { label: "Ежемесячный отчёт", cells: [false, false, false, true, true] },
  { label: "Несколько брендов, выгрузки, менеджер", cells: [false, false, false, false, true] },
];

const CAN = [
  "Поставить ссылки на свой магазин и маркетплейсы",
  "Добавить фото, промокоды и описание в блоке «От бренда»",
  "Исправить ошибку в составе — по фото упаковки",
  "Видеть обезличенную статистику по своим средствам",
];
const CANNOT = [
  "Изменить оценку, вердикт или флаги разбора",
  "Скрыть ингредиенты, аллергены или конфликты активов",
  "Поднять своё средство в разборе или в «похожих по составу»",
  "Получить email, анкеты и полки конкретных людей",
];

const STEPS = [
  { title: "Заявка", text: "Расскажите о бренде и выберите тариф — или оставьте выбор нам." },
  { title: "Созвон на 20 минут", text: "Проверим, какие ваши средства уже есть в каталоге, и добавим недостающие." },
  { title: "Договор и счёт", text: "Работаем по договору, оплата по счёту — помесячно или за год." },
  { title: "Запуск", text: "Вы загружаете ссылки, фото и промокоды. После модерации они появляются в карточках." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Влияет ли оплата на оценку состава?",
    a: "Нет. Разбор, вердикт и флаги считаются одинаково для всех средств, платит бренд или нет. Бренд платит за ссылки, фото, промокоды, описание и аналитику. Рекламные материалы стоят под разбором и помечены «Реклама».",
  },
  {
    q: "Зачем скрывать промокод?",
    a: "Код не попадает в HTML страницы и загружается только после нажатия «Показать промокод». Так его не соберут парсеры конкурентов и агрегаторы промокодов, а вы видите, сколько людей действительно заинтересовались скидкой.",
  },
  {
    q: "Это реклама? Нужна ли маркировка?",
    a: "Да, блок «От бренда» и промокоды — это реклама. Мы помечаем их «Реклама», получаем токен erid через оператора рекламных данных и отчитываемся в ЕРИР. От бренда нужны только реквизиты рекламодателя.",
  },
  {
    q: "Какие ссылки можно ставить?",
    a: "На официальный сайт бренда (домен подтверждаем при подключении) и на карточки товара на маркетплейсах и в сетях косметики. До трёх ссылок на средство. UTM-метки добавляем автоматически.",
  },
  {
    q: "Моего средства нет в каталоге. Что делать?",
    a: "Пришлите фото упаковки с составом — добавим средство в каталог бесплатно, на любом тарифе.",
  },
  {
    q: "В составе моего средства ошибка.",
    a: "Исправим бесплатно, в том числе в бесплатном бренд-аккаунте. Нужно фото упаковки с актуальным составом.",
  },
  {
    q: "Можно ли добавить больше средств, чем в тарифе?",
    a: `Да: +${EXTRA_PRODUCTS_PACK.count} средств — ${formatRub(EXTRA_PRODUCTS_PACK.monthly)} в месяц к любому платному тарифу.`,
  },
  {
    q: "Как оплатить и можно ли отказаться?",
    a: "По договору и счёту. Помесячный тариф без минимального срока: его можно просто не продлевать. При оплате за год два месяца в подарок.",
  },
];

function CompareCell({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-success" aria-label="есть" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-ink-faint" aria-label="нет" />;
  return <span className="text-sm font-medium">{value}</span>;
}

function Divider() {
  return (
    <Container>
      <hr className="border-ink-hair" />
    </Container>
  );
}

export default async function ForBrandsPage() {
  const stats = await getCatalogStats();

  return (
    <main>
      <JsonLd data={faqJsonLd(FAQ)} />

      {/* ═══ 1. HERO ═══ */}
      <section>
        <Container className="grid items-start gap-10 pb-14 pt-10 lg:grid-cols-12 lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="lg:col-span-7 lg:pt-6">
            <Badge variant="outline" className="mb-5">
              Для брендов и дистрибьюторов
            </Badge>
            <h1 className="text-[32px] font-semibold leading-[1.08] sm:text-[44px] lg:text-[52px]">
              Покажите формулу тем, кто читает состав перед покупкой
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
              Buty разбирает составы косметики по научным данным. На карточке вашего
              средства покупательница видит разбор, а рядом — ваши ссылки на покупку,
              фото и промокод.
            </p>
            <ul className="check-list mt-6">
              <li>Ссылки на ваш магазин или карточку на маркетплейсе</li>
              <li>Промокод, который видит только тот, кто нажал «Показать»</li>
              <li>Аналитика: разборы, переходы, раскрытия промокодов</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href="#zayavka">Оставить заявку</a>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <a href="#tarify">Смотреть тарифы</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Бренд-аккаунт бесплатно. Платные тарифы — от {formatRub(9900)} в месяц.
            </p>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <BrandCardPreview />
          </div>
        </Container>
      </section>

      {/* ═══ 2. КАТАЛОГ: ваш бренд, скорее всего, уже здесь ═══ */}
      <section className="pb-14 lg:pb-20">
        <Container>
          <div className="grid gap-6 rounded-2xl border border-ink-line p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <h2 className="text-[22px] font-semibold leading-snug">
                Ваши средства, скорее всего, уже в каталоге
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                Найдите свой бренд и посмотрите, как выглядит разбор ваших составов.
              </p>
              <form action="/products" method="get" className="mt-4 flex gap-2">
                <label htmlFor="brand-search" className="sr-only">
                  Название бренда
                </label>
                <input
                  id="brand-search"
                  name="q"
                  placeholder="Название бренда"
                  className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-white px-4 text-base placeholder:text-ink-muted focus-visible:border-foreground focus-visible:shadow-[0_0_0_1px_#222] focus-visible:outline-none"
                />
                <Button type="submit" variant="warm" className="shrink-0" aria-label="Найти">
                  <Search className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Найти</span>
                </Button>
              </form>
            </div>
            {stats ? (
              <div className="grid grid-cols-3 lg:col-span-7">
                {[
                  {
                    num: stats.products,
                    txt: pluralRu(stats.products, "средство с разбором", "средства с разбором", "средств с разбором"),
                  },
                  {
                    num: stats.brands,
                    txt: pluralRu(stats.brands, "бренд в каталоге", "бренда в каталоге", "брендов в каталоге"),
                  },
                  {
                    num: stats.ingredients,
                    txt: pluralRu(stats.ingredients, "ингредиент в базе", "ингредиента в базе", "ингредиентов в базе"),
                  },
                ].map((s, i) => (
                  <div key={s.txt} className={cn("px-2 py-2 text-center sm:px-4", i > 0 && "border-l border-ink-line")}>
                    <div className="text-[22px] font-semibold leading-none tracking-tight sm:text-[28px]">
                      {s.num.toLocaleString("ru-RU")}
                    </div>
                    <div className="mx-auto mt-2 max-w-[160px] text-xs leading-snug text-ink-muted sm:text-sm">
                      {s.txt}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      <Divider />

      {/* ═══ 3. ВОЗМОЖНОСТИ ═══ */}
      <section id="vozmozhnosti" className="scroll-mt-20 py-14 lg:py-20">
        <Container>
          <SectionHeading
            eyebrow="Возможности"
            title="Всё, что нужно карточке, чтобы из неё покупали"
            lead="Покупательница уже изучает состав вашего средства. Осталось дать ей, где купить и почему сейчас."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text, points }) => (
              <div key={title} className="rounded-2xl bg-ink-wash p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-glass">
                  <Icon className="h-5 w-5 text-brand" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{text}</p>
                <ul className="check-list mt-3">
                  {points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══ 4. АНАЛИТИКА ═══ */}
      <section className="bg-ink-wash py-14 lg:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Аналитика"
              title="Видно, за что вы платите"
              lead="В кабинете бренда — цифры по каждому средству. Только обезличенные данные: мы не передаём брендам email, анкеты кожи и полки конкретных людей."
            />
            <div className="mt-6 flex items-center gap-3 text-sm text-ink-muted">
              <BarChart3 className="h-5 w-5 shrink-0 text-foreground" aria-hidden />
              Реакции и анкеты кожи показываем только агрегатом от 10 человек.
            </div>
          </div>
          <ul className="divide-y divide-ink-hair rounded-2xl bg-white px-6 shadow-glass lg:col-span-7">
            {ANALYTICS.map((a) => (
              <li key={a.title} className="flex items-center justify-between gap-4 py-4">
                <span className="text-[15px] leading-snug">{a.title}</span>
                <Badge variant={a.tier === "Бесплатно" ? "success" : a.tier === "Бренд Про" ? "teal" : "default"} className="shrink-0">
                  {a.tier}
                </Badge>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ═══ 5. ДОВЕРИЕ ═══ */}
      <section className="py-14 lg:py-20">
        <Container>
          <SectionHeading
            eyebrow="Правило Buty"
            title="Оценки не продаются"
            lead="Наша аудитория доверяет разбору, потому что он одинаковый для всех. Это доверие и делает ваши ссылки и промокоды рабочими."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-ink-hair p-7">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-success" aria-hidden /> Бренд может
              </h3>
              <ul className="mt-4 space-y-3">
                {CAN.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[15px] leading-snug">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-hair p-7">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <X className="h-5 w-5 text-coral-600" aria-hidden /> Бренд не может ни на каком тарифе
              </h3>
              <ul className="mt-4 space-y-3">
                {CANNOT.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[15px] leading-snug">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-coral-600" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <Divider />

      {/* ═══ 6. ТАРИФЫ ═══ */}
      <section id="tarify" className="scroll-mt-20 py-14 lg:py-20">
        <Container>
          <SectionHeading
            eyebrow="Тарифы"
            title="Начните бесплатно, платите за то, что работает"
            lead={`Все цены в месяц. К любому платному тарифу можно добавить +${EXTRA_PRODUCTS_PACK.count} средств за ${formatRub(EXTRA_PRODUCTS_PACK.monthly)} в месяц.`}
          />

          <div className="mt-8 rounded-2xl bg-brand-50 p-5 sm:p-6">
            <p className="text-base font-semibold text-brand-800">
              Брендам-основателям: −{FOUNDING_OFFER.discountPercent}% на {FOUNDING_OFFER.months}{" "}
              {pluralRu(FOUNDING_OFFER.months, "месяц", "месяца", "месяцев")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Первые {FOUNDING_OFFER.brands} брендов, которые подключатся к платному тарифу,
              получают скидку {FOUNDING_OFFER.discountPercent}%. Например, Витрина — {formatRub(9950)} в месяц вместо {formatRub(19900)}.
            </p>
          </div>

          <div className="mt-8">
            <BrandPricing />
          </div>

          {/* Сравнение */}
          <h3 className="mt-14 text-[22px] font-semibold">Сравнение тарифов</h3>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-hair">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-ink-wash">
                  <th scope="col" className="px-4 py-3 text-sm font-semibold">
                    Возможность
                  </th>
                  {COMPARE_HEAD.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className={cn("px-3 py-3 text-center text-sm font-semibold", h === "Витрина" && "text-brand-700")}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.label} className="border-t border-ink-hair">
                    <th scope="row" className="px-4 py-3 text-sm font-normal text-ink-soft">
                      {row.label}
                    </th>
                    {row.cells.map((c, i) => (
                      <td key={COMPARE_HEAD[i]} className="px-3 py-3 text-center">
                        <CompareCell value={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* ═══ 7. КАК ПОДКЛЮЧИТЬСЯ ═══ */}
      <section className="bg-ink-wash py-14 lg:py-20">
        <Container>
          <SectionHeading eyebrow="Как подключиться" title="Четыре шага до первых переходов" />
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-7 shadow-glass">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ═══ 8. FAQ ═══ */}
      <section className="py-14 lg:py-20">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading eyebrow="Вопросы" title="Частые вопросы брендов" />
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              Не нашли ответ? Напишите в заявке — ответим по email.
            </p>
          </div>
          <div className="divide-y divide-ink-hair border-y border-ink-hair lg:col-span-8">
            {FAQ.map((f) => (
              <details key={f.q} className="accordion-item">
                <summary>{f.q}</summary>
                <p className="pb-5 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══ 9. ЗАЯВКА ═══ */}
      <section id="zayavka" className="scroll-mt-20 bg-brand-50 py-14 lg:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Заявка"
              title="Подключите бренд к Buty"
              lead="Расскажите о бренде — вернёмся в течение пары рабочих дней с условиями и списком ваших средств в каталоге."
            />
            <ul className="check-list mt-6">
              <li>Бренд-аккаунт — бесплатно</li>
              <li>Договор и оплата по счёту</li>
              <li>Без минимального срока на помесячных тарифах</li>
            </ul>
            <p className="mt-6 text-sm text-ink-muted">
              Хотите сначала посмотреть каталог?{" "}
              <Link href="/products" className="font-semibold underline underline-offset-4 hover:text-brand-700">
                Перейти к средствам
              </Link>
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-pop sm:p-8 lg:col-span-7">
            <BrandLeadForm />
          </div>
        </Container>
      </section>
    </main>
  );
}
