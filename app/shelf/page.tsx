import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Моя полка" };

export default function ShelfPage() {
  return (
    <ComingSoon
      title="Моя полка"
      description="Коллекция ваших средств: проверка совместимости активов, порядок нанесения, поиск дублей и напоминания."
    />
  );
}
