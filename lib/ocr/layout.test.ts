import { describe, expect, it } from "vitest";

import { extractInci } from "./extract-inci";
import { inciColumnText, type VisionTextAnnotation } from "./layout";

type W = [text: string, x: number, y: number, brk?: string];

/** Слово Vision шириной 10px на символ и высотой 20px. */
function word([text, x, y, brk = "SPACE"]: W) {
  const w = text.length * 10;
  return {
    boundingBox: { vertices: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + 20 }, { x, y: y + 20 }] },
    symbols: text.split("").map((c, i) => ({
      text: c,
      property: i === text.length - 1 && brk ? { detectedBreak: { type: brk } } : undefined,
    })),
  };
}

function annotation(paragraphs: W[][]): VisionTextAnnotation {
  return {
    text: "FULL TEXT FALLBACK",
    pages: [{ blocks: paragraphs.map((p) => ({ paragraphs: [{ words: p.map(word) }] })) }],
  };
}

/** Банка CeraVe: слева колонка с названием на разных языках, на фоне — тюбик с логотипом. */
const CERAVE = annotation([
  [
    ["Gesichtscreme", 0, 100], ["mit", 140, 100], ["Peptide", 180, 100],
    ["20215014V45", 300, 100, ""], ["-", 410, 100, ""], ["INGREDIENTS", 420, 100, ""], [":", 530, 100],
    ["AQUA/WATER,", 545, 100], ["GLYCERIN,", 660, 100, "EOL_SURE_SPACE"],
    ["Complejo", 0, 125], ["peptidico.", 90, 125],
    ["CERAMIDE", 300, 125], ["NP,", 390, 125], ["SODIUM", 430, 125, "EOL_SURE_SPACE"],
    ["ompleks.", 10, 150], ["Skin", 100, 150], ["Renewing", 150, 150],
    ["CITRATE", 300, 150, ""], [",", 370, 150], ["TOCOPHEROL,", 385, 150, "EOL_SURE_SPACE"],
    ["Cundeya", 0, 175], ["Nenridiwv.", 80, 175],
    ["12M", 305, 175], ["CAPRYLYL", 345, 175], ["GLYCOL,", 435, 175], ["BUTYLENE", 510, 175], ["GLYCOL", 600, 175, "EOL_SURE_SPACE"],
    ["BENZOIC", 300, 200], ["ACID.", 380, 200], ["3612624638476", 440, 200, "LINE_BREAK"],
  ],
  [["CeraVe", 700, 10, "LINE_BREAK"]],
]);

describe("inciColumnText", () => {
  it("выбрасывает соседнюю колонку и фон, склеивая разорванные ингредиенты", () => {
    expect(extractInci(inciColumnText(CERAVE))).toBe(
      "AQUA/WATER, GLYCERIN, CERAMIDE NP, SODIUM CITRATE, TOCOPHEROL, CAPRYLYL GLYCOL, BUTYLENE GLYCOL BENZOIC ACID.",
    );
  });

  it("работает на снимке, повёрнутом на 90°", () => {
    // поворот по часовой: (x, y) → (H − y, x); строки идут сверху вниз
    const rotate = (a: VisionTextAnnotation): VisionTextAnnotation => ({
      ...a,
      pages: a.pages?.map((p) => ({
        blocks: p.blocks?.map((b) => ({
          paragraphs: b.paragraphs?.map((pp) => ({
            words: pp.words?.map((w) => ({
              ...w,
              boundingBox: {
                vertices: w.boundingBox?.vertices?.map((v) => ({ x: 1000 - (v.y ?? 0), y: v.x ?? 0 })),
              },
            })),
          })),
        })),
      })),
    });
    expect(extractInci(inciColumnText(rotate(CERAVE)))).toBe(
      "AQUA/WATER, GLYCERIN, CERAMIDE NP, SODIUM CITRATE, TOCOPHEROL, CAPRYLYL GLYCOL, BUTYLENE GLYCOL BENZOIC ACID.",
    );
  });

  it("без заголовка состава возвращает полный текст Vision", () => {
    const a = annotation([[["Aqua,", 0, 0], ["Glycerin", 60, 0, "LINE_BREAK"]]]);
    expect(inciColumnText(a)).toBe("FULL TEXT FALLBACK");
  });
});
