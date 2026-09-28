import type { EvidenceLevel } from "@prisma/client";

import { EVIDENCE_LABEL, EVIDENCE_META } from "@/lib/seo/labels";
import { cn } from "@/lib/utils";

/**
 * Индикатор доказательной базы: 4 столбика растущей высоты,
 * закрашено столько, насколько сильны данные. Цвет — по шкале EVIDENCE_META.
 */
export function EvidenceMeter({
  level,
  withLabel = false,
  inverted = false,
  className,
}: {
  level: EvidenceLevel;
  withLabel?: boolean;
  /** для тёмного фона (активный чип) */
  inverted?: boolean;
  className?: string;
}) {
  const meta = EVIDENCE_META[level];
  return (
    <span
      className={cn("relative inline-flex items-center gap-1.5", className)}
      title={EVIDENCE_LABEL[level].label}
    >
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full",
              i === 1 && "h-1.5",
              i === 2 && "h-2",
              i === 3 && "h-2.5",
              i === 4 && "h-3",
              i <= meta.bars
                ? inverted
                  ? "bg-white"
                  : meta.fill
                : inverted
                  ? "bg-white/30"
                  : "bg-ink-hair"
            )}
          />
        ))}
      </span>
      {withLabel ? (
        <span className={cn("text-xs font-semibold", inverted ? "text-white" : meta.text)}>
          {meta.short}
        </span>
      ) : (
        <span className="sr-only">{EVIDENCE_LABEL[level].label}</span>
      )}
    </span>
  );
}
