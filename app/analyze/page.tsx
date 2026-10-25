import type { Metadata } from "next";
import Link from "next/link";

import { AnalyzeView } from "@/components/analyze-view";
import { JsonLd } from "@/components/seo/json-ld";
import { RelatedLandings } from "@/components/seo/landing-blocks";
import { Container } from "@/components/ui/container";
import { SITE_NAME, webApplicationJsonLd } from "@/lib/seo/site";

const TITLE = "Бесплатный разбор состава косметики онлайн на русском";
const DESCRIPTION =
  "Бесплатный разбор состава косметики онлайн: вставьте INCI-список или фото — покажем функцию каждого ингредиента, комедогенность, отдушки и конфликты активов.";

export function generateMetadata({
  searchParams,
}: {
  searchParams: { text?: string; photo?: string };
}): Metadata {
  // Страница с конкретным составом в ?text= или служебным ?photo= — не индексируем, канонизируем на /analyze.
  const withText =
    (typeof searchParams.text === "string" && searchParams.text.length > 0) ||
    typeof searchParams.photo === "string";
  return {
    title: { absolute: `${TITLE} | ${SITE_NAME}` },
    description: DESCRIPTION,
    alternates: { canonical: "/analyze" },
    openGraph: { title: TITLE, description: DESCRIPTION, url: "/analyze" },
    ...(withText ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function AnalyzePage({
  searchParams,
}: {
  searchParams: { text?: string; photo?: string };
}) {
  const initialText = typeof searchParams.text === "string" ? searchParams.text : "";
  const fromPhoto = searchParams.photo === "1";
  return (
    <>
      <JsonLd data={webApplicationJsonLd()} />
      <AnalyzeView initialText={initialText} fromPhoto={fromPhoto} />
      <section className="border-t border-ink-hair bg-white py-12">
        <Container className="space-y-5">
          <h2 className="font-display text-[22px] font-semibold leading-tight">
            Как читать состав разных средств
          </h2>
          <p className="max-w-3xl text-[15px] leading-relaxed text-ink-muted">
            Ингредиенты в составе идут по убыванию концентрации, а всё, что стоит после
            консерванта феноксиэтанола, обычно содержится в концентрации ниже 1%.{" "}
            <Link href="/sostav" className="font-medium text-foreground underline">
              Подробнее о том, как читать состав косметики
            </Link>
            .
          </p>
          <RelatedLandings />
        </Container>
      </section>
    </>
  );
}
