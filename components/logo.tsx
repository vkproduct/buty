import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Логотип: словесный знак Buty.app — имя с заглавной буквы в тёмно-вишнёвом,
 * доменная часть «.app» ярко-розовая (как у референса SveZaProslavu.rs).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex select-none items-baseline transition-opacity hover:opacity-80",
        className,
      )}
      aria-label="Buty.app — на главную"
    >
      <span className="font-logo text-xl font-semibold tracking-tight text-[#5d192e]">Buty</span>
      <span className="ml-px font-logo text-xl font-semibold tracking-tight text-[#ff395c]">.app</span>
    </Link>
  );
}
