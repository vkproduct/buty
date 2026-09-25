"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SignOutButton } from "@/components/sign-out-button";

/** Шапка сайта: навигация + состояние входа/выхода (клиентская сессия). */
export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/60 backdrop-blur-lg">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-lg font-bold text-lavender-700">
          Buty.ru
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/analyze">Разбор</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/ingredients">Ингредиенты</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/products">Продукты</Link>
          </Button>
          {status === "loading" ? null : session?.user ? (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link href="/shelf">Моя полка</Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/auth/signin">Войти</Link>
            </Button>
          )}
        </nav>
      </Container>
    </header>
  );
}
