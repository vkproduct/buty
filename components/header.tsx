"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/analyze", label: "Разбор" },
  { href: "/ingredients", label: "Ингредиенты" },
  { href: "/products", label: "Продукты" },
  { href: "/pricing", label: "Тарифы" },
];

/** Шапка сайта: навигация + состояние входа/выхода (клиентская сессия). */
export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-hair bg-white/95 backdrop-blur print:hidden">
      <Container className="flex h-[72px] items-center justify-between gap-4 sm:h-20">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "hidden px-4 text-sm md:inline-flex",
                  active && "bg-ink-wash font-semibold",
                )}
              >
                <Link href={item.href} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              </Button>
            );
          })}
          {status === "loading" ? null : session?.user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden px-4 text-sm sm:inline-flex">
                <Link href="/profile">Профиль</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/shelf">Моя полка</Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="px-4 text-sm md:hidden">
                <Link href="/analyze">Разбор</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full hover:shadow-glass-lg">
                <Link href="/auth/signin">Войти</Link>
              </Button>
            </>
          )}
        </nav>
      </Container>
    </header>
  );
}
