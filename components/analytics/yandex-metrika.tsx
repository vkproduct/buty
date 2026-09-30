"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/analytics/consent";
import { reachGoal, YM_ID, type Goal } from "@/lib/analytics/metrika";

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number };
type YmWindow = Window & { ym?: Ym };

const TAG_URL = "https://mc.yandex.ru/metrika/tag.js";

/** Официальный тег Метрики: очередь ym + асинхронная загрузка tag.js + init. */
function loadMetrika() {
  const w = window as YmWindow;
  if (w.ym) return;
  const ym: Ym = (...args: unknown[]) => {
    (ym.a = ym.a || []).push(args);
  };
  ym.l = Date.now();
  w.ym = ym;
  const script = document.createElement("script");
  script.async = true;
  script.src = TAG_URL;
  document.head.appendChild(script);
  ym(YM_ID, "init", {
    defer: true,
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
  });
}

/**
 * Хиты при клиентской навигации App Router. Счётчик инициализирован с defer: true,
 * поэтому первый хит тоже отправляется отсюда — без дублей.
 */
function PageHits() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = window.location.href;
    (window as YmWindow).ym?.(YM_ID, "hit", url, {
      referer: prevUrl.current ?? document.referrer,
      title: document.title,
    });
    prevUrl.current = url;
  }, [pathname, searchParams]);

  // Цели по клику на элементы с data-ym-goal (например, «Где купить» в серверных компонентах).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-ym-goal]");
      if (el?.dataset.ymGoal) reachGoal(el.dataset.ymGoal as Goal);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

/**
 * Счётчик Яндекс Метрики (вебвизор, карта кликов, точный показатель отказов).
 * Загружается только после согласия на аналитические cookie.
 */
export function YandexMetrika() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!YM_ID) return;
    const apply = (c: Consent | null) => {
      if (c === "all") {
        loadMetrika();
        setEnabled(true);
      }
    };
    apply(readConsent());
    const onConsent = (e: Event) => {
      const value = (e as CustomEvent<Consent>).detail;
      if (value === "all") apply(value);
      // Отказ после согласия: скрипт уже загружен — перезагрузка страницы его выгрузит.
      else if ((window as YmWindow).ym) window.location.reload();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <PageHits />
    </Suspense>
  );
}
