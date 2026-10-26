import { beforeEach, describe, expect, it, vi } from "vitest";

// --- моки ---
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/seo/labels", () => ({ wbSearchUrl: (brand: string, name: string) => `https://wb.ru/search?q=${encodeURIComponent(`${brand} ${name}`)}` }));

const DAY = 86_400_000;
const NOW = Date.now();

function paidBrand(overrides: Record<string, unknown> = {}) {
  return {
    id: "brand1",
    tariff: "basic",
    paidUntil: new Date(NOW + 10 * DAY),
    productLimit: null,
    catalogBrands: ["TestBrand"],
    ...overrides,
  };
}

/** Собирает мок prisma под сценарий. */
function mockPrisma(scenario: {
  product?: Record<string, unknown> | null;
  findFirst?: Record<string, unknown> | null;
  findMany?: Record<string, unknown>[];
}) {
  const productLink = {
    findFirst: vi.fn().mockResolvedValue(scenario.findFirst ?? null),
    findMany: vi.fn().mockResolvedValue(scenario.findMany ?? []),
  };
  const prismaMock = {
    product: { findUnique: vi.fn().mockResolvedValue(scenario.product ?? null) },
    productLink,
    partnerClick: { create: vi.fn().mockResolvedValue({}) },
  };
  vi.doMock("@/lib/prisma", () => ({ prisma: prismaMock }));
  return prismaMock;
}

async function callGo(productId: string, query = "") {
  const { GET } = await import("./route");
  const request = new Request(`http://localhost/go/${productId}${query}`);
  return GET(request, { params: { productId } });
}

/** redirect() бросает — ловим и возвращаем URL. */
async function redirectUrl(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.startsWith("redirect:")) return msg.slice("redirect:".length);
    throw e;
  }
  throw new Error("redirect не вызван");
}

describe("/go/[productId]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("продукт не найден — 404", async () => {
    mockPrisma({ product: null });
    const res = await callGo("p1");
    expect(res.status).toBe(404);
  });

  it("ссылка ?link= этого продукта: редирект с нашими UTM", async () => {
    const prismaMock = mockPrisma({
      product: { id: "p1", slug: "slug-1", brand: "TestBrand", name: "Крем", partnerUrl: null },
      findFirst: { id: "l1", url: "https://ozon.ru/product/abc/", addUtm: true, store: "ozon", brand: paidBrand() },
    });
    const url = await redirectUrl(callGo("p1", "?link=l1&source=product_page"));
    const u = new URL(url);
    expect(u.hostname).toBe("ozon.ru");
    expect(u.searchParams.get("utm_source")).toBe("buty");
    expect(u.searchParams.get("utm_content")).toBe("slug-1");
    expect(prismaMock.partnerClick.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ linkId: "l1", store: "ozon" }) }),
    );
  });

  it("addUtm=false — редирект без UTM", async () => {
    mockPrisma({
      product: { id: "p1", slug: "slug-1", brand: "TestBrand", name: "Крем", partnerUrl: null },
      findFirst: { id: "l1", url: "https://ozon.ru/product/abc/", addUtm: false, store: "ozon", brand: paidBrand() },
    });
    const url = await redirectUrl(callGo("p1", "?link=l1"));
    expect(url).toBe("https://ozon.ru/product/abc/");
  });

  it("чужой link (неактивный) игнорируется — берём первую видимую ссылку продукта", async () => {
    mockPrisma({
      product: { id: "p1", slug: "slug-1", brand: "TestBrand", name: "Крем", partnerUrl: null },
      findFirst: null, // l9 не найдена/не подходит
      findMany: [
        { id: "l2", url: "https://wildberries.ru/catalog/1", addUtm: true, store: "wildberries", brand: paidBrand(), position: 0 },
      ],
    });
    const url = await redirectUrl(callGo("p1", "?link=l9"));
    expect(new URL(url).hostname).toBe("wildberries.ru");
  });

  it("link от другого продукта не используется (findFirst фильтрует по productId)", async () => {
    const prismaMock = mockPrisma({
      product: { id: "p1", slug: "slug-1", brand: "TestBrand", name: "Крем", partnerUrl: null },
      findFirst: null,
      findMany: [],
    });
    await redirectUrl(callGo("p1", "?link=l-other"));
    expect(prismaMock.productLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "l-other", productId: "p1" }) }),
    );
  });

  it("битая ссылка пропускается — берём следующую по position", async () => {
    mockPrisma({
      product: { id: "p1", slug: "slug-1", brand: "TestBrand", name: "Крем", partnerUrl: null },
      findFirst: { id: "l1", url: "https://ozon.ru/x", addUtm: true, store: "ozon", brand: { ...paidBrand(), paidUntil: new Date(NOW - 10 * DAY) } },
      findMany: [
        { id: "l1", url: "https://ozon.ru/x", addUtm: true, store: "ozon", brand: { ...paidBrand(), paidUntil: new Date(NOW - 10 * DAY) }, position: 0 },
        { id: "l2", url: "https://megamarket.ru/x", addUtm: true, store: "megamarket", brand: paidBrand(), position: 1 },
      ],
    });
    const url = await redirectUrl(callGo("p1", "?link=l1"));
    // ?link= нашёлся, но бренд не оплачен → пошли по пути 2; первая неоплаченная пропущена
    expect(new URL(url).hostname).toBe("megamarket.ru");
  });

  it("неоплаченный бренд без link= → старое поведение (partnerUrl)", async () => {
    const prismaMock = mockPrisma({
      product: { id: "p1", slug: "slug-1", brand: "TestBrand", name: "Крем", partnerUrl: "https://example.com/buy" },
      findMany: [
        { id: "l1", url: "https://ozon.ru/x", addUtm: true, store: "ozon", brand: { ...paidBrand(), paidUntil: new Date(NOW - 10 * DAY) }, position: 0 },
      ],
    });
    const url = await redirectUrl(callGo("p1", "?source=shelf"));
    expect(url).toBe("https://example.com/buy");
    expect(prismaMock.partnerClick.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ linkId: null, store: null }) }),
    );
  });

  it("нет ссылок и partnerUrl — поиск на Wildberries", async () => {
    mockPrisma({
      product: { id: "p1", slug: "slug-1", brand: "TestBrand", name: "Крем", partnerUrl: null },
      findMany: [],
    });
    const url = await redirectUrl(callGo("p1"));
    expect(url).toContain("wb.ru/search");
  });
});
