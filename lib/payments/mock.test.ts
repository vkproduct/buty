import { describe, expect, it } from "vitest";

import { periodEndFor } from "./index";
import { decodeMockPaymentId, MockPaymentProvider } from "./mock";

describe("MockPaymentProvider", () => {
  it("создаёт ссылку на /pricing с mockPayment и цену по периоду", async () => {
    const provider = new MockPaymentProvider();
    const link = await provider.createPayment(
      { id: "user1", email: "u@example.com" },
      { tier: "pro", period: "month" },
    );
    expect(link.amount).toBe(299);
    expect(link.currency).toBe("RUB");
    expect(link.url).toContain("/pricing?mockPayment=");

    const year = await provider.createPayment(
      { id: "user1", email: "u@example.com" },
      { tier: "pro", period: "year" },
    );
    expect(year.amount).toBe(2990);
  });
});

describe("decodeMockPaymentId", () => {
  it("разбирает paymentId своего формата", () => {
    expect(decodeMockPaymentId("mock_month_abcdef_0123456789ab")).toEqual({
      period: "month",
      userId: "abcdef",
    });
    expect(decodeMockPaymentId("mock_year_xyz789_fedcba987654")).toEqual({
      period: "year",
      userId: "xyz789",
    });
  });

  it("отклоняет чужой формат", () => {
    expect(decodeMockPaymentId("yk_12345")).toBeNull();
    expect(decodeMockPaymentId("mock_week_abcdef_0123456789ab")).toBeNull();
    expect(decodeMockPaymentId("")).toBeNull();
  });
});

describe("periodEndFor", () => {
  const from = new Date("2026-09-25T12:00:00Z");

  it("месяц и год от даты", () => {
    const month = periodEndFor("month", from);
    const year = periodEndFor("year", from);
    expect(month.getUTCMonth()).toBe(from.getUTCMonth() + 1);
    expect(month.getUTCDate()).toBe(from.getUTCDate());
    expect(year.getUTCFullYear()).toBe(from.getUTCFullYear() + 1);
    expect(year.getUTCMonth()).toBe(from.getUTCMonth());
  });
});
