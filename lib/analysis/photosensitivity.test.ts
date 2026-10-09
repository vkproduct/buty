import { describe, expect, it } from "vitest";

import { hasPhotosensitizer } from "./photosensitivity";

describe("hasPhotosensitizer", () => {
  it("ниацинамид и лимонная кислота — не повод для SPF", () => {
    expect(hasPhotosensitizer(["water", "niacinamide", "phenoxyethanol", "citric-acid"])).toBe(false);
  });
  it("ретиноид — в любой позиции", () => {
    expect(hasPhotosensitizer(["water", "phenoxyethanol", "retinol"])).toBe(true);
  });
  it("AHA до «линии 1%» — да, после — это регулятор pH", () => {
    expect(hasPhotosensitizer(["water", "glycolic-acid", "phenoxyethanol"])).toBe(true);
    expect(hasPhotosensitizer(["water", "phenoxyethanol", "lactic-acid"])).toBe(false);
  });
});
