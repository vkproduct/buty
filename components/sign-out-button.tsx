"use client";

import { signOut } from "next-auth/react";

import { resetUser } from "@/lib/analytics/mixpanel";

import { Button } from "@/components/ui/button";

/** Кнопка выхода из аккаунта. */
export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => {
        resetUser();
        void signOut({ callbackUrl: "/" });
      }}>
      Выйти
    </Button>
  );
}
