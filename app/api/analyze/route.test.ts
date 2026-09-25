import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredient: { findMany: vi.fn() },
    synonym: { findMany: vi.fn() },
    ingredientConflict: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const findMany = vi.mocked(prisma.ingredient.findMany);
const synonymFindMany = vi.mocked(prisma.synonym.findMany);
const conflictFindMany = vi.mocked(prisma.ingredientConflict.findMany);

function row(overrides: Partial<Record<string, unknown>> & { id: string; inciName: string; slug: string }) {
  return {
    displayName: overrides.slug,
    category: "active",
    function: "Функция",
    evidenceLevel: "STRONG",
    typicalConc: "1–2%",
    description: "Описание",
    safetyNotes: null,
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
    synonymFindMany.mockResolvedValue([]);
    // Для словаря и для загрузки деталей возвращаем одни и те же строки
    findMany.mockResolvedValue(DICTIONARY as never);
    conflictFindMany.mockResolvedValue([CONFLICT] as never);
  });

  it("разбирает состав из 6 ингредиентов с 1 конфликтом", async () => {
    const res = await post({
      text: "Aqua, Niacinamide, Glycerin, Panthenol, Retinol, Glycolic Acid",
    });
    expect(res.status).toBe(200);
    const data = await res.json();

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
  });

  it("возвращает нераспознанные токены отдельно", async () => {
    const res = await post({ text: "Aqua, Somethingunknown, Glycerin" });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ingredients).toHaveLength(2);
    expect(data.unmatched).toEqual(["somethingunknown"]);
  });

  it("отклоняет пустой или некорректный запрос", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ text: "   " })).status).toBe(400);
    expect((await post({ text: 42 })).status).toBe(400);
  });
});
