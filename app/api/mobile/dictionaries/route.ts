import { NextResponse } from "next/server";

import { FREE_REACTIONS_LIMIT, FREE_SHELF_LIMIT } from "@/lib/billing";
import { FLAG_META } from "@/lib/ingredients/flags";
import { REMINDER_COPY, REMINDER_DELAYS_DAYS } from "@/lib/reminders/constants";
import {
  CATEGORY_LABEL,
  EVIDENCE_LABEL,
  EVIDENCE_META,
  EVIDENCE_ORDER,
  PRODUCT_CATEGORY_LABEL,
  SEVERITY_LABEL,
} from "@/lib/seo/labels";
import { REACTION_LABELS } from "@/lib/shelf/reaction-labels";
import {
  ALLERGEN_GROUPS,
  CONCERN_GROUPS,
  CONDITIONS,
  MAX_CUSTOM_LENGTH,
  SKIN_TYPE_QUIZ,
  SKIN_TYPES,
} from "@/lib/skin-profile/options";

// Справочники меняются только с деплоем — отдаём статически (ISR раз в час)
export const revalidate = 3600;

/**
 * GET /api/mobile/dictionaries — все подписи и справочники для приложения.
 * Единый источник текстов: правка на сервере сразу видна в приложении без релиза.
 */
export async function GET() {
  return NextResponse.json({
    version: 1,
    evidence: EVIDENCE_ORDER.map((id) => ({
      id,
      label: EVIDENCE_LABEL[id].label,
      short: EVIDENCE_META[id].short,
      note: EVIDENCE_META[id].note,
      bars: EVIDENCE_META[id].bars,
    })),
    ingredientCategories: CATEGORY_LABEL,
    productCategories: PRODUCT_CATEGORY_LABEL,
    severity: Object.fromEntries(
      Object.entries(SEVERITY_LABEL).map(([k, v]) => [k, v.label]),
    ),
    flags: Object.fromEntries(
      Object.entries(FLAG_META).map(([k, v]) => [k, { label: v.label, note: v.note }]),
    ),
    reactions: REACTION_LABELS,
    reminders: Object.fromEntries(
      Object.entries(REMINDER_COPY).map(([k, v]) => [
        k,
        { ...v, days: REMINDER_DELAYS_DAYS[k as keyof typeof REMINDER_DELAYS_DAYS] },
      ]),
    ),
    skinProfile: {
      skinTypes: SKIN_TYPES,
      skinTypeQuiz: SKIN_TYPE_QUIZ,
      concernGroups: CONCERN_GROUPS,
      conditions: CONDITIONS,
      allergenGroups: ALLERGEN_GROUPS,
      maxCustomLength: MAX_CUSTOM_LENGTH,
    },
    limits: { freeShelf: FREE_SHELF_LIMIT, freeReactions: FREE_REACTIONS_LIMIT },
    links: {
      site: process.env.NEXT_PUBLIC_SITE_URL ?? "https://buty.app",
      privacy: "/cookies",
      support: "mailto:support@buty.app",
    },
  });
}
