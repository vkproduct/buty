import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Тарифы" };

export default function PricingPage() {
  return (
    <ComingSoon
      title="Тарифы"
      description="Бесплатный разбор составов и подбор ухода — всегда. Подписка «Моя полка» откроет коллекцию средств и персональные напоминания."
    />
  );
}
