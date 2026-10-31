import { afterEach, describe, expect, it } from "vitest";

import { getAnalyzeGate } from "./gate";

describe("getAnalyzeGate", () => {
  afterEach(() => {
    delete process.env.ANALYZE_GATE;
  });

  it("по умолчанию — hard", () => {
    delete process.env.ANALYZE_GATE;
    expect(getAnalyzeGate()).toBe("hard");
  });

  it("принимает teaser и off", () => {
    process.env.ANALYZE_GATE = "teaser";
    expect(getAnalyzeGate()).toBe("teaser");
    process.env.ANALYZE_GATE = "off";
    expect(getAnalyzeGate()).toBe("off");
  });

  it("всё неизвестное — hard", () => {
    process.env.ANALYZE_GATE = "";
    expect(getAnalyzeGate()).toBe("hard");
    process.env.ANALYZE_GATE = "yes";
    expect(getAnalyzeGate()).toBe("hard");
  });
});
