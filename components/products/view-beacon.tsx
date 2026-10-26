"use client";

import { useEffect } from "react";

/**
 * Маячок просмотра карточки средства: один раз за сессию браузера на средство
 * (ключ в sessionStorage) отправляет sendBeacon на /api/products/<id>/view.
 * Без cookie-согласия: никаких идентификаторов, cookies и персональных данных.
 */
export function ViewBeacon({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const key = `buty:viewed:${productId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      navigator.sendBeacon(`/api/products/${productId}/view`, "");
    } catch {
      // sessionStorage/sendBeacon могут быть недоступны — просмотр просто не считается
    }
  }, [productId]);

  return null;
}
