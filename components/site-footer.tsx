import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Сервис",
    links: [
      { href: "/analyze", label: "Разбор состава" },
      { href: "/shelf", label: "Моя полка" },
      { href: "/pricing", label: "Тарифы" },
    ],
  },
  {
    title: "База знаний",
    links: [
      { href: "/ingredients", label: "Каталог ингредиентов" },
      { href: "/products", label: "Каталог продуктов" },
    ],
  },
  {
    title: "Партнёрам",
    links: [{ href: "/for-brands", label: "Брендам" }],
  },
];

/** Подвал сайта: навигация + дисклеймер. */
export function SiteFooter() {
  return (
    <footer className="border-t border-ink-line bg-ink-wash print:hidden">
      <Container className="grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
            Научный разбор составов косметики: функции ингредиентов, рабочие
            концентрации, конфликты активов и уровень доказательности.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-soft hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-ink-line">
        <Container className="flex flex-col gap-2 py-6 text-sm text-ink-soft sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Buty.app</p>
          <p className="max-w-2xl text-ink-muted sm:text-right">
            Информация на сайте носит справочный характер и не заменяет
            консультацию врача-дерматолога.
          </p>
        </Container>
      </div>
    </footer>
  );
}
