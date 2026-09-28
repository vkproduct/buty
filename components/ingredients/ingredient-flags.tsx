import { Badge } from "@/components/ui/badge";
import { FLAG_META } from "@/lib/ingredients/flags";

export interface IngredientFlagsShape {
  comedogenic: boolean;
  feedsMalassezia: boolean;
  fragranceAllergen: boolean;
}

const FLAG_KEYS = [
  "comedogenic",
  "feedsMalassezia",
  "fragranceAllergen",
] as const;

/** Бейджи безопасностных флагов («комедогенно», «кормит малассезию», «аллерген-отдушка»). */
export function IngredientFlags({ flags }: { flags: IngredientFlagsShape }) {
  const active = FLAG_KEYS.filter((k) => flags[k]);
  if (active.length === 0) return null;
  return (
    <>
      {active.map((k) => (
        <Badge key={k} variant={FLAG_META[k].variant} title={FLAG_META[k].note}>
          {FLAG_META[k].label}
        </Badge>
      ))}
    </>
  );
}
