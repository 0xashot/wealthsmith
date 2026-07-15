/**
 * contributionFrequencyTypes — Step 15B. The versioned model for normalizing a user's monthly
 * saving goal + onboarding contribution frequency into an annual saving budget and (for fixed
 * frequencies) an exact whole-cent per-contribution decomposition.
 *
 * SOURCE OF TRUTH: the onboarding contribution-frequency choices in `state/goalState.ts`
 * (`CONTRIBUTION_OPTIONS`, field `contribution_frequency` on `SavedGoal`): weekly, biweekly,
 * monthly, quarterly, occasional. This module mirrors those EXACT values as the suggestion-domain
 * canonical IDs (a narrow adapter maps serialized/alias forms) — it introduces no competing
 * vocabulary and no extra frequencies (no twice_monthly / semi_monthly / custom / daily / annual).
 *
 * Non-UI, deterministic, read-only. It selects no target, evaluates no allocation gap / safety
 * buffer / suitability, generates no plan / DCA / suggestion, produces no dates, and never
 * implies automatic transfers, transactions, or signatures.
 */
export const CONTRIBUTION_FREQUENCY_SCHEMA_VERSION = "1.0.0";
export const CONTRIBUTION_FREQUENCY_POLICY_VERSION = "1.0.0";

/** The exact WealthSmith onboarding contribution-frequency choices (state/goalState.ts values). */
export type ContributionFrequencyId = "weekly" | "biweekly" | "monthly" | "quarterly" | "occasional";

export type ContributionFrequencyNormalizationStatus =
  | "normalized_fixed"
  | "normalized_occasional"
  | "no_saving_goal"
  | "invalid_saving_goal"
  | "missing_frequency"
  | "unsupported_frequency"
  | "invalid_currency"
  | "unsafe_numeric_input";

export interface ContributionFrequencyDefinition {
  frequencyId: ContributionFrequencyId;
  displayLabel: string;
  /** Fixed annual contribution count — undefined for the irregular "occasional" frequency. */
  contributionsPerYear?: number;
  fixedFrequency: boolean;
  fixedCalendarScheduleGenerated: false;
  exactDatesCalculated: false;
}

/** Normalization boundary input — deliberately `unknown` so it can adapt from any profile shape. */
export interface ContributionFrequencyNormalizationInput {
  monthlySavingGoalUsd: unknown;
  contributionFrequency: unknown;
  currency?: unknown;
}

export interface ContributionCentDecomposition {
  annualSavingGoalCents: number;
  contributionsPerYear: number;

  baseContributionCents: number;
  remainderCents: number;

  contributionsAtBaseAmount: number;
  contributionsAtBasePlusOneCent: number;

  baseContributionAmountUsd: number;
  basePlusOneCentContributionAmountUsd: number;

  exactAnnualReconciliation: true;
}

export interface ContributionFrequencyNormalizationResult {
  schemaVersion: "1.0.0";
  policyVersion: "1.0.0";

  status: ContributionFrequencyNormalizationStatus;

  sourceMonthlySavingGoalUsd?: unknown;
  sourceContributionFrequency?: unknown;

  currency: "USD";

  canonicalFrequencyId?: ContributionFrequencyId;
  frequencyDisplayLabel?: string;

  fixedFrequency?: boolean;

  monthlySavingGoalCents?: number;
  annualSavingGoalCents?: number;

  monthlySavingGoalUsd?: number;
  annualSavingGoalUsd?: number;

  contributionsPerYear?: number;

  exactAverageContributionAmountUsd?: number;
  approximateDisplayContributionAmountUsd?: number;

  centDecomposition?: ContributionCentDecomposition;

  contributionDatesCalculated: false;
  targetSelected: false;
  allocationGapEvaluated: false;
  safetyBufferEvaluated: false;
  userSuitabilityEvaluated: false;
  contributionPlanGenerated: false;
  dcaPlanGenerated: false;
  suggestionGenerated: false;

  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: string[];
  warnings: string[];
  notes: string[];
}
