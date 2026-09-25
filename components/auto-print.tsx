"use client";

import { useEffect } from "react";

/** Автоматически открывает диалог печати (сохранение в PDF) после загрузки. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
