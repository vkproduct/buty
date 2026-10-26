/**
 * Ссылки на покупку от брендов: справочник магазинов, классификация URL,
 * добавление наших UTM-меток. Чистые функции — покрыты тестами (links.test.ts).
 *
 * Правило доверия: ссылки бренда заменяют только кнопку «Где купить»
 * и никак не влияют на разбор, вердикт и флаги.
 */

/** Минимальные поля бренда, нужные для классификации ссылок. */
export interface BrandForLinks {
  verifiedDomains: string[];
}

export interface StoreDef {
  /** Подпись кнопки на карточке средства. */
  label: string;
  /** Разрешённые хосты (в нижнем регистре, без www). */
  hosts: string[];
}

/** Маркетплейсы и магазины из белого списка. brand_site хосты берутся из verifiedDomains бренда. */
export const STORES: Record<string, StoreDef> = {
  wildberries: { label: "Wildberries", hosts: ["wildberries.ru", "www.wildberries.ru"] },
  ozon: { label: "Ozon", hosts: ["ozon.ru", "www.ozon.ru"] },
  goldapple: { label: "Золотое Яблоко", hosts: ["goldapple.ru"] },
  letual: { label: "Летуаль", hosts: ["letu.ru", "www.letu.ru"] },
  yandex_market: { label: "Яндекс Маркет", hosts: ["market.yandex.ru"] },
  megamarket: { label: "Мегамаркет", hosts: ["megamarket.ru"] },
  brand_site: { label: "Сайт бренда", hosts: [] },
};

/** Из URL удаляем все существующие utm_* — свои метки добавим при редиректе. */
export function stripUtm(url: URL): void {
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
}

function hostWithoutWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** Хост совпадает с доменом или является его поддоменом. */
function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export type ClassifyResult =
  | { ok: true; store: string; normalizedUrl: string }
  | { ok: false; error: string };

const FOREIGN_STORE_ERROR =
  "Можно ставить ссылки только на сайт бренда и маркетплейсы из списка. Нужен другой магазин — напишите нам";

/**
 * Проверить и нормализовать ссылку бренда.
 * Только https, длина ≤ 2000, без логина/пароля и IP-адресов,
 * хост — из белого списка магазинов или verifiedDomains бренда (включая поддомены).
 */
export function classifyUrl(rawUrl: string, brand: BrandForLinks): ClassifyResult {
  const raw = rawUrl.trim();
  if (!raw) return { ok: false, error: "Укажите ссылку" };
  if (raw.length > 2000) return { ok: false, error: "Ссылка слишком длинная (больше 2000 символов)" };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Не похоже на ссылку — проверьте, что она начинается с https://" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Нужна ссылка с https:// (безопасное соединение)" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Ссылка не должна содержать логин и пароль" };
  }

  const host = hostWithoutWww(url.hostname);
  if (!host) return { ok: false, error: "В ссылке нет адреса сайта" };
  // IP-адреса запрещены (IPv4 и IPv6)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    return { ok: false, error: "Ссылки на IP-адреса не принимаются — укажите адрес магазина" };
  }

  for (const [store, def] of Object.entries(STORES)) {
    if (store === "brand_site") continue;
    if (def.hosts.some((h) => hostWithoutWww(h) === host)) {
      stripUtm(url);
      return { ok: true, store, normalizedUrl: url.toString() };
    }
  }

  const domains = brand.verifiedDomains.map((d) => hostWithoutWww(d.trim()).replace(/^https?:\/\//, "").split("/")[0]).filter(Boolean);
  if (domains.some((d) => hostMatchesDomain(host, d))) {
    stripUtm(url);
    return { ok: true, store: "brand_site", normalizedUrl: url.toString() };
  }

  return { ok: false, error: FOREIGN_STORE_ERROR };
}

/**
 * Добавить наши UTM-метки к ссылке бренда.
 * Не ломает существующие параметры и hash.
 */
export function withUtm(url: string, productSlug: string): string {
  const u = new URL(url);
  stripUtm(u);
  u.searchParams.set("utm_source", "buty");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_campaign", "brand_links");
  u.searchParams.set("utm_content", productSlug);
  return u.toString();
}
