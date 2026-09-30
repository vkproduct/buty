"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** После какой прокрутки показываем кнопку (алфавитный указатель уже ушёл вверх). */
const SHOW_AFTER = 700;

/**
 * Плавающая кнопка в правом нижнем углу: возвращает к панели фильтров
 * и алфавитному указателю, если пользователь ушёл далеко вниз по каталогу.
 */
export function BackToFilters() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToFilters = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
    const anchor = document.getElementById("catalog");
    if (anchor) anchor.scrollIntoView({ behavior, block: "start" });
    else window.scrollTo({ top: 0, behavior });
  };

  return (
    <button
      type="button"
      onClick={scrollToFilters}
      aria-label="Наверх, к фильтрам и алфавитному указателю"
      title="Наверх, к фильтрам"
      className={
        "fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-ink-hair bg-white/90 text-foreground shadow-glass-lg backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 sm:bottom-8 sm:right-8 " +
        (visible ? "pointer-events-auto opacity-100" : "pointer-events-none translate-y-2 opacity-0")
      }
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </button>
  );
}
