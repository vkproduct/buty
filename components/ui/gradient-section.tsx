import * as React from "react";

import { cn } from "@/lib/utils";

interface GradientSectionProps extends React.HTMLAttributes<HTMLElement> {
  gradient?: "hero" | "lavender" | "warm";
}

/** Секция с плавным градиентным фоном. */
export function GradientSection({
  gradient = "hero",
  className,
  ...props
}: GradientSectionProps) {
  const bg =
    gradient === "lavender"
      ? "bg-gradient-lavender text-white"
      : gradient === "warm"
        ? "bg-gradient-warm text-white"
        : "bg-gradient-hero";
  return (
    <section className={cn(bg, "relative overflow-hidden", className)} {...props} />
  );
}
