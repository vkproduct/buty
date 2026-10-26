"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/analytics/consent";
import {
  MIXPANEL_TOKEN,
  disableMixpanel,
  identifyUser,
  initMixpanel,
  resetIfIdentified,
  resetUser,
  trackEvent,
} from "@/lib/analytics/mixpanel";

/**
 * Mixpanel: инициализация после согласия на cookie + базовая идентификация.
 *
 * - SDK загружается только при consent "all" (как Яндекс Метрика).
 * - Вход/восстановление сессии → identify(user.id); выход → reset().
 * - Если согласие дано уже после входа — identify догоняет при инициализации.
 * - Отзыв согласия («Только необходимые») — opt-out, отправка прекращается.
 * - Выход перезагружает страницу, поэтому без сессии проверяем, не остался ли id прошлого пользователя.
 * - Делегированный клик по партнёрским ссылкам /go/ → partner_link_clicked
 *   (клиент, а не /go/-роут: у анонимов есть $device_id и ID Merge свяжет историю после входа).
 */
export function MixpanelTracker() {
  const [enabled, setEnabled] = useState(false);
  const { data: session, status } = useSession();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!MIXPANEL_TOKEN) return;
    const apply = (c: Consent | null) => {
      if (c === "all") {
        initMixpanel();
        setEnabled(true);
      } else if (c === "necessary") {
        disableMixpanel();
        setEnabled(false);
        prevUserId.current = null;
      }
    };
    apply(readConsent());
    const onConsent = (e: Event) => {
      apply((e as CustomEvent<Consent>).detail);
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!enabled || status === "loading") return;
    const userId = session?.user?.id ?? null;
    if (userId && userId !== prevUserId.current) {
      identifyUser(userId);
    } else if (!userId && prevUserId.current) {
      resetUser();
    } else if (!userId) {
      resetIfIdentified();
    }
    prevUserId.current = userId;
  }, [enabled, session, status]);

  // Клик по партнёрской ссылке «Где купить» (/go/[productId]) — цель where_to_buy.
  // Делегировано, как цели Метрики: ссылки рендерятся в серверных компонентах.
  useEffect(() => {
    if (!enabled) return;
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href*='/go/']");
      if (!el) return;
      const url = new URL(el.href, window.location.origin);
      const productId = /^\/go\/([^/?]+)/.exec(url.pathname)?.[1];
      if (!productId) return;
      const linkId = url.searchParams.get("link");
      const store = el.dataset.store;
      trackEvent("partner_link_clicked", {
        product_id: productId,
        source: url.searchParams.get("source") ?? "direct",
        ...(linkId ? { link_id: linkId } : {}),
        ...(store ? { store } : {}),
      });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled]);

  return null;
}
