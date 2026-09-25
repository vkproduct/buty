import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { Container } from "@/components/ui/container";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/products", label: "Продукты" },
  { href: "/admin/ingredients", label: "Ингредиенты" },
  { href: "/admin/leads", label: "Заявки брендов" },
  { href: "/admin/feedback", label: "Словарь" },
  { href: "/admin/analytics", label: "Аналитика" },
];

/** Лейаут мини-админки: доступ только для email из ADMIN_EMAILS. */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!(await isAdmin())) notFound();
  return (
    <main className="bg-gradient-hero min-h-screen py-10">
      <Container className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-2xl font-bold">Админка</h1>
          <nav className="flex flex-wrap gap-2 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full bg-white/60 px-3 py-1 text-lavender backdrop-blur transition-shadow hover:shadow-glass"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </Container>
    </main>
  );
}
