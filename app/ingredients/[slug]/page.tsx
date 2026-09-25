import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Ингредиент" };

export default function IngredientPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <ComingSoon
      title={`Ингредиент: ${params.slug}`}
      description="Карточка ингредиента: функция, рабочие концентрации, уровень доказательности и конфликты с другими активами."
    />
  );
}
