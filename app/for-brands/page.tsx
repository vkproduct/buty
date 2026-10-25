import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CircleCheck,
  Images,
  Link2,
  Megaphone,
  Minus,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
} from "lucide-react";

import { BrandCardPreview } from "@/components/brands/brand-card-preview";
import { BrandPricing } from "@/components/brands/brand-pricing";
import { BrandRoiCard } from "@/components/brands/brand-roi-card";
import { BrandLeadForm } from "@/components/brand-lead-form";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EXTRA_PRODUCTS_PACK, FOUNDING_OFFER, formatRub } from "@/lib/brands/tariffs";
import { prisma } from "@/lib/prisma";
import { NO_BRAND } from "@/lib/products/brand";
import { faqJsonLd } from "@/lib/seo/site";
import { cn, pluralRu } from "@/lib/utils";

const TITLE = "Buty для брендов: ссылки на покупку, промокоды и аналитика";
const DESCRIPTION =
  "Разместите на карточках своих средств в Buty ссылки на официальный магазин или маркетплейс, фото бренда, промокоды и рекламное описание. Бренд-аккаунт бесплатно, тарифы от 9 900 ₽ в месяц, без комиссии с продаж.";

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
}

const getCatalogStats = unstable_cache(
  async (): Promise<CatalogStats | null> => {
    try {
      const [products, brandRows] = await Promise.all([
        prisma.product.count({ where: { hidden: false } }),
        prisma.product.groupBy({
          by: ["brand"],
          where: { hidden: false, brand: { notIn: [NO_BRAND, ""] } },
        }),
      ]);
      return products > 0 ? { products, brands: brandRows.length } : null;
    } catch {
      return null;
    }
  },
  ["for-brands-stats"],
  { revalidate: 3600 },
);

/* ── 2. Знакомо? ── */
const PAINS = [
  {
    title: "Дорогой клик",
    text: "Ставки на маркетплейсах растут, а покупатель всё равно уходит к соседней карточке с похожим составом.",
  },
  {
    title: "Вопросы о составе",
    text: "Покупатели проверяют INCI, спрашивают про комедогенность и отдушки — и ищут ответы не у вас.",
  },
  {
    title: "Промокоды утекают",
    text: "Код для блогера через день оказывается в агрегаторах промокодов и съедает маржу.",
  },
  {
    title: "Спрос не виден",
    text: "Непонятно, с какими средствами сравнивают ваши и почему в итоге выбирают другие.",
  },
];

/* ── 3. Три шага ── */
const STEPS = [
  {
    icon: Building2,
    title: "1. Подключите бренд",
    text: "Оставьте заявку — проверим, какие ваши средства уже в каталоге, и добавим недостающие.",
    tag: "Бесплатно",
  },
  {
    icon: ShoppingBag,
    title: "2. Добавьте ссылки и промо",
    text: "Ссылки на магазин или маркетплейс, фото, промокоды и описание появятся в карточках после модерации.",
    tag: "Без программиста",
  },
  {
    icon: BarChart3,
    title: "3. Получайте покупателей",
    text: "Покупательница изучает состав, видит вашу ссылку и промокод и идёт покупать. Вы видите каждый переход.",
    tag: "Без комиссии",
  },
];

/* ── 4. Как выглядит в карточке ── */
const FEATURES = [
  { icon: Link2, title: "Ссылки на покупку", text: "До 3 на средство: официальный сайт или маркетплейс, UTM-метки добавляем сами." },
  { icon: Images, title: "Фото бренда", text: "До 6 фото на карточку: упаковка, текстура, применение. С модерацией." },
  {
    icon: TicketPercent,
    title: "Промокоды, скрытые до клика",
    text: "Кода нет в HTML страницы — парсеры и агрегаторы промокодов его не соберут. Истёк срок — код скрывается сам.",
  },
  {
    icon: Megaphone,
    title: "Описание «От бренда»",
    text: "До 600 знаков под нашим разбором, с пометкой «Реклама». Маркировку (erid) делаем мы.",
  },
  {
    icon: BarChart3,
    title: "Аналитика в кабинете",
    text: "Разборы, просмотры, переходы по каждой ссылке, раскрытия промокодов. На Бренд Про — обезличенная аналитика полки.",
  },
];

