import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  center?: boolean;
  as?: "h1" | "h2";
  className?: string;
}

/** Заголовок секции: надзаголовок + заголовок + лид. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  center = false,
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(center && "text-center", className)}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <Tag
        className={cn(
          "font-display font-semibold leading-[1.15] text-foreground",
          Tag === "h1" ? "text-[28px] sm:text-[40px]" : "text-[24px] sm:text-[32px]"
        )}
      >
        {title}
      </Tag>
      {lead ? (
        <p
          className={cn(
            "mt-3 max-w-[680px] text-base leading-relaxed text-ink-muted",
            center && "mx-auto"
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
