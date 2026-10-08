/**
 * Контракт API сервера Buty для приложения.
 * Повторяет типы сервера (lib/analysis/types.ts, lib/shelf/view.ts, lib/mobile/catalog.ts) —
 * при изменении API правьте оба места.
 */

export type EvidenceLevel = 'STRONG' | 'MODERATE' | 'LIMITED' | 'ANECDOTAL';
export type FlagKey = 'comedogenic' | 'feedsMalassezia' | 'fragranceAllergen';

export interface AnalyzedIngredient {
  id: string;
  inciName: string;
  slug: string;
  displayName: string;
  category: string;
  function: string;
  evidenceLevel: EvidenceLevel;
  typicalConc: string | null;
  description: string;
  safetyNotes: string | null;
  matchedVia: string;
  comedogenic: boolean;
  feedsMalassezia: boolean;
  fragranceAllergen: boolean;
}

export interface ConflictInfo {
  severity: string;
  reason: string;
  a: { slug: string; displayName: string };
  b: { slug: string; displayName: string };
}

export interface CompositionSummary {
  total: number;
  recognized: number;
  actives: number;
  fragrances: number;
  alcohols: number;
  spfFilters: number;
  comedogenic: number;
  malassezia: number;
  fragranceAllergens: number;
}

export interface AnalysisResult {
  ingredients: AnalyzedIngredient[];
  unmatched: string[];
  summary: CompositionSummary;
  conflicts: ConflictInfo[];
  advice: string[];
}

export interface PlanInfo {
  isPro: boolean;
  currentPeriodEnd: string | null;
}

export interface SkinProfile {
  id: string;
  skinType: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';
  sensitive: boolean;
  concerns: string[];
  conditions: string[];
  allergies: string[];
  intolerances: string[];
  healthConsentAt: string | null;
  updatedAt: string;
}

export interface Me {
  user: { id: string; email: string | null };
  plan: PlanInfo;
  limits: { freeShelf: number; freeReactions: number };
  shelfCount: number;
  profile: SkinProfile | null;
}

export interface VerifyCodeResponse {
  token: string;
  expiresAt: string;
  user: { id: string; email: string };
  plan: PlanInfo;
  hasSkinProfile: boolean;
}

// --- Каталоги ---

export interface IngredientListItem {
  slug: string;
  inciName: string;
  displayName: string;
  category: string;
  evidenceLevel: EvidenceLevel;
  typicalConc: string | null;
  comedogenic: boolean;
  feedsMalassezia: boolean;
  fragranceAllergen: boolean;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
  categories?: { id: string; count: number }[];
  brands?: { name: string; count: number }[];
}

export interface IngredientCard extends IngredientListItem {
  function: string;
  description: string;
  howItWorks: string | null;
  combinations: string | null;
  risks: string | null;
  safetyNotes: string | null;
  otherNames: string[];
  conflicts: { slug: string; displayName: string; severity: string; reason: string }[];
  products: { slug: string; brand: string; name: string; category: string }[];
  webUrl: string;
}

export interface ProductListItem {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category: string;
  ingredientsCount: number;
}

export interface ProductCard {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category: string;
  rawIngredients: string | null;
  coverage: number;
  analysis: AnalysisResult;
  buyUrl: string;
  webUrl: string;
}

export interface ProductSearchHit {
  id: string;
  brand: string;
  name: string;
  category: string;
  slug: string;
}

// --- Полка ---

export type ShelfStatus = 'using' | 'finished' | 'reacted';
export type ReminderKind = 'introduce' | 'restock';

export interface ShelfItem {
  id: string;
  kind: 'catalog' | 'custom';
  status: ShelfStatus;
  addedAt: string;
  title: string;
  subtitle: string;
  slug: string | null;
  ingredientNames: string[];
  customInci: string | null;
  unrecognizedCount: number;
  reminders: { id: string; type: ReminderKind; nextRunAt: string }[];
  reactions: { id: string; type: string; note: string | null; occurredAt: string; suspects: string[] }[];
}

export interface PairResult {
  productAId: string;
  productBId: string;
  aTitle: string;
  bTitle: string;
  status: 'conflict' | 'spread' | 'ok';
  conflicts: { severity: string; reason: string; aName: string; bName: string }[];
  note: string | null;
}

export interface DuplicateGroup {
  productIds: string[];
  titles: string[];
  sharedActives: { slug: string; displayName: string }[];
  incomplete: boolean;
}

export interface RoutineStep {
  order: number;
  productId: string;
  title: string;
  why: string;
}

export interface ShelfReaction {
  id: string;
  type: string;
  note: string | null;
  photoUrl: string | null;
  occurredAt: string;
  itemTitle: string;
  suspects: string[];
}

export interface ShelfReminder {
  id: string;
  type: ReminderKind;
  nextRunAt: string;
  doneAt: string | null;
  itemTitle: string;
}

export interface ShelfView {
  plan: PlanInfo;
  limits: { freeShelf: number; freeReactions: number };
  items: ShelfItem[];
  pairs: PairResult[];
  duplicates: DuplicateGroup[];
  routine: { morning: RoutineStep[]; evening: RoutineStep[]; notes: string[] };
  reactions: ShelfReaction[];
  reactionsLimited: boolean;
  reminders: ShelfReminder[];
}

// --- Справочники ---

export interface Option {
  id: string;
  label: string;
  hint?: string;
}

export interface AllergenOption extends Option {
  defaultLevel: 'allergy' | 'intolerance';
}

export interface Dictionaries {
  version: number;
  evidence: { id: EvidenceLevel; label: string; short: string; note: string; bars: number }[];
  ingredientCategories: Record<string, string>;
  productCategories: Record<string, string>;
  severity: Record<string, string>;
  flags: Record<FlagKey, { label: string; note: string }>;
  reactions: Record<string, string>;
  reminders: Record<ReminderKind, { title: string; short: string; why: string; days: number }>;
  skinProfile: {
    skinTypes: Option[];
    skinTypeQuiz: { answer: string; type: string }[];
    concernGroups: { title: string; note?: string; options: Option[] }[];
    conditions: Option[];
    allergenGroups: { title: string; options: AllergenOption[] }[];
    maxCustomLength: number;
  };
  limits: { freeShelf: number; freeReactions: number };
  links: { site: string; privacy: string; support: string };
}
