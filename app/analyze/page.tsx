import type { Metadata } from "next";
import Link from "next/link";

import { AnalyzeView } from "@/components/analyze-view";
import { RelatedLandings } from "@/components/seo/landing-blocks";
import { Container } from "@/components/ui/container";
import { SITE_NAME } from "@/lib/seo/site";

const TITLE = "Разбор состава косметики онлайн: расшифровка ингредиентов на русском";
const DESCRIPTION =
  "Разбор и анализ состава косметики онлайн: вставьте INCI-список — покажем функцию каждого ингредиента на русском, рабочую концентрацию, комедогенность, отдушки и конфликты активов. Бесплатно.";

export function generateMetadata({
  searchParams,
}: {
  searchParams: { text?: string };
}): Metadata {
  // Страница с конкретным составом в ?text= — служебная: не индексируем, канонизируем на /analyze.
  const withText = typeof searchParams.text === "string" && searchParams.text.length > 0;
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
  searchParams: { text?: string };
}) {
  const initialText = typeof searchParams.text === "string" ? searchParams.text : "";
  return (
    <>
      <AnalyzeView initialText={initialText} />
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
