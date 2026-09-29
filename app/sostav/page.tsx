import type { Metadata } from "next";
import Link from "next/link";

import { AnalyzeForm } from "@/components/analyze-form";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqList, LandingSections } from "@/components/seo/landing-blocks";
import { Container } from "@/components/ui/container";
import { HUB, LANDINGS } from "@/lib/seo/landings";
import { breadcrumbJsonLd, faqJsonLd, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: { absolute: `${HUB.title} | ${SITE_NAME}` },
  description: HUB.description,
  alternates: { canonical: "/sostav" },
  openGraph: { title: HUB.title, description: HUB.description, type: "article", url: "/sostav" },
};

export default function SostavHubPage() {
  return (
    <main className="min-h-screen bg-white pb-24">
      <JsonLd data={breadcrumbJsonLd([{ name: "Составы косметики", path: "/sostav" }])} />
      <JsonLd data={faqJsonLd(HUB.faq)} />

      <Container className="grid gap-10 pb-12 pt-10 lg:grid-cols-12 lg:gap-14">
        <header className="space-y-4 lg:col-span-7">
          <span className="eyebrow">Составы косметики</span>
          <h1 className="font-display text-[30px] font-semibold leading-[1.1] sm:text-[42px]">
            {HUB.h1}
          </h1>
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">{HUB.lead}</p>
        </header>
        <div
          id="razbor"
          className="scroll-mt-28 rounded-3xl border border-ink-hair bg-white p-6 shadow-pop sm:p-8 lg:col-span-5"
        >
          <h2 className="text-[20px] font-semibold">Проверить состав онлайн</h2>
          <p className="mb-5 mt-1.5 text-[15px] leading-relaxed text-ink-muted">
            Вставьте INCI-список с упаковки — расшифруем каждый ингредиент на русском.
          </p>
          <AnalyzeForm id="inci-hub" rows={4} />
        </div>
      </Container>

      <Container className="space-y-14">
        <section className="space-y-4">
          <h2 className="font-display text-[22px] font-semibold leading-tight sm:text-[26px]">
            Разборы составов по типу средства
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LANDINGS.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/sostav/${l.slug}`}
                  className="group block h-full rounded-2xl border border-ink-hair bg-white p-5 transition-shadow hover:shadow-glass"
                >
                  <span className="block text-[17px] font-semibold text-foreground group-hover:text-brand-700">
                    {l.h1}
                  </span>
                  <span className="mt-2 block text-sm leading-snug text-ink-muted">{l.lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="max-w-3xl space-y-14">
          <LandingSections sections={HUB.sections} />
          <FaqList items={HUB.faq} />
        </div>
      </Container>
    </main>
  );
}
