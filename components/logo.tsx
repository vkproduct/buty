import Link from "next/link";

import { cn } from "@/lib/utils";

/** Логотип: зелёный квадрат с лупой + словесный знак. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 text-foreground", className)}
      aria-label="Buty.app — на главную"
    >
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#FF385C" />
        <circle cx="30" cy="27" r="11" fill="none" stroke="#fff" strokeWidth="4" />
        <path d="M38 35 L48 47" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className="text-[19px] font-bold tracking-[-0.03em]">
        Buty<span className="text-brand-500">.app</span>
      </span>
    </Link>
  );
}
