"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

import { reachGoal, YM_ID, type Goal } from "@/lib/analytics/metrika";

type Ym = (id: number, method: string, ...args: unknown[]) => void;

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
    const ym = (window as unknown as { ym?: Ym }).ym;
    if (!ym) return;
    ym(YM_ID, "hit", url, { referer: prevUrl.current ?? document.referrer, title: document.title });
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

/** Счётчик Яндекс Метрики: вебвизор, карта кликов, точный показатель отказов. */
export function YandexMetrika() {
  if (!YM_ID) return null;
  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${YM_ID}, "init", { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });`}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${YM_ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
      <Suspense fallback={null}>
        <PageHits />
      </Suspense>
    </>
  );
}
