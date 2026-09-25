import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Продукт" };

export default function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <ComingSoon
      title={`Продукт: ${params.slug}`}
      description="Карточка продукта: полный разбор состава, оценка формулы и ссылки на покупку."
    />
  );
}