/* ── 5. Сравнение с рекламой ── */
const VERSUS: { label: string; buty: [string, string]; ads: [string, string] }[] = [
  { label: "Стоимость", buty: ["от 9 900 ₽", "фикс в месяц"], ads: ["Ставка за клик", "растёт с конкуренцией"] },
  { label: "Аудитория", buty: ["Изучает состав", "момент выбора"], ads: ["Листает выдачу", "сравнивает цены"] },
  { label: "Что рядом", buty: ["Независимый разбор", "оценки не продаются"], ads: ["Карточки конкурентов", "в той же выдаче"] },
  { label: "Поиск", buty: ["Страницы средств", "в Яндексе и Google"], ads: ["Нет", "платите за каждый показ"] },
  { label: "Промокод", buty: ["Скрыт до клика", "не утекает"], ads: ["Публичный", "попадает в агрегаторы"] },
];

/* ── Таблица всех тарифов ── */
type Cell = boolean | string;
const COMPARE_HEAD = ["Бренд-аккаунт", "Базовый", "Витрина", "Бренд Про", "Сеть"];
const COMPARE: { label: string; cells: Cell[] }[] = [
  { label: "Цена в месяц", cells: ["0 ₽", "9 900 ₽", "19 900 ₽", "39 900 ₽", "от 79 900 ₽"] },
  { label: "Средств в тарифе", cells: ["все", "до 30", "до 60", "до 200", "без лимита"] },
  { label: "Профиль бренда, исправление составов", cells: [true, true, true, true, true] },
  { label: "Ссылки на покупку (до 3 на средство)", cells: [false, true, true, true, true] },
  { label: "Аналитика просмотров и переходов", cells: [false, true, true, true, true] },
  { label: "Фото бренда (до 6 на карточку)", cells: [false, false, true, true, true] },
  { label: "Промокоды, скрытые до клика", cells: [false, false, "1 на средство", "несколько", "несколько"] },
  { label: "Рекламное описание «От бренда»", cells: [false, false, true, true, true] },
  { label: "Промо по расписанию", cells: [false, false, false, true, true] },
  { label: "Аналитика полки (обезличенно)", cells: [false, false, false, true, true] },
  { label: "Несколько брендов, выгрузки, менеджер", cells: [false, false, false, false, true] },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Влияет ли оплата на оценку состава?",
    a: "Нет. Разбор, вердикт и флаги считаются одинаково для всех средств, платит бренд или нет. Бренд платит за ссылки, фото, промокоды, описание и аналитику. Рекламные материалы стоят под разбором и помечены «Реклама».",
  },
  {
    q: "Зачем платить, если мы уже продаёмся на маркетплейсах?",
    a: "Buty не заменяет маркетплейс, а ведёт на него. Ссылка может вести прямо в вашу карточку на маркетплейсе. Разница в моменте: у нас покупательница уже изучает состав конкретного средства, а не листает выдачу с конкурентами.",
  },
  {
    q: "Вы берёте комиссию с продаж?",
    a: "Нет. Только фиксированная цена тарифа. Все продажи по вашим ссылкам — ваши.",
  },
  {
    q: "Зачем скрывать промокод?",
    a: "Код не попадает в HTML страницы и загружается только после нажатия «Показать промокод». Так его не соберут парсеры и агрегаторы промокодов, а вы видите, сколько людей действительно заинтересовались скидкой.",
  },
  {
    q: "Это реклама? Нужна ли маркировка?",
    a: "Да, блок «От бренда» и промокоды — это реклама. Мы помечаем их «Реклама», получаем токен erid через оператора рекламных данных и отчитываемся в ЕРИР. От бренда нужны только реквизиты рекламодателя.",
  },
  {
    q: "Моего средства нет в каталоге или в составе ошибка.",
    a: "Пришлите фото упаковки с составом — добавим или исправим бесплатно, на любом тарифе, включая бесплатный бренд-аккаунт.",
  },
  {
    q: "Можно ли больше средств, чем в тарифе?",
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

export default async function ForBrandsPage() {
  const stats = await getCatalogStats();

  return (
    <main>
      <JsonLd data={faqJsonLd(FAQ)} />

      {/* ═══ 1. HERO: тёмный фон, справа карточка «Начните бесплатно» ═══ */}
      <section className="relative overflow-hidden bg-[#1B1316] text-white">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at 12% 18%, rgba(227,28,95,0.35), transparent 42%), radial-gradient(circle at 85% 90%, rgba(0,166,153,0.18), transparent 40%), radial-gradient(circle at 60% 10%, rgba(255,90,119,0.12), transparent 35%)",
          }}
        />
        <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-14 lg:py-24">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/50 bg-brand/20 px-3 py-1 text-sm font-semibold text-brand-100">
              <TicketPercent className="h-4 w-4" aria-hidden />
              Первым {FOUNDING_OFFER.brands} брендам −{FOUNDING_OFFER.discountPercent}% на полгода
            </span>
            <h1 className="mt-6 text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[48px] lg:text-[58px]">
              Продавайте тем, кто <span className="text-brand-400">читает состав</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              Ваши ссылки на покупку, фото и промокоды — прямо в карточке средства, рядом с
              независимым разбором состава. Без комиссии и дорогих кликов.
            </p>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/85">
              {["Бренд-аккаунт бесплатно", "Без комиссии с продаж", "Оценки не продаются"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-brand-400" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-white p-7 text-center text-foreground shadow-pop sm:p-9 lg:col-span-5">
            <h2 className="text-[22px] font-semibold">Начните бесплатно</h2>
            <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-muted">
              {stats
                ? `В каталоге уже ${stats.brands.toLocaleString("ru-RU")} ${pluralRu(stats.brands, "бренд", "бренда", "брендов")} и ${stats.products.toLocaleString("ru-RU")} ${pluralRu(stats.products, "средство", "средства", "средств")} — скорее всего, и ваши.`
                : "Скорее всего, ваши средства уже есть в нашем каталоге."}{" "}
              Заявка занимает пару минут.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <a href="#zayavka">
                Подключить бренд <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Данные покупателей не передаём
              </span>
              <span className="flex items-center gap-1">
                <ReceiptText className="h-3.5 w-3.5" aria-hidden /> Без скрытых платежей
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══ 2. ЗНАКОМО? ═══ */}
      <section className="bg-ink-wash py-14 lg:py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-[26px] font-semibold sm:text-[34px]">Знакомо?</h2>
            <p className="mt-2 text-base text-ink-muted">Типичные задачи косметических брендов в онлайне.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PAINS.map((p) => (
              <div key={p.title} className="rounded-2xl bg-white p-6 shadow-glass">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                  <AlertCircle className="h-5 w-5 text-brand" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══ 3. ТРИ ШАГА ═══ */}
      <section className="py-14 lg:py-20">
        <Container>
          <h2 className="text-center text-[26px] font-semibold sm:text-[34px]">Три шага до новых покупателей</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text, tag }) => (
              <li key={title} className="text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ink-wash">
                  <Icon className="h-8 w-8 text-brand" strokeWidth={1.5} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-ink-muted">{text}</p>
                <span className="mt-3 inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {tag}
                </span>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ═══ 4. КАК ЭТО ВЫГЛЯДИТ ═══ */}
      <section className="border-t border-ink-hair py-14 lg:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <h2 className="text-[26px] font-semibold leading-tight sm:text-[34px]">Как это выглядит в карточке средства</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              Нажмите «Показать промокод» в примере — так его видит покупательница.
            </p>
            <ul className="mt-8 divide-y divide-ink-hair">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4 py-4 first:pt-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
                    <Icon className="h-5 w-5 text-brand" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 lg:col-span-6">
            <BrandCardPreview />
          </div>
        </Container>
      </section>

      {/* ═══ 5. ПОЧЕМУ BUTY, А НЕ ТОЛЬКО РЕКЛАМА ═══ */}
      <section className="border-t border-ink-hair py-14 lg:py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-[26px] font-semibold sm:text-[34px]">Почему Buty, а не только реклама на маркетплейсе?</h2>
            <p className="mx-auto mt-2 max-w-2xl text-base text-ink-muted">
              Разница между карточкой рядом с разбором состава и ещё одним рекламным местом в выдаче.
            </p>
          </div>
          <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-12">
            <div className="overflow-hidden rounded-3xl border border-ink-hair bg-white shadow-glass lg:col-span-8">
              <div className="grid grid-cols-[1fr_1.2fr_1.2fr] bg-foreground text-sm font-semibold text-white">
                <div className="px-4 py-4 sm:px-5">Что сравниваем</div>
                <div className="flex items-center justify-center gap-1.5 px-2 py-4 text-center text-brand-300">
                  <CircleCheck className="hidden h-4 w-4 sm:block" aria-hidden /> Buty
                </div>
                <div className="px-2 py-4 text-center text-white/60">Реклама на маркетплейсе</div>
              </div>
              {VERSUS.map((r, i) => (
                <div
                  key={r.label}
                  className={cn("grid grid-cols-[1fr_1.2fr_1.2fr] items-center border-t border-ink-hair", i % 2 === 1 && "bg-ink-wash/60")}
                >
                  <div className="px-4 py-5 text-sm font-semibold sm:px-5">{r.label}</div>
                  <div className="px-2 py-5 text-center">
                    <div className="text-[15px] font-semibold text-brand-700 sm:text-base">{r.buty[0]}</div>
                    <span className="mt-1 inline-block rounded-md bg-success-50 px-1.5 py-0.5 text-[11px] font-semibold text-success-700">
                      {r.buty[1]}
                    </span>
                  </div>
                  <div className="px-2 py-5 text-center">
                    <div className="text-[15px] text-ink-soft sm:text-base">{r.ads[0]}</div>
                    <div className="mt-1 text-[11px] text-ink-muted">{r.ads[1]}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-4">
              <BrandRoiCard />
            </div>
          </div>
        </Container>
      </section>

      {/* ═══ 6. ЦЕНЫ ═══ */}
      <section id="tarify" className="scroll-mt-20 bg-ink-wash py-14 lg:py-20">
        <Container>
          <BrandPricing />

          <details className="group mt-10 rounded-2xl border border-ink-hair bg-white shadow-glass">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
              Сравнить все тарифы
              <span className="text-sm font-medium text-ink-muted group-open:hidden">Показать</span>
              <span className="hidden text-sm font-medium text-ink-muted group-open:inline">Скрыть</span>
            </summary>
            <div className="overflow-x-auto border-t border-ink-hair">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-ink-wash">
                    <th scope="col" className="px-4 py-3 text-sm font-semibold">
                      Возможность
                    </th>
                    {COMPARE_HEAD.map((h) => (
                      <th key={h} scope="col" className="px-3 py-3 text-center text-sm font-semibold">
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
              <p className="px-4 py-3 text-xs text-ink-muted">
                +{EXTRA_PRODUCTS_PACK.count} средств к любому платному тарифу — {formatRub(EXTRA_PRODUCTS_PACK.monthly)} в месяц.
              </p>
            </div>
          </details>
        </Container>
      </section>

      {/* ═══ 7. FAQ ═══ */}
      <section className="py-14 lg:py-20">
        <Container className="max-w-3xl">
          <h2 className="text-center text-[26px] font-semibold sm:text-[34px]">Частые вопросы</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="accordion-item rounded-xl border border-ink-hair bg-ink-wash px-5">
                <summary>{f.q}</summary>
                <p className="pb-5 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══ 8. ФИНАЛЬНЫЙ CTA + ЗАЯВКА ═══ */}
      <section id="zayavka" className="scroll-mt-20 bg-gradient-to-r from-[#FB4D6D] to-[#D70466] py-14 lg:py-20">
        <Container className="max-w-3xl">
          <div className="text-center text-white">
            <h2 className="text-[28px] font-semibold leading-tight sm:text-[40px]">
              Подключите бренд к Buty
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-white/85 sm:text-lg">
              Вернёмся в течение пары рабочих дней с условиями и списком ваших средств в каталоге.
            </p>
          </div>
          <div className="mt-8 rounded-3xl bg-white p-6 shadow-pop sm:p-8">
            <BrandLeadForm />
          </div>
        </Container>
      </section>
    </main>
  );
}
