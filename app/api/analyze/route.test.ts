import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredient: { findMany: vi.fn() },
    synonym: { findMany: vi.fn() },
    ingredientConflict: { findMany: vi.fn() },
    product: { findUnique: vi.fn() },
    skinProfile: { findUnique: vi.fn() },
    analysis: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { POST } from "./route";

const findMany = vi.mocked(prisma.ingredient.findMany);
const synonymFindMany = vi.mocked(prisma.synonym.findMany);
const conflictFindMany = vi.mocked(prisma.ingredientConflict.findMany);
const analysisCreate = vi.mocked(prisma.analysis.create);
const getSessionMock = vi.mocked(getSession);

function row(overrides: Partial<Record<string, unknown>> & { id: string; inciName: string; slug: string }) {
  return {
    displayName: overrides.slug,
    category: "active",
    function: "Функция",
    evidenceLevel: "STRONG",
    typicalConc: "1–2%",
    description: "Описание",
    safetyNotes: null,
    comedogenic: false,
    feedsMalassezia: false,
    fragranceAllergen: false,
    synonyms: [],
    ...overrides,
  };
}

// Состав из 6 ингредиентов, ровно 1 конфликт: retinol × glycolic-acid
const DICTIONARY = [
  row({ id: "aqua", inciName: "AQUA", slug: "aqua", category: "solvent" }),
  row({ id: "nia", inciName: "NIACINAMIDE", slug: "niacinamide" }),
  row({ id: "gly", inciName: "GLYCERIN", slug: "glycerin", category: "humectant" }),
  row({ id: "pan", inciName: "PANTHENOL", slug: "panthenol", category: "soothing" }),
  row({ id: "ret", inciName: "RETINOL", slug: "retinol" }),
  row({ id: "ga", inciName: "GLYCOLIC ACID", slug: "glycolic-acid" }),
];

const CONFLICT = {
  id: "c1",
  ingredientAId: "ret",
  ingredientBId: "ga",
  severity: "high",
  reason: "Суммарное раздражение.",
  ingredientA: { slug: "retinol", displayName: "Ретинол" },
  ingredientB: { slug: "glycolic-acid", displayName: "Гликолевая кислота" },
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANALYZE_GATE;
    synonymFindMany.mockResolvedValue([]);
    // Для словаря и для загрузки деталей возвращаем одни и те же строки
    findMany.mockResolvedValue(DICTIONARY as never);
    conflictFindMany.mockResolvedValue([CONFLICT] as never);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.skinProfile.findUnique).mockResolvedValue(null);
    analysisCreate.mockResolvedValue({} as never);
  });

  it("разбирает состав из 6 ингредиентов с 1 конфликтом", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await post({
      text: "Aqua, Niacinamide, Glycerin, Panthenol, Retinol, Glycolic Acid",
    });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.gate).toBe("none");
    expect(data.ingredients).toHaveLength(6);
    expect(data.unmatched).toHaveLength(0);
    expect(data.summary).toMatchObject({
      total: 6,
      recognized: 6,
      actives: 3,
      spfFilters: 0,
    });

    expect(data.conflicts).toHaveLength(1);
    expect(data.conflicts[0]).toMatchObject({
      severity: "high",
      a: { slug: "retinol" },
      b: { slug: "glycolic-acid" },
    });

    // Советы: есть активы и нет SPF → совет про SPF
    expect(data.advice.length).toBeGreaterThan(0);
    expect(data.advice.join(" ")).toMatch(/SPF/);

    // Поля карточки ингредиента
    const niacinamide = data.ingredients.find(
      (i: { slug: string }) => i.slug === "niacinamide",
    );
    expect(niacinamide).toMatchObject({
      inciName: "NIACINAMIDE",
      evidenceLevel: "STRONG",
      matchedVia: "niacinamide",
    });

    // Журнал: полный разбор вошедшему
    expect(analysisCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1", status: "shown" }) }),
    );
  });

  it("возвращает нераспознанные токены отдельно", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await post({ text: "Aqua, Somethingunknown, Glycerin" });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ingredients).toHaveLength(2);
    expect(data.unmatched).toEqual(["somethingunknown"]);
  });

  it("возвращает флаги безопасности и считает их в сводке и советах", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } } as never);
    findMany.mockResolvedValue([
      ...DICTIONARY,
      row({
        id: "ipm",
        inciName: "ISOPROPYL MYRISTATE",
        slug: "isopropyl-myristate",
        category: "emollient",
        comedogenic: true,
        feedsMalassezia: true,
      }),
      row({
        id: "lin",
        inciName: "LINALOOL",
        slug: "linalool",
        category: "fragrance",
        fragranceAllergen: true,
      }),
    ] as never);
    const res = await post({ text: "Aqua, Isopropyl Myristate, Linalool" });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.summary).toMatchObject({
      comedogenic: 1,
      malassezia: 1,
      fragranceAllergens: 1,
    });
    expect(data.advice.join(" ")).toMatch(/Malassezia/);

    const ipm = data.ingredients.find(
      (i: { slug: string }) => i.slug === "isopropyl-myristate",
    );
    expect(ipm).toMatchObject({
      comedogenic: true,
      feedsMalassezia: true,
      fragranceAllergen: false,
    });
  });

  it("отклоняет пустой или некорректный запрос", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ text: "   " })).status).toBe(400);
    expect((await post({ text: 42 })).status).toBe(400);
  });

  it("гость при hard получает 401 auth_required, журнал пишет blocked", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await post({ text: "Aqua, Glycerin" });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toMatchObject({ code: "auth_required", gate: "hard" });
    expect(data.ingredients).toBeUndefined();
    expect(analysisCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null, status: "blocked" }),
      }),
    );
  });

  it("гость при teaser получает только сводку, журнал пишет teaser", async () => {
    process.env.ANALYZE_GATE = "teaser";
    getSessionMock.mockResolvedValue(null);
    const res = await post({ text: "Aqua, Retinol, Glycolic Acid" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gate).toBe("teaser");
    expect(data.summary.recognized).toBe(3);
    expect(data.conflictsCount).toBe(1);
    expect(data.ingredients).toBeUndefined();
    expect(data.advice).toBeUndefined();
    expect(analysisCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "teaser" }) }),
    );
  });

  it("гость при off получает полный разбор (аварийный откат), журнал пишет shown без userId", async () => {
    process.env.ANALYZE_GATE = "off";
    getSessionMock.mockResolvedValue(null);
    const res = await post({ text: "Aqua, Glycerin" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gate).toBe("none");
    expect(data.ingredients).toHaveLength(2);
    expect(data.hasSkinProfile).toBeUndefined();
    expect(analysisCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null, status: "shown" }),
      }),
    );
  });

  it("неизвестный productId игнорируется", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    await post({ text: "Aqua", productId: "no-such-product" });
    expect(analysisCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: null }) }),
    );
  });

  it("известный productId попадает в журнал", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: "p1" } as never);
    await post({ text: "Aqua", productId: "p1", inputMethod: "product" });
    expect(analysisCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: "p1", inputMethod: "product" }) }),
    );
  });

  it("ошибка записи в журнал не ломает ответ", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } } as never);
    analysisCreate.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ text: "Aqua, Glycerin" });
    expect(res.status).toBe(200);
    vi.restoreAllMocks();
  });

  it("у вошедшего без анкеты hasSkinProfile: false", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.skinProfile.findUnique).mockResolvedValue(null);
    const res = await post({ text: "Aqua" });
    expect((await res.json()).hasSkinProfile).toBe(false);
  });
});
