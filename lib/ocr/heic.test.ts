import { describe, expect, it } from "vitest";
import { isHeic } from "./heic";

// Минимальный валидный заголовок ftyp для тестов
function ftypBox(brand: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.writeUInt32BE(24, 0); // размер коробки
  buf.write("ftyp", 4, "ascii");
  buf.write(brand, 8, "ascii");
  return buf;
}

describe("isHeic", () => {
  it("распознаёт heic", () => {
    expect(isHeic(ftypBox("heic"))).toBe(true);
  });
  it("распознаёт heix и mif1", () => {
    expect(isHeic(ftypBox("heix"))).toBe(true);
    expect(isHeic(ftypBox("mif1"))).toBe(true);
  });
  it("не путает JPEG с HEIC", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(isHeic(jpeg)).toBe(false);
  });
  it("не путает PNG с HEIC", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isHeic(png)).toBe(false);
  });
  it("отсеивает короткий буфер", () => {
    expect(isHeic(Buffer.from([0x00, 0x00]))).toBe(false);
  });
});
