"use client";

import { useRouter } from "next/navigation";

import { CodeSignIn } from "@/components/code-sign-in";

/**
 * Форма входа для лендинга и гостевой «Моей полки»: после входа — на полку.
 * Обертка над CodeSignIn с поведением после успеха.
 */
export function SignInCta({ cta = "Получить код" }: { cta?: string }) {
  const router = useRouter();
  return (
    <CodeSignIn
      source="signin_page"
      cta={cta}
      onSuccess={() => {
        window.location.href = "/shelf";
      }}
    />
  );
}
