"use client";

import { SessionProvider } from "next-auth/react";

/** Обёртка SessionProvider для клиентских компонентов (Header). */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
