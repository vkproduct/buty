import type { Metadata } from "next";

import { AnalyzeView } from "@/components/analyze-view";

export const metadata: Metadata = { title: "Разбор состава" };

export default function AnalyzePage({
  searchParams,
}: {
  searchParams: { text?: string };
}) {
  const initialText = typeof searchParams.text === "string" ? searchParams.text : "";
  return <AnalyzeView initialText={initialText} />;
}
