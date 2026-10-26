import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Основной контейнер контента. Имя сохранено ради совместимости,
 * визуально — белая карточка со скруглением 16px без видимой рамки и с мягкой тенью
 * (белое на сером фоне портала).
 */
export function GlassCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-transparent bg-white shadow-soft", className)}
      {...props}
    />
  );
}
