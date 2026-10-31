import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const brandLeadCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { brandLead: { create: (...a: unknown[]) => brandLeadCreate(...a) } },
}));

import { resetQuota } from "@/lib/rate-limit";
import { POST } from "./route";

function post(body: unknown, ip = "1.1.1.1") {
  return POST(
    new Request("http://localhost/api/brand-leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

const validBody = {
  brandName: "Test Brand",
  contact: "Оля",
  email: "olya@example.com",
  message: "Хотим размещение",
};

describe("POST /api/brand-leads", () => {
  beforeEach(() => {
    resetQuota();
    brandLeadCreate.mockReset();
    brandLeadCreate.mockResolvedValue({ id: "lead_1" });
  });

  afterEach(() => vi.restoreAllMocks());

  it("принимает заявку и пишет в БД", async () => {
    const res = await post(validBody);
    expect(res.status).toBe(201);
    expect(brandLeadCreate).toHaveBeenCalledTimes(1);
  });

  it("обрезает по лимиту: 6-я заявка с того же IP за час — 429", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post(validBody)).status).toBe(201);
    }
    const res = await post(validBody);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("Слишком много заявок");
    expect(brandLeadCreate).toHaveBeenCalledTimes(5);
  });

  it("с другого IP лимит не тратится", async () => {
    for (let i = 0; i < 5; i++) await post(validBody);
    expect((await post(validBody, "2.2.2.2")).status).toBe(201);
  });

  it("honeypot заполнен — 201, но в БД не пишем", async () => {
    const res = await post({ ...validBody, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(brandLeadCreate).not.toHaveBeenCalled();
  });
});
