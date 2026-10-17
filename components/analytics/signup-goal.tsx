"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GOALS, trackGoal } from "@/lib/analytics/goals";

/** Цель «Регистрация завершена»: NextAuth отправляет нового пользователя на /onboarding?signup=1. */
export function SignupGoal() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (params.get("signup") !== "1") return;
    trackGoal(GOALS.signupComplete);
    router.replace(pathname); // убрать параметр, чтобы обновление страницы не засчитало цель повторно
  }, [params, pathname, router]);

  return null;
}
