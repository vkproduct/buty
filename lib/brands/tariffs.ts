/**
 * Тарифы для брендов (B2B). Единый источник цифр для страницы /for-brands:
 * карточки тарифов, таблица сравнения и выбор тарифа в форме заявки.
 * Правило доверия: ни один тариф не влияет на оценку, вердикт и флаги разбора.
 */

export type TariffId = "free" | "basic" | "vitrina" | "pro" | "network";

export interface Tariff {
  id: TariffId;
  name: string;
  /** Цена в месяц, ₽. 0 — бесплатно. */
  monthly: number;
  /** Цена «от» — для индивидуальных условий. */
  priceFrom?: boolean;
  /** Сколько средств входит. */
  products: string;
  lead: string;
  features: string[];
  highlight?: boolean;
  cta: string;
}

/** За год платится столько месяцев (два месяца в подарок). */
export const ANNUAL_MONTHS_PAID = 10;

/** Пакет дополнительных средств к любому платному тарифу. */
export const EXTRA_PRODUCTS_PACK = { count: 10, monthly: 2900 };

/** Скидка брендам-основателям. */
export const FOUNDING_OFFER = { brands: 20, discountPercent: 50, months: 6 };

/** Событие окна: кнопка тарифа → форма заявки подставляет выбранный тариф. */
export const BRAND_TARIFF_EVENT = "buty:brand-tariff";

export const TARIFFS: Tariff[] = [
  {
    id: "free",
    name: "Бренд-аккаунт",
    monthly: 0,
    products: "Все средства бренда",
    lead: "Подтвердите бренд и следите, как разбирают ваши составы.",
    features: [
      "Подтверждённый профиль бренда",
      "Исправление ошибок в составах по фото упаковки",
      "Счётчик разборов ваших средств",
    ],
    cta: "Подключить бесплатно",
  },
  {
    id: "basic",
    name: "Базовый",
    monthly: 9900,
    products: "До 30 средств",
    lead: "Ссылки на покупку и аналитика переходов.",
    features: [
      "Ссылки на покупку: до 3 на средство — официальный магазин или маркетплейс",
      "UTM-метки на все переходы",
      "Кабинет: разборы, просмотры карточек, переходы по каждой ссылке",
      "Всё из Бренд-аккаунта",
    ],
    cta: "Выбрать Базовый",
  },
  {
    id: "vitrina",
    name: "Витрина",
    monthly: 19900,
    products: "До 60 средств",
    lead: "Карточка, которая продаёт: фото, промокод и ваш рассказ о продукте.",
    features: [
      "Фото бренда — до 6 на карточку",
      "Промокоды в карточке, скрытые до клика",
      "Рекламное описание «От бренда» до 600 знаков",
      "Аналитика промо: раскрытия, копирования, переходы",
      "Всё из Базового",
    ],
    highlight: true,
    cta: "Выбрать Витрину",
  },
  {
    id: "pro",
    name: "Бренд Про",
    monthly: 39900,
    products: "До 200 средств",
    lead: "Для линеек и сезонных промо, плюс аналитика полки.",
    features: [
      "Несколько промокодов на средство — для разных магазинов",
      "Промо по расписанию: старт и окончание по датам",
      "Обезличенная аналитика полки: с чем сочетают, на что меняют, реакции",
      "Ежемесячный отчёт по вашим средствам",
      "Всё из Витрины",
    ],
    cta: "Выбрать Бренд Про",
  },
  {
    id: "network",
    name: "Сеть / дистрибьютор",
    monthly: 79900,
    priceFrom: true,
    products: "Без лимита средств",
    lead: "Несколько брендов в одном кабинете.",
    features: [
      "Несколько брендов в одном кабинете",
      "Выгрузки данных",
      "Персональный менеджер",
      "Всё из Бренд Про",
    ],
    cta: "Обсудить условия",
  },
];

export function tariffById(id: string | null | undefined): Tariff | undefined {
  return TARIFFS.find((t) => t.id === id);
}

/** Цена в месяц при оплате за год, округлённая до рубля. */
export function annualMonthly(monthly: number): number {
  return Math.round((monthly * ANNUAL_MONTHS_PAID) / 12);
}

/** 19900 → «19 900 ₽» (неразрывный пробел, одинаково на сервере и в браузере). */
export function formatRub(n: number): string {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₽`;
}

/** Лимит средств со ссылками по тарифу (null — без лимита). Должно совпадать с /for-brands. */
export const PRODUCT_LIMIT: Record<TariffId, number | null> = {
  free: 0,
  basic: 30,
  vitrina: 60,
  pro: 200,
  network: null,
};

/** Максимум ссылок на покупку на одно средство. */
export const MAX_LINKS_PER_PRODUCT = 3;

/** Дней после paidUntil, пока ссылки ещё показываются (отсрочка оплаты). */
export const PAID_GRACE_DAYS = 3;

/** Дата запуска этапа 1 — статистика кабинета собирается с неё. */
export const BRAND_STATS_SINCE = "26.10.2026";
