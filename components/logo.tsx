import Link from "next/link";

import { cn } from "@/lib/utils";

/** Логотип: словесный знак Buty.app. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center text-foreground", className)}
      aria-label="Buty.app — на главную"
    >
      <span className="font-logo text-[19px] font-semibold tracking-[-0.03em]">
        Buty<span className="text-brand-500">.app</span>
      </span>
    </Link>
  );
}
