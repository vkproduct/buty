const INCI_MARKER =
  /(?:^|[\s(])(ingredients|ingrédients|ingredientes|ingredienti|inhaltsstoffe|inci|состав|склад|інгредієнти)\s*[:：]/i;

export const MAX_INCI_LENGTH = 10_000;

/** Выделяет INCI-список из распознанного текста упаковки: текст после маркера «Ingredients:»/«Состав:» одной строкой. */
export function extractInci(raw: string): string {
  let text = raw.replace(/\r/g, "");
  const marker = INCI_MARKER.exec(text);
  if (marker) text = text.slice(marker.index + marker[0].length);
  return text
    .replace(/-\n(?=\p{Ll})/gu, "")
    .replace(/-\s*\n\s*(?=[\p{Lu}\d])/gu, "-")
    .replace(/\s*\n\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, MAX_INCI_LENGTH);
}
