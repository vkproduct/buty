import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Логотип: словесный знак BUTY.app — имя заглавными в фирменном цвете,
 * доменная часть «.app» строчными и полупрозрачная (как у референса SveZaProslavu.rs).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex select-none items-baseline text-brand-500 transition-opacity hover:opacity-80",
        className,
      )}
      aria-label="Buty.app — на главную"
    >
      <span className="font-logo text-xl font-semibold uppercase tracking-tight">Buty</span>
      <span className="ml-px font-logo text-xl font-semibold tracking-tight text-brand-500/60">.app</span>
    </Link>
  );
}
