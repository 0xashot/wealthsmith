/**
 * contributionPriorityTypes — Step 15E. The versioned type contract for the deterministic
 * contribution-priority + Safety Buffer gate. It answers ONE question: "what purpose category has
 * priority before any contribution amount or funding source is selected?" — in the fixed order
 * Safety Buffer → stable allocation → growth allocation → On Track.
 *
 * It NEVER answers how much to invest, which balance funds it, how many DCA tranches to build, or
 * what transaction to execute. The Safety Buffer requirement is the CANONICAL WealthSmith
 * calculation (risk-based months × expenses, `wallet/safetyBufferTarget.ts` + `deriveSafetyBuffer`)
 * consumed as-is through a narrow adapter — this layer recomputes no income/expenses/months/coverage
 * and redefines no qualifying buffer asset. Read-only; no execution/signatures.
 */
export const CONTRIBUTION_PRIORITY_SCHEMA_VERSION = "1.0.0";
export const CONTRIBUTION_PRIORITY_POLICY_ID = "contribution_priority_v1";
export const CONTRIBUTION_PRIORITY_POLICY_VERSION = "1.0.0";

export type ContributionPriorityAnalysisStatus =
  | "complete"
  | "blocked_safety_buffer"
  | "blocked_allocation_gap"
  | "blocked_policy_readiness"
  | "invalid_input";

export type ContributionPriorityPurpose = "safety_buffer" | "stable_allocation" | "growth_allocation" | "on_track";

export type ContributionPriorityBlocker =
  | "safety_buffer_result_missing"
  | "safety_buffer_result_invalid"
  | "safety_buffer_policy_version_unsupported"
  | "safety_buffer_values_invalid"
  | "safety_buffer_shortfall_inconsistent"
  | "allocation_gap_result_missing"
  | "allocation_gap_result_invalid"
  | "allocation_gap_incomplete"
  | "stable_target_missing"
  | "stable_target_not_configured"
  | "multiple_stable_targets_require_suballocation_policy"
  | "stable_target_result_missing"
  | "growth_target_policy_not_ready"
  | "growth_target_result_missing"
  | "priority_inconsistent"
  | "unsupported_target"
  | "timestamps_invalid";

/**
 * Narrow adapter for the canonical Safety Buffer result. It MUST be populated from the canonical
 * derivation (`buildContributionSafetyBufferSnapshot`) — never computed here. `requiredBufferUsd`
 * maps to the canonical `targetUsd`, `currentEligibleBufferUsd` to `stableUsd`, and `shortfallUsd`
 * to the canonical `shortfallUsd` (= max(0, required − current)). It alters no qualifying holding.
 */
export interface ContributionSafetyBufferSnapshot {
  sourcePolicyId: string;
  sourcePolicyVersion: string;

  calculatedAt: string;
  checkedAt: string;

  requiredBufferUsd: number;
  currentEligibleBufferUsd: number;
  shortfallUsd: number;

  coverageRatio?: number;
  monthsRequired?: number;
  monthsCovered?: number;

  status: "complete" | "incomplete" | "invalid";

  canonicalCalculationUsed: true;

  notes: string[];
}

export interface ContributionSafetyBufferGateDecision {
  status: "complete" | "incomplete" | "invalid";

  requiredBufferUsd?: number;
  currentEligibleBufferUsd?: number;
  shortfallUsd?: number;

  lowerPriorityEvaluationAllowed: boolean;

  stableAllocationAllowed: boolean;
  growthAllocationAllowed: boolean;

  sourcePolicyId?: string;
  sourcePolicyVersion?: string;

  canonicalCalculationUsed: boolean;

  blockers: ContributionPriorityBlocker[];
  warnings: string[];

  contributionAmountCalculated: false;
  residualAmountCalculated: false;
  fundingSourceSelected: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface ContributionPriorityStableContext {
  stableTargetIds: string[];
  triggerMetStableTargetIds: string[];
  underweightStableTargetIds: string[];

  stableAllocationPriorityRequired: boolean;
}

export interface ContributionPriorityGrowthContext {
  eligibleGrowthTargetIds: string[];
  underweightGrowthTargetIds: string[];
  triggerMetGrowthTargetIds: string[];

  growthAllocationMayProceed: boolean;
}

export interface ContributionPriorityDecision {
  schemaVersion: "1.0.0";
  policyId: "contribution_priority_v1";
  policyVersion: "1.0.0";

  status: ContributionPriorityAnalysisStatus;
  purpose?: ContributionPriorityPurpose;

  generatedAt: string;
  checkedAt: string;

  safetyBuffer: {
    evaluated: true;

    complete: boolean;
    requiredBufferUsd: number;
    currentEligibleBufferUsd: number;
    shortfallUsd: number;

    sourcePolicyId: string;
    sourcePolicyVersion: string;

    overridesLowerPriorities: boolean;
  };

  stableContext?: ContributionPriorityStableContext;
  growthContext?: ContributionPriorityGrowthContext;

  primaryTargetCategory?: "safety_buffer" | "stable_asset" | "growth_asset" | "none";

  priorityTargetIds: string[];

  lowerPriorityEvaluationSuppressed: boolean;
  growthSuppressedBySafetyBuffer: boolean;
  stableAllocationSuppressedBySafetyBuffer: boolean;

  safetyBufferPriorityShortfallUsd?: number;

  contributionFrequencyApplied: false;
  fundingSourceSelected: false;
  fundingAvailabilityEvaluated: false;
  excessUsdcCalculated: false;
  contributionAmountCalculated: false;
  residualAmountCalculated: false;
  targetSelected: false;
  dcaPlanGenerated: false;
  suggestionGenerated: false;

  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: ContributionPriorityBlocker[];
  warnings: string[];
  notes: string[];
}
