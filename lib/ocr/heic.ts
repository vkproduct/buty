/**
 * HEIC/HEIF — формат фото с iPhone, который Google Cloud Vision не принимает
 * («Bad image data»). Определяем по сигнатуре (бренд ftyp) и конвертируем в JPEG.
 */

/** Бренды ISO-BMFF, соответствующие HEIC/HEIF. */
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heis",
  "hevm",
  "mif1",
  "msf1",
]);

/** Проверка буфера на HEIC/HEIF по бренду в коробке ftyp (байты 4–11). */
export function isHeic(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // Размер коробки (4 байта) + тип "ftyp" (4 байта) + бренд major_brand (4 байта)
  if (buf.toString("ascii", 4, 8) !== "ftyp") return false;
  return HEIC_BRANDS.has(buf.toString("ascii", 8, 12));
}

/**
 * Если буфер — HEIC/HEIF, конвертирует в JPEG. Иначе возвращает как есть.
 * heic-convert — чистый JS/WASM (libde265 внутри), декодирует HEVC даже в Alpine,
 * где у sharp-преборок нет HEVC-плагина. Импорт динамический, чтобы не тащить
 * WASM в клиентский бандл.
 */
export async function toVisionCompatibleJpeg(buf: Buffer): Promise<Buffer> {
  if (!isHeic(buf)) return buf;
  const heicConvert = (await import("heic-convert")).default;
  const out = await heicConvert({ buffer: buf, format: "JPEG", quality: 0.85 });
  return Buffer.from(out);
}
