import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "white" | "gray" | "green" | "sky";

interface GradientSectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Плоский фон секции. Устаревшие значения hero/lavender/warm сопоставлены с новыми. */
  gradient?: Tone | "hero" | "lavender" | "warm";
  /** Верхняя разделительная линия, как у серых секций референса. */
  line?: boolean;
}

const TONE: Record<Tone, string> = {
  white: "bg-white",
  gray: "bg-ink-wash",
  green: "bg-brand-100",
  sky: "bg-mist",
};

const LEGACY: Record<string, Tone> = { hero: "gray", lavender: "green", warm: "sky" };

/** Секция с плоским фоном на всю ширину. */
export function GradientSection({
  gradient = "white",
  line = false,
  className,
  ...props
}: GradientSectionProps) {
  const tone = (LEGACY[gradient] ?? gradient) as Tone;
  return (
    <section
      className={cn(TONE[tone], line && "border-t border-border", "relative", className)}
      {...props}
    />
  );
}
