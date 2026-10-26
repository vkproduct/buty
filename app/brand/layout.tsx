import type { Metadata } from "next";
import Link from "next/link";

import { getBrandsForUser } from "@/lib/brands/access";
import { getSession } from "@/lib/auth";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Кабинет бренда",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/brand", label: "Обзор" },
  { href: "/brand/products", label: "Средства" },
];

/** Лейаут кабинета бренда: доступ проверяют страницы (requireBrandAccess). */
export default async function BrandLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="bg-gradient-hero min-h-screen py-10">
      <Container className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-2xl font-bold">Кабинет бренда</h1>
          <nav className="flex flex-wrap gap-2 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full bg-white px-3 py-1 text-brand transition-shadow hover:shadow-glass"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <BrandSwitcher />
        {children}
      </Container>
    </main>
  );
}

/** Переключатель брендов (?brand=slug), если у пользователя их несколько. */
async function BrandSwitcher() {
  const session = await getSession();
  if (!session?.user) return null;
  const brands = await getBrandsForUser(session.user.id);
  if (brands.length === 0) return null;
  if (brands.length === 1) {
    return <p className="text-sm text-muted-foreground">{brands[0].name}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {brands.map((b) => (
        <Link
          key={b.id}
          href={`/brand?brand=${b.slug}`}
          className="rounded-full bg-white px-3 py-1 text-brand transition-shadow hover:shadow-glass"
        >
          {b.name}
        </Link>
      ))}
    </div>
  );
}
