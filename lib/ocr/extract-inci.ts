// Маркер начала состава. Перед ним допускается любой не-буквенный символ:
// на упаковках номер партии часто приклеен через дефис («20215014V45-INGREDIENTS:»).
const INCI_MARKER =
  /(?:^|[^\p{L}])(ingredients|ingrédients|ingredientes|ingredienti|inhaltsstoffe|inci|состав|склад|інгредієнти)\s*[:：]/iu;

// Признаки конца состава: служебные коды, штрихкод EAN-8/13, реквизиты производителя.
const INCI_END_MARKERS: RegExp[] = [
  /\(?\s*code\s+f\.?\s*i\.?\s*l\.?/i, // L'Oréal: «(CODE F.I.L. Z70036017/1)»
  /(?<!\d)\d{13}(?!\d)/, // EAN-13
  /(?<![\p{L}\d])(?:made in|fabriqué en|hergestellt in|изготовитель|произведено|производитель|срок годности|годен до|best before|exp\.?\s*date)/iu,
];

// Шум внутри состава: номер партии (8+ цифр + буква + цифры) и значок срока после вскрытия («12M»).
const LOT_CODE = /(?<![\p{L}\d])\d{6,}[A-Z]\d*(?![\p{L}\d])/gu;
const PAO_SYMBOL = /(?<![\p{L}\d-])\d{1,2}\s?M(?![\p{L}\d])/gu;

export const MAX_INCI_LENGTH = 10_000;

/**
 * Выделяет INCI-список из распознанного текста упаковки: текст после маркера
 * «Ingredients:»/«Состав:» до служебных кодов и штрихкода, одной строкой.
 */
export function extractInci(raw: string): string {
  let text = raw.replace(/\r/g, "");
  const marker = INCI_MARKER.exec(text);
  if (marker) text = text.slice(marker.index + marker[0].length);

  let end = text.length;
  for (const re of INCI_END_MARKERS) {
    const m = re.exec(text);
    // конец ищем только после начала списка, чтобы не обрезать всё при ложном срабатывании
    if (m && m.index > 0 && m.index < end) end = m.index;
  }
  text = text.slice(0, end);

  return text
    .replace(LOT_CODE, " ")
    .replace(PAO_SYMBOL, " ")
    .replace(/-\n(?=\p{Ll})/gu, "")
    .replace(/-\s*\n\s*(?=[\p{Lu}\d])/gu, "-")
    .replace(/\s*\n\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .replace(/^[\s,.;:–—-]+/, "")
    .trim()
    .slice(0, MAX_INCI_LENGTH);
}
