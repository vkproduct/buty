import { beforeEach, describe, expect, it, vi } from "vitest";

const feedbackCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { feedback: { create: (...a: unknown[]) => feedbackCreate(...a) } },
}));

import { resetQuota } from "@/lib/rate-limit";
import { POST } from "./route";

function post(body: unknown, ip = "1.1.1.1") {
  return POST(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    resetQuota();
    feedbackCreate.mockReset();
    feedbackCreate.mockResolvedValue({ id: "fb_1" });
  });

  it("принимает обращение", async () => {
    const res = await post({ token: "Tribioma" });
    expect(res.status).toBe(201);
    expect(feedbackCreate).toHaveBeenCalledTimes(1);
  });

  it("обрезает по лимиту: 31-е обращение с того же IP за час — 429", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await post({ token: `token-${i}` })).status).toBe(201);
    }
    const res = await post({ token: "token-31" });
    expect(res.status).toBe(429);
    expect(feedbackCreate).toHaveBeenCalledTimes(30);
  });
});
