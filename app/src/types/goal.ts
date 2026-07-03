/**
 * Types for the connected Goal Settings page.
 *
 * SavedGoal is the local, in-memory saved plan state (initialized from the
 * approved connected fixture's `goal` block; the fixture is never mutated).
 * The Goal page edits a string-based draft and commits it back to SavedGoal on
 * Save — no product logic, no recalculation, no derived values here.
 */

export interface GoalOption {
  label: string;
  value: string;
}

export interface SavedGoal {
  /** Structured option IDs (patterns/goal-settings.md — Approved Field Options). */
  financial_goal: string;
  risk_tolerance: string;
  timeline: string;
  contribution_frequency: string;
  /** Monthly USD amounts. */
  income_monthly: number;
  expenses_monthly: number;
  /** Optional — null when not set (never coerced to 0). */
  monthly_saving_goal: number | null;
}
