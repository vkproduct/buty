import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Основной контейнер контента. Имя сохранено ради совместимости,
 * визуально — белая карточка со скруглением 16px, тонкой границей и мягкой тенью.
 */
export function GlassCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-ink-hair bg-white shadow-glass", className)}
      {...props}
    />
  );
}
