import { describe, expect, it } from "vitest";

import { PRODUCT_CHUNK, sitemapFileCountForProducts } from "./sitemap-data";

// sitemap-data тянет prisma — для чистой функции расчёта числа файлов БД не нужна,
// но модуль импортируется целиком; prisma-клиент ленивый, без подключения не падает.

describe("sitemapFileCountForProducts", () => {
  it("0 продуктов — файлов продуктов нет", () => {
    expect(sitemapFileCountForProducts(0)).toBe(0);
  });

  it("39 999 продуктов — 1 файл", () => {
    expect(PRODUCT_CHUNK).toBe(40000);
    expect(sitemapFileCountForProducts(39999)).toBe(1);
  });

  it("40 000 продуктов — 1 полный файл", () => {
    expect(sitemapFileCountForProducts(40000)).toBe(1);
  });

  it("40 001 продукт — 2 файла", () => {
    expect(sitemapFileCountForProducts(40001)).toBe(2);
  });
});
