"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/analytics/consent";
import { disableGtag, GA_ID, initGtag, trackPageView } from "@/lib/analytics/gtag";

/**
 * Google tag (GA4): инициализация после согласия на cookie + хиты при клиентской навигации.
 *
 * - gtag.js загружается только при consent "all" (как Яндекс Метрика и Mixpanel).
 * - config с send_page_view: false — page_view отправляем вручную на каждую навигацию
 *   (App Router не перезагружает страницу), без дублей.
 * - Отзыв согласия («Только необходимые») — gtag consent update, отправка прекращается.
 */
export function GoogleTag() {
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const apply = (c: Consent | null) => {
      if (c === "all") {
        initGtag();
        setEnabled(true);
      } else if (c === "necessary") {
        disableGtag();
        setEnabled(false);
      }
    };
    apply(readConsent());
    const onConsent = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  // Хит на первую загрузку и на каждую клиентскую навигацию.
  useEffect(() => {
    if (!enabled) return;
    trackPageView();
  }, [enabled, pathname, searchParams]);

  return null;
}
