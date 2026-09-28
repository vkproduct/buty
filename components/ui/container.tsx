import * as React from "react";

import { cn } from "@/lib/utils";

/** Центрирующий контейнер страницы: 1200px, поля 24–40px. */
export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1200px] px-6 sm:px-10 xl:px-5", className)}
      {...props}
    />
  );
}
