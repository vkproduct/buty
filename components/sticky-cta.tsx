"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface StickyCtaProps {
  /** id элемента, после прокрутки которого панель появляется */
  afterId: string;
  /** id элемента, при появлении которого панель снова прячется (финальный CTA) */
  hideFromId?: string;
  title: string;
  subtitle: string;
  price: string;
  priceNote: string;
  href: string;
  cta: string;
}

/** Липкая нижняя панель с CTA — появляется, когда hero ушёл из вьюпорта. */
export function StickyCta({ afterId, hideFromId, title, subtitle, price, priceNote, href, cta }: StickyCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(afterId);
    if (!el) return;
    const stop = hideFromId ? document.getElementById(hideFromId) : null;
    const update = () => {
      const pastHero = el.getBoundingClientRect().bottom < 0;
      const reachedStop = stop ? stop.getBoundingClientRect().top < window.innerHeight : false;
      setVisible(pastHero && !reachedStop);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [afterId, hideFromId]);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-ink-hair bg-white shadow-sticky transition-transform duration-300 print:hidden",
        visible ? "translate-y-0" : "pointer-events-none translate-y-[110%]",
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-5 px-6 py-3 sm:px-10 xl:px-5">
        <div className="hidden md:block">
          <div className="text-[15px] font-semibold leading-tight">{title}</div>
          <div className="mt-1 text-sm text-ink-muted">{subtitle}</div>
        </div>
        <div className="flex w-full items-center justify-between gap-6 md:w-auto">
          <div className="whitespace-nowrap text-lg font-semibold leading-tight md:text-right">
            {price}
            <small className="mt-0.5 block text-sm font-normal text-ink-muted underline">{priceNote}</small>
          </div>
          <Link
            href={href}
            tabIndex={visible ? 0 : -1}
            className="whitespace-nowrap rounded-lg bg-gradient-cta px-6 py-3.5 text-base font-semibold text-white transition hover:brightness-95 active:scale-[0.98]"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
