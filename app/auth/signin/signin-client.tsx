"use client";

import { useSearchParams } from "next/navigation";

import { CodeSignIn } from "@/components/code-sign-in";

/** Безопасный относительный путь для редиректа после входа (открытый редирект запрещён). */
function safeCallback(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/shelf";
}

/**
 * Страница входа: код из письма на месте. После успеха: новый пользователь без анкеты —
 * на онбординг, остальные — на callbackUrl из query (по умолчанию /shelf).
 */
export function SignInClient() {
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get("callbackUrl"));
  return (
    <CodeSignIn
      source="signin_page"
      onSuccess={(result) => {
        if (result.isNewUser && !result.hasSkinProfile) {
          window.location.href = "/onboarding?signup=1";
          return;
        }
        window.location.href = callbackUrl;
      }}
    />
  );
}
