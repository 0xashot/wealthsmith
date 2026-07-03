/**
 * Goal Settings state — initial saved plan values + approved option lists.
 *
 * Source of truth: examples/dashboard/dashboard-connected-wallet-state.json
 * (`goal` block, read-only import — never mutated). Option lists are the
 * approved MVP options from patterns/goal-settings.md ("Approved Field
 * Options"); nothing is invented.
 *
 * The Goal page holds the live saved state in App memory (Option A: Goal-page
 * scope only — no propagation into Dashboard/derived outputs this slice).
 */
import fixture from "../../../examples/dashboard/dashboard-connected-wallet-state.json";
import type { GoalOption, SavedGoal } from "../types/goal";

const g = (fixture as any).goal;

export const FINANCIAL_GOAL_OPTIONS: GoalOption[] = [
  { label: "Retire Early", value: "retire_early" },
  { label: "Build Long-Term Wealth", value: "build_long_term_wealth" },
  { label: "Generate Passive Income", value: "generate_passive_income" },
  { label: "Save For Big Purchase", value: "save_for_big_purchase" },
  { label: "Not Sure Yet", value: "not_sure_yet" },
];

export const RISK_OPTIONS: GoalOption[] = [
  { label: "Very Low", value: "very_low" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Very High", value: "very_high" },
];

export const CONTRIBUTION_OPTIONS: GoalOption[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Bi-Weekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Occasional", value: "occasional" },
];

export const TIMELINE_OPTIONS: GoalOption[] = [
  { label: "6 Months", value: "6_months" },
  { label: "1 Year", value: "1_year" },
  { label: "2 Years", value: "2_years" },
  { label: "5 Years", value: "5_years" },
  { label: "10+ Years", value: "10_plus_years" },
  { label: "Not Sure Yet", value: "not_sure_yet" },
];

// The fixture stores time horizon as `value_years`; map it to the approved
// timeline option ID for display/edit (no value invented — falls back to the
// fixture's own 5-year value).
const YEARS_TO_TIMELINE: Record<number, string> = {
  1: "1_year",
  2: "2_years",
  5: "5_years",
  10: "10_plus_years",
};

export const initialSavedGoal: SavedGoal = {
  financial_goal: g.financial_goal.value,
  risk_tolerance: g.risk_tolerance.value,
  timeline: YEARS_TO_TIMELINE[g.time_horizon.value_years] ?? "5_years",
  contribution_frequency: g.contribution_rhythm.value,
  income_monthly: g.monthly_income_usd,
  expenses_monthly: g.monthly_expenses_usd,
  monthly_saving_goal: g.monthly_saving_goal_usd ?? null,
};

/** Display label for an option value (falls back to the raw value). */
export function labelFor(options: GoalOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
