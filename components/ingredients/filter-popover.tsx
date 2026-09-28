"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Выпадающая панель фильтра на нативном <details>: работает и без JS
 * (фильтры остаются обычными ссылками — важно для SEO), а с JS закрывается
 * по клику вне панели, по Escape и после выбора пункта.
 */
export function FilterPopover({
  trigger,
  children,
  className,
  panelClassName,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
}) {
  const ref = React.useRef<HTMLDetailsElement>(null);

  React.useEffect(() => {
    const close = () => ref.current?.removeAttribute("open");
    const onPointer = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={cn("group/popover relative", className)}>
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-ink-line bg-white px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground group-open/popover:border-foreground [&::-webkit-details-marker]:hidden">
        {trigger}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open/popover:rotate-180" />
      </summary>
      <div
        className={cn(
          "absolute right-0 top-full z-40 mt-2 max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl border border-ink-hair bg-white p-2 shadow-pop",
          panelClassName
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) ref.current?.removeAttribute("open");
        }}
      >
        {children}
      </div>
    </details>
  );
}
