/**
 * Стена разбора состава: переменная ANALYZE_GATE (серверная, читается в рантайме).
 * hard — гостю ничего из результата (по умолчанию); teaser — только сводка;
 * off — полный разбор всем (аварийный откат). Всё неизвестное → "hard".
 */
export type AnalyzeGate = "hard" | "teaser" | "off";

export function getAnalyzeGate(): AnalyzeGate {
  const value = process.env.ANALYZE_GATE;
  return value === "teaser" || value === "off" ? value : "hard";
}
