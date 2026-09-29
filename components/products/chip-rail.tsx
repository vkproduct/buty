"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Горизонтальная лента чипов. На узких экранах лента прокручивается —
 * при загрузке первый активный чип (aria-pressed="true") подкручивается в зону
 * видимости, иначе выбранная категория может оказаться за правым краем экрана.
 * Прокручиваем только саму ленту (scrollLeft), не страницу.
 */
export function ChipRail({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const rail = ref.current;
    const active = rail?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!rail || !active) return;
    if (rail.scrollWidth <= rail.clientWidth) return;
    const railBox = rail.getBoundingClientRect();
    const chipBox = active.getBoundingClientRect();
    if (chipBox.left >= railBox.left && chipBox.right <= railBox.right) return;
    rail.scrollLeft += chipBox.left - railBox.left - 24;
  }, []);

  return (
    <nav ref={ref} className={cn(className)} {...props}>
      {children}
    </nav>
  );
}
