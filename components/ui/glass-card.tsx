import * as React from "react";

import { cn } from "@/lib/utils";

/** Полупрозрачная «стеклянная» карточка — основной контейнер контента. */
export function GlassCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-3xl transition-shadow hover:shadow-glass-lg",
        className
      )}
      {...props}
    />
  );
}
