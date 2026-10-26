import { describe, expect, it } from "vitest";

import { classifyUrl, withUtm, stripUtm, STORES } from "./links";

const brand = { verifiedDomains: ["brand.ru", "shop.brand.ru"] };

describe("classifyUrl", () => {
  it("принимает Wildberries", () => {
    const r = classifyUrl("https://www.wildberries.ru/catalog/123/detail.aspx", brand);
    expect(r).toMatchObject({ ok: true, store: "wildberries" });
  });

  it("принимает Ozon с www и без", () => {
    expect(classifyUrl("https://www.ozon.ru/product/abc/", brand)).toMatchObject({ ok: true, store: "ozon" });
    expect(classifyUrl("https://ozon.ru/product/abc/", brand)).toMatchObject({ ok: true, store: "ozon" });
  });

  it("принимает поддомен сайта бренда", () => {
    const r = classifyUrl("https://shop.brand.ru/item/1", brand);
    expect(r).toMatchObject({ ok: true, store: "brand_site" });
  });

  it("принимает сам домен бренда без поддомена", () => {
    const r = classifyUrl("https://brand.ru/buy", brand);
    expect(r).toMatchObject({ ok: true, store: "brand_site" });
  });

  it("отклоняет чужой домен понятной ошибкой", () => {
    const r = classifyUrl("https://evil.com/item", brand);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("только на сайт бренда и маркетплейсы");
  });

  it("отклоняет поддомен, не совпадающий с verifiedDomains", () => {
    // evil-brand.ru не должен матчиться на brand.ru
    const r = classifyUrl("https://notbrand.ru/item", brand);
    expect(r.ok).toBe(false);
    const r2 = classifyUrl("https://brand.ru.evil.com/item", brand);
    expect(r2.ok).toBe(false);
  });

  it("отклоняет http:", () => {
    const r = classifyUrl("http://wildberries.ru/catalog/123", brand);
    expect(r.ok).toBe(false);
  });

  it("отклоняет IP-адреса", () => {
    const r = classifyUrl("https://92.242.127.123/item", brand);
    expect(r.ok).toBe(false);
  });

  it("отклоняет URL с логином и паролем", () => {
    const r = classifyUrl("https://user:pass@ozon.ru/product/1", brand);
    expect(r.ok).toBe(false);
  });

  it("отклоняет слишком длинные ссылки", () => {
    const r = classifyUrl(`https://ozon.ru/${"a".repeat(2000)}`, brand);
    expect(r.ok).toBe(false);
  });

  it("удаляет существующие utm_* из ссылки", () => {
    const r = classifyUrl("https://www.wildberries.ru/catalog/123/detail.aspx?utm_source=x&utm_medium=y&foo=1", brand);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.normalizedUrl).not.toContain("utm_source=x");
      expect(r.normalizedUrl).not.toContain("utm_medium=y");
      expect(r.normalizedUrl).toContain("foo=1");
    }
  });

  it("нормализует хост в нижнем регистре", () => {
    const r = classifyUrl("https://WWW.WILDBERRIES.RU/catalog/123", brand);
    expect(r).toMatchObject({ ok: true, store: "wildberries" });
  });
});

describe("withUtm", () => {
  it("добавляет наши метки и не ломает существующие параметры", () => {
    const url = withUtm("https://ozon.ru/product/abc/?color=red", "some-slug");
    const u = new URL(url);
    expect(u.searchParams.get("color")).toBe("red");
    expect(u.searchParams.get("utm_source")).toBe("buty");
    expect(u.searchParams.get("utm_medium")).toBe("referral");
    expect(u.searchParams.get("utm_campaign")).toBe("brand_links");
    expect(u.searchParams.get("utm_content")).toBe("some-slug");
  });

  it("заменяет чужие utm_* и сохраняет hash", () => {
    const url = withUtm("https://ozon.ru/product/abc/?utm_source=evil#reviews", "slug");
    const u = new URL(url);
    expect(u.searchParams.get("utm_source")).toBe("buty");
    expect(u.hash).toBe("#reviews");
  });
});

describe("stripUtm", () => {
  it("удаляет только utm_* параметры", () => {
    const u = new URL("https://a.ru/?utm_a=1&keep=2&utm_b=3");
    stripUtm(u);
    expect(u.searchParams.has("utm_a")).toBe(false);
    expect(u.searchParams.has("utm_b")).toBe(false);
    expect(u.searchParams.get("keep")).toBe("2");
  });
});

describe("STORES", () => {
  it("у всех магазинов есть подпись", () => {
    for (const def of Object.values(STORES)) {
      expect(def.label.length).toBeGreaterThan(0);
    }
  });
});
