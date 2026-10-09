/**
 * Отбор текста состава по геометрии слов из ответа Google Vision (DOCUMENT_TEXT_DETECTION).
 *
 * Зачем: Vision читает строки поперёк всей фотографии. Если рядом с составом есть другая
 * колонка (название продукта на нескольких языках) или предмет на заднем плане, их слова
 * попадают внутрь состава: «SODIUM ompleks. Skin Renewing CITRATE». Здесь мы находим слово
 * «Ingredients»/«Состав», определяем по нему направление строк и левую границу колонки
 * и выбрасываем слова, которые лежат левее этой колонки или выше заголовка.
 * Порядок слов и переносы строк берутся у Vision, поэтому после удаления чужих слов
 * разорванные ингредиенты снова склеиваются: «SODIUM CITRATE».
 */

export interface VisionVertex {
  x?: number;
  y?: number;
}

interface VisionSymbol {
  text?: string;
  property?: { detectedBreak?: { type?: string } };
}

interface VisionWord {
  boundingBox?: { vertices?: VisionVertex[] };
  symbols?: VisionSymbol[];
}

export interface VisionTextAnnotation {
  text?: string;
  pages?: Array<{
    blocks?: Array<{ paragraphs?: Array<{ words?: VisionWord[] }> }>;
  }>;
}

interface Word {
  text: string;
  brk: string; // тип разрыва после слова: SPACE, SURE_SPACE, EOL_SURE_SPACE, LINE_BREAK, HYPHEN или ""
  box: Array<{ x: number; y: number }>;
  paragraphEnd: boolean;
}

const MARKER_WORD =
  /(ingredients|ingrédients|ingredientes|ingredienti|inhaltsstoffe|inci|состав|склад|інгредієнти)[:：]?$/iu;

/** Минимальная длина текста колонки: короче — считаем, что геометрия не сработала. */
const MIN_COLUMN_TEXT = 30;

function flattenWords(annotation: VisionTextAnnotation): Word[] {
  const words: Word[] = [];
  for (const page of annotation.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        const pw = paragraph.words ?? [];
        pw.forEach((w, i) => {
          const symbols = w.symbols ?? [];
          const vertices = w.boundingBox?.vertices ?? [];
          if (vertices.length !== 4 || symbols.length === 0) return;
          words.push({
            text: symbols.map((s) => s.text ?? "").join(""),
            brk: symbols[symbols.length - 1]?.property?.detectedBreak?.type ?? "",
            box: vertices.map((v) => ({ x: v.x ?? 0, y: v.y ?? 0 })),
            paragraphEnd: i === pw.length - 1,
          });
        });
      }
    }
  }
  return words;
}

function wordsToText(words: Word[]): string {
  let out = "";
  for (const w of words) {
    out += w.text;
    if (w.brk === "LINE_BREAK" || w.brk === "EOL_SURE_SPACE") out += "\n";
    else if (w.brk === "HYPHEN") out += w.text.endsWith("-") ? "\n" : "-\n";
    else if (w.brk === "SPACE" || w.brk === "SURE_SPACE") out += " ";
    else if (w.paragraphEnd) out += "\n";
  }
  return out;
}

/**
 * Возвращает текст колонки с составом. Если заголовок состава не найден или геометрия
 * дала подозрительно мало текста — возвращает полный текст Vision без изменений.
 */
export function inciColumnText(annotation: VisionTextAnnotation): string {
  const fullText = annotation.text ?? "";
  const words = flattenWords(annotation);
  const markerIdx = words.findIndex((w) => MARKER_WORD.test(w.text.replace(/^[^\p{L}]+/u, "")));
  if (markerIdx < 0) return fullText;

  const marker = words[markerIdx];
  const [v0, v1, , v3] = marker.box;
  // u — направление строки, n — «вниз» по тексту; работает и для повёрнутого снимка.
  const ux = v1.x - v0.x;
  const uy = v1.y - v0.y;
  const uLen = Math.hypot(ux, uy);
  const nx = v3.x - v0.x;
  const ny = v3.y - v0.y;
  const h = Math.hypot(nx, ny);
  if (uLen === 0 || h === 0) return fullText;
  const u = { x: ux / uLen, y: uy / uLen };
  const n = { x: nx / h, y: ny / h };

  const proj = (w: Word) => {
    const s = w.box.map((p) => p.x * u.x + p.y * u.y);
    const t = w.box.map((p) => p.x * n.x + p.y * n.y);
    return {
      sMin: Math.min(...s),
      sMax: Math.max(...s),
      sMid: (Math.min(...s) + Math.max(...s)) / 2,
      tMid: (Math.min(...t) + Math.max(...t)) / 2,
    };
  };

  const m = proj(marker);
  // Начало строки с заголовком: идём влево по той же строке, пока слова идут вплотную
  // (номер партии «20215014V45-» относится к колонке, текст соседней колонки — нет).
  const sameLineLeft = words
    .map((w, i) => ({ i, p: proj(w) }))
    .filter(({ i, p }) => i !== markerIdx && Math.abs(p.tMid - m.tMid) < 0.6 * h && p.sMax <= m.sMin + 0.2 * h)
    .sort((a, b) => b.p.sMax - a.p.sMax);
  let lineStart = m.sMin;
  for (const { p } of sameLineLeft) {
    if (lineStart - p.sMax > 2 * h) break;
    lineStart = Math.min(lineStart, p.sMin);
  }
  const leftBound = lineStart - 0.5 * h;
  const topBound = m.tMid - 0.6 * h;

  const kept = words.filter((w) => {
    const p = proj(w);
    return p.sMid >= leftBound && p.tMid >= topBound;
  });
  const text = wordsToText(kept);
  return text.replace(/\s+/g, "").length >= MIN_COLUMN_TEXT ? text : fullText;
}
