import Link from "next/link";
import type { EvidenceLevel } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { LANDINGS, type LandingSection } from "@/lib/seo/landings";
import { CATEGORY_LABEL, EVIDENCE_LABEL, PRODUCT_CATEGORY_LABEL } from "@/lib/seo/labels";
import { inciTitle, type FaqItem } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

/** Текстовые секции посадочной: заголовок + абзацы и/или список. */
export function LandingSections({ sections }: { sections: LandingSection[] }) {
  return (
    <div className="space-y-10">
      {sections.map((s) => (
        <section key={s.h2} className="space-y-3">
          <h2 className="font-display text-[22px] font-semibold leading-tight sm:text-[26px]">{s.h2}</h2>
          {s.paras?.map((p) => (
            <p key={p.slice(0, 40)} className="text-[16px] leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
          {s.bullets && (
            <ul className="check-list space-y-2 text-[16px] leading-relaxed text-ink-soft">
              {s.bullets.map((b) => (
                <li key={b.slice(0, 40)}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/** FAQ-аккордеон; те же вопросы уходят в FAQPage-разметку. */
export function FaqList({ items, title = "Частые вопросы" }: { items: FaqItem[]; title?: string }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-[22px] font-semibold leading-tight sm:text-[26px]">{title}</h2>
      <div className="divide-y divide-ink-hair border-y border-ink-hair">
        {items.map((f, i) => (
          <details key={f.q} open={i === 0} className="accordion-item">
            <summary>{f.q}</summary>
            <p className="pb-5 pr-10 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export interface IngredientCardData {
  slug: string;
  displayName: string;
  inciName: string;
  category: string;
  function: string;
  evidenceLevel: EvidenceLevel;
  typicalConc: string | null;
}

/** Сетка карточек ингредиентов со ссылками на /ingredients/[slug]. */
export function IngredientGrid({ items }: { items: IngredientCardData[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => {
        const ev = EVIDENCE_LABEL[i.evidenceLevel];
        return (
          <li key={i.slug}>
            <Link
              href={`/ingredients/${i.slug}`}
              className="group block h-full rounded-2xl border border-ink-hair bg-white p-4 transition-shadow hover:shadow-glass"
            >
              <span className="block font-semibold text-foreground group-hover:text-brand-700">
                {inciTitle(i.inciName)}
              </span>
              {i.displayName.trim().toLowerCase() !== i.inciName.trim().toLowerCase() && (
                <span className="block text-sm text-ink-muted">{i.displayName}</span>
              )}
              <span className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{CATEGORY_LABEL[i.category] ?? i.category}</Badge>
                <Badge variant={ev.variant}>{ev.label}</Badge>
              </span>
              <span className="mt-2 block text-sm leading-snug text-ink-muted">{i.function}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export interface ProductCardData {
  slug: string;
  brand: string;
  name: string;
  category: string;
}

/** Сетка разобранных средств. */
export function ProductGrid({ items }: { items: ProductCardData[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/products/${p.slug}`}
            className="group block h-full rounded-2xl border border-ink-hair bg-white p-4 transition-shadow hover:shadow-glass"
          >
            <span className="text-sm text-ink-muted">{p.brand}</span>
            <span className="block font-semibold leading-snug text-foreground group-hover:text-brand-700">
              {p.name}
            </span>
            <span className="mt-1 block text-xs text-ink-muted">
              {PRODUCT_CATEGORY_LABEL[p.category] ?? p.category} · разбор состава
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Перелинковка между посадочными «состав …». */
export function RelatedLandings({ current, className }: { current?: string; className?: string }) {
  return (
    <nav aria-label="Разборы составов" className={cn("flex flex-wrap gap-2", className)}>
      {LANDINGS.filter((l) => l.slug !== current).map((l) => (
        <Link
          key={l.slug}
          href={`/sostav/${l.slug}`}
          className="inline-flex h-9 items-center rounded-full border border-ink-line bg-white px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground"
        >
          {l.nav}
        </Link>
      ))}
    </nav>
  );
}
