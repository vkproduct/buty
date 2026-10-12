import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiSummary: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import type { AnalysisResult } from "@/lib/analysis/types";
import { getAiSummary, summaryEligibility } from "./service";
import { resetAiQuota } from "./rate-limit";

const findUnique = vi.mocked(prisma.aiSummary.findUnique);
const update = vi.mocked(prisma.aiSummary.update);
const upsert = vi.mocked(prisma.aiSummary.upsert);

function analysis(recognized: number, total = recognized): AnalysisResult {
  const ingredients = Array.from({ length: recognized }, (_, i) => ({
    id: `id${i}`,
    inciName: `ING${i}`,
    slug: `ing-${i}`,
    displayName: `Ингредиент ${i}`,
    category: "humectant",
    function: "Увлажняет",
    evidenceLevel: "STRONG" as const,
    typicalConc: null,
    description: "",
    safetyNotes: null,
    matchedVia: `ing${i}`,
    comedogenic: false,
    feedsMalassezia: false,
    fragranceAllergen: false,
  }));
  return {
    ingredients,
    unmatched: [],
    conflicts: [],
    advice: [],
    summary: {
      total,
      recognized,
      actives: 0,
      fragrances: 0,
      alcohols: 0,
      spfFilters: 0,
      comedogenic: 0,
      malassezia: 0,
      fragranceAllergens: 0,
    },
  };
}

const modelAnswer = {
  verdict: "Простой увлажняющий крем на основе увлажнителей",
  inside: "Состав построен на увлажнителях, которые удерживают воду в коже.",
  suits: "Сухой и обезвоженной коже.",
  caution: "",
};

function mockGemini(text: string) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text }] }] }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  resetAiQuota();
  vi.stubEnv("GEMINI_API_KEY", "secret");
  vi.stubEnv("GEMINI_ENDPOINT", "https://proxy.example");
  update.mockResolvedValue({} as never);
  upsert.mockResolvedValue({} as never);
});

describe("summaryEligibility", () => {
  it("мало ингредиентов или низкое покрытие — без резюме", () => {
    expect(summaryEligibility(analysis(2).summary)).toBe("too-few");
    expect(summaryEligibility(analysis(4, 10).summary)).toBe("low-coverage");
    expect(summaryEligibility(analysis(5, 10).summary)).toBe("ok");
  });
});

describe("getAiSummary", () => {
  it("без ключа — выключено, в ИИ не ходим", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = mockGemini("{}");
    expect(await getAiSummary(analysis(5), "1.1.1.1")).toEqual({ status: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("берёт резюме из кэша без обращения к ИИ", async () => {
    findUnique.mockResolvedValue({ ...modelAnswer } as never);
    const fetchMock = mockGemini("{}");
    const r = await getAiSummary(analysis(5), "1.1.1.1");
    expect(r).toEqual({ status: "ok", cached: true, summary: modelAnswer });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it("нет в кэше — спрашивает ИИ и сохраняет ответ", async () => {
    findUnique.mockResolvedValue(null);
    const fetchMock = mockGemini(JSON.stringify(modelAnswer));
    const r = await getAiSummary(analysis(5), "1.1.1.1");
    expect(r).toEqual({ status: "ok", cached: false, summary: modelAnswer });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("ответ с запрещённой формулировкой не показывается и не кэшируется", async () => {
    findUnique.mockResolvedValue(null);
    mockGemini(JSON.stringify({ ...modelAnswer, suits: "Вылечит сухость навсегда." }));
    expect(await getAiSummary(analysis(5), "1.1.1.1")).toEqual({ status: "unavailable" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("ошибка Gemini — блок скрывается, страница не падает", async () => {
    findUnique.mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await getAiSummary(analysis(5), "1.1.1.1")).toEqual({ status: "unavailable" });
  });

  it("одновременные запросы одного состава — одно обращение к ИИ", async () => {
    findUnique.mockResolvedValue(null);
    const fetchMock = mockGemini(JSON.stringify(modelAnswer));
    const [a, b] = await Promise.all([
      getAiSummary(analysis(5), "1.1.1.1"),
      getAiSummary(analysis(5), "2.2.2.2"),
    ]);
    expect(a.status).toBe("ok");
    expect(b.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("лимит запросов с одного IP", async () => {
    findUnique.mockResolvedValue(null);
    mockGemini(JSON.stringify(modelAnswer));
    for (let i = 0; i < 30; i++) {
      const r = analysis(5);
      r.ingredients[0].id = `unique-${i}`; // разные составы, чтобы не попасть в общий запрос
      await getAiSummary(r, "9.9.9.9");
    }
    const r = analysis(5);
    r.ingredients[0].id = "unique-last";
    expect(await getAiSummary(r, "9.9.9.9")).toEqual({ status: "limited" });
  });
});
