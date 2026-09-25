"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

/** Кнопка выхода из аккаунта. */
export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
      Выйти
    </Button>
  );
}
