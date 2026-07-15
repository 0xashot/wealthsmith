/**
 * contributionFrequencyPolicy — Step 15B. The canonical, versioned policy for the five WealthSmith
 * onboarding contribution frequencies, plus the deterministic onboarding-value adapter. It mirrors
 * `state/goalState.ts` CONTRIBUTION_OPTIONS EXACTLY — no sixth frequency, no twice-monthly, no
 * custom. Biweekly = 26/year (every two weeks), quarterly = 4/year, occasional = irregular (no
 * fixed count). Order follows onboarding (display determinism, NOT suggestion priority).
 */
import {
  type ContributionFrequencyDefinition,
  type ContributionFrequencyId,
} from "./contributionFrequencyTypes";

/* Canonical definitions — exactly the five onboarding choices. */
const DEFINITIONS: ContributionFrequencyDefinition[] = [
  { frequencyId: "weekly", displayLabel: "Weekly", contributionsPerYear: 52, fixedFrequency: true, fixedCalendarScheduleGenerated: false, exactDatesCalculated: false },
  { frequencyId: "biweekly", displayLabel: "Biweekly", contributionsPerYear: 26, fixedFrequency: true, fixedCalendarScheduleGenerated: false, exactDatesCalculated: false },
  { frequencyId: "monthly", displayLabel: "Monthly", contributionsPerYear: 12, fixedFrequency: true, fixedCalendarScheduleGenerated: false, exactDatesCalculated: false },
  { frequencyId: "quarterly", displayLabel: "Quarterly", contributionsPerYear: 4, fixedFrequency: true, fixedCalendarScheduleGenerated: false, exactDatesCalculated: false },
  { frequencyId: "occasional", displayLabel: "Occasional", fixedFrequency: false, fixedCalendarScheduleGenerated: false, exactDatesCalculated: false },
];

/** Canonical onboarding order (display determinism, not priority). */
export const CONTRIBUTION_FREQUENCY_CANONICAL_ORDER: readonly ContributionFrequencyId[] = ["weekly", "biweekly", "monthly", "quarterly", "occasional"];

const clone = (d: ContributionFrequencyDefinition): ContributionFrequencyDefinition => ({ ...d });

export function listContributionFrequencyDefinitions(): ContributionFrequencyDefinition[] {
  return DEFINITIONS.map(clone);
}
export function getContributionFrequencyDefinition(frequencyId: string): ContributionFrequencyDefinition | undefined {
  const d = DEFINITIONS.find((x) => x.frequencyId === frequencyId);
  return d ? clone(d) : undefined;
}

export interface ContributionFrequencyValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate one frequency definition. Fails closed. */
export function validateContributionFrequencyDefinition(def: unknown): ContributionFrequencyValidationResult {
  const errors: string[] = [];
  if (!def || typeof def !== "object") return { valid: false, errors: ["definition_not_an_object"] };
  const d = def as ContributionFrequencyDefinition;
  if (!CONTRIBUTION_FREQUENCY_CANONICAL_ORDER.includes(d.frequencyId)) errors.push("unsupported_frequency_id");
  if (!d.displayLabel || typeof d.displayLabel !== "string") errors.push("missing_display_label");
  if (d.fixedCalendarScheduleGenerated !== false || d.exactDatesCalculated !== false) errors.push("schedule_or_dates_generated");
  if (d.fixedFrequency === true) {
    if (!(Number.isInteger(d.contributionsPerYear) && (d.contributionsPerYear as number) > 0)) errors.push("fixed_frequency_without_valid_count");
  } else if (d.fixedFrequency === false) {
    if (d.contributionsPerYear != null) errors.push("irregular_frequency_with_count");
  } else {
    errors.push("invalid_fixed_frequency_flag");
  }
  return { valid: errors.length === 0, errors };
}

/** Validate the whole policy — exactly the five onboarding frequencies, correct counts + order. */
export function validateContributionFrequencyPolicy(): ContributionFrequencyValidationResult {
  const errors: string[] = [];
  if (DEFINITIONS.length !== 5) errors.push("policy_must_contain_exactly_five_frequencies");
  if (JSON.stringify(DEFINITIONS.map((d) => d.frequencyId)) !== JSON.stringify([...CONTRIBUTION_FREQUENCY_CANONICAL_ORDER])) errors.push("canonical_order_mismatch");
  const expected: Record<string, number | undefined> = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, occasional: undefined };
  for (const d of DEFINITIONS) {
    const v = validateContributionFrequencyDefinition(d);
    if (!v.valid) errors.push(`definition_${d.frequencyId}_invalid:${v.errors.join("/")}`);
    if (d.contributionsPerYear !== expected[d.frequencyId]) errors.push(`wrong_count_${d.frequencyId}`);
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ *
 * Onboarding-value adapter — exact onboarding values first, then deterministic aliases.
 * ------------------------------------------------------------------ */
/** Deterministic alias map (lowercased). Exact onboarding values ("weekly"…"occasional") included. */
const ALIASES: Record<string, ContributionFrequencyId> = {
  // weekly
  weekly: "weekly", every_week: "weekly", once_a_week: "weekly",
  // biweekly (26/year — NEVER twice-monthly)
  biweekly: "biweekly", "bi-weekly": "biweekly", bi_weekly: "biweekly", every_two_weeks: "biweekly", every_2_weeks: "biweekly", fortnightly: "biweekly",
  // monthly
  monthly: "monthly", once_a_month: "monthly", every_month: "monthly",
  // quarterly
  quarterly: "quarterly", every_quarter: "quarterly", once_a_quarter: "quarterly", every_three_months: "quarterly",
  // occasional (never a fallback for unknown values)
  occasional: "occasional", occasionally: "occasional", irregular: "occasional", as_available: "occasional",
};

/**
 * Resolve a raw onboarding/profile frequency value to a canonical id. Trims + lowercases, exact
 * onboarding values take precedence, deterministic aliases only (no fuzzy matching). Unknown
 * values return `undefined` (they are NOT mapped to occasional). Biweekly never resolves to a
 * twice-monthly / 24-payment schedule.
 */
export function resolveContributionFrequencyId(rawFrequency: unknown): ContributionFrequencyId | undefined {
  if (typeof rawFrequency !== "string") return undefined;
  const key = rawFrequency.trim().toLowerCase();
  if (key.length === 0) return undefined;
  return ALIASES[key];
}
