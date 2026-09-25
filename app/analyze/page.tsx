import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Разбор состава" };

export default function AnalyzePage() {
  return (
    <ComingSoon
      title="Разбор состава"
      description="Вставьте состав — получите разбор каждого ингредиента: функция, концентрация, доказательность и конфликты с другими активами."
    />
  );
}
