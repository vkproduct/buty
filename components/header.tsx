"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserRound } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/analyze", label: "Разбор" },
  { href: "/ingredients", label: "Ингредиенты" },
  { href: "/products", label: "Продукты" },
];

/** Пилюля навигации: серый текст, при наведении — серая подложка и тёмный текст. */
const NAV_LINK =
  "rounded-full px-4 py-2 text-sm font-medium text-ink-subtle transition-all hover:bg-ink-hair/70 hover:text-foreground";

/** Пилюля действия справа: тонкая рамка, при наведении — серая подложка. */
const ACTION_PILL =
  "inline-flex h-10 items-center gap-2 rounded-full border border-ink-line bg-white px-4 text-sm font-medium text-foreground transition-all hover:bg-ink-wash hover:shadow-soft";

/** Шапка сайта: логотип слева, навигация по центру, вход / полка справа. */
export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-hair bg-white/95 backdrop-blur print:hidden">
      <Container className="flex h-[72px] items-center justify-between gap-4 sm:h-20">
        <div className="flex flex-1 items-center">
          <Logo />
        </div>

        <nav aria-label="Основная навигация" className="hidden items-center gap-2 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(NAV_LINK, active && "bg-ink-wash font-semibold text-foreground")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          {status === "loading" ? null : session?.user ? (
            <>
              <Link href="/shelf" className={ACTION_PILL}>
                Моя полка
              </Link>
              <Link href="/profile" className={cn(ACTION_PILL, "hidden px-1.5 sm:inline-flex")} aria-label="Профиль">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-subtle text-white">
                  <UserRound className="h-4 w-4" aria-hidden />
                </span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/analyze" className={cn(NAV_LINK, "md:hidden")}>
                Разбор
              </Link>
              <Link href="/auth/signin" className={cn(ACTION_PILL, "pl-1.5 pr-4")}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-subtle text-white">
                  <UserRound className="h-4 w-4" aria-hidden />
                </span>
                Войти
              </Link>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
