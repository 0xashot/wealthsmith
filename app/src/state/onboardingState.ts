/**
 * Onboarding state model (prototype, local-only).
 *
 * Source of truth: patterns/onboarding-with-smith-ai.md (Onboarding Visibility
 * Rule) and patterns/dashboard-layout.md (Global Nav Variants). Onboarding is
 * not optional: it is always visible while disconnected, and remains visible
 * after wallet connection until the required Goal fields are saved. Demo Mode
 * overrides onboarding while active.
 *
 * Goal field IDs/options are canonical from Goal Settings (state/goalState.ts +
 * patterns/goal-settings.md, Decision A). Nothing here computes or invents
 * financial values, suggestions, Top Pick, or protocol decisions.
 */

/**
 * Required Goal fields that gate completion. Monthly Saving Goal is optional and
 * intentionally excluded. Field IDs match Goal Settings / the connected fixture.
 */
export const REQUIRED_GOAL_FIELDS = [
  "financial_goal",
  "risk_tolerance",
  "timeline",
  "income_monthly",
  "expenses_monthly",
  "contribution_frequency",
] as const;

/**
 * Ordered onboarding steps (used for the progress indicator). Step 1 renders the
 * welcome/entry step only; the goal-setup and review steps are added in a later
 * step of this slice.
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "financial_goal",
  "timeline",
  "risk_tolerance",
  "monthly_income",
  "monthly_expenses",
  "contribution_frequency",
  "monthly_saving_goal",
  "review",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length;

/**
 * The single source of the onboarding visibility rule (see the pattern):
 *   onboarding_active = mode !== "demo" && (wallet disconnected || goal not completed)
 * Demo Mode overrides onboarding while active.
 */
export function isOnboardingActive(
  mode: "connected" | "demo" | "disconnected",
  goalCompleted: boolean
): boolean {
  return mode !== "demo" && (mode === "disconnected" || goalCompleted === false);
}
