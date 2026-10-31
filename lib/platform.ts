import { headers } from "next/headers";

import { parseBearer } from "@/lib/mobile/crypto";

/**
 * Платформа текущего HTTP-запроса: Bearer bt_… — мобильное приложение, иначе сайт.
 * Вне контекста запроса headers() бросает — считаем запрос сайтовым (роуты API
 * всегда в контексте запроса; для скриптов значение не важно).
 */
export function requestPlatform(): "web" | "mobile_app" {
  try {
    return parseBearer(headers().get("authorization")) ? "mobile_app" : "web";
  } catch {
    return "web";
  }
}
