/**
 * contributionFundingTypes — Step 15F. The versioned type contract for deterministic contribution
 * funding-source selection and funding-availability logic. It decides, for the current Step 15E
 * priority: whether an UPCOMING contribution (planned future funding from onboarding frequency or an
 * explicit current amount) and/or EXISTING EXCESS USDC (currently liquid USDC above the canonical
 * Safety Buffer) is a usable source, each source's mathematical capacity after the Safety Buffer /
 * allocation cap / minimum policy, and the deterministic primary + alternative source.
 *
 * It calculates NO final contribution/DCA amount, NO tranches/dates, NO residual routing, NO
 * allocation across multiple targets, NO final target, NO plan/suggestion, and NO product UI. It
 * reuses the Step 15B normalization, 15C minimums, 15D caps, and 15E priority + canonical Safety
 * Buffer — recomputing none of them. Liquidity uses a narrow adapter populated by canonical upstream
 * classification (never inferred from token symbols or protocol names). Read-only; no execution.
 */
export const CONTRIBUTION_FUNDING_SCHEMA_VERSION = "1.0.0";
export const CONTRIBUTION_FUNDING_POLICY_ID = "contribution_funding_selection_v1";
export const CONTRIBUTION_FUNDING_POLICY_VERSION = "1.0.0";

export type ContributionFundingSourceId = "upcoming_contribution" | "existing_excess_usdc";

export type ContributionFundingTiming = "expected_future" | "available_now";

export type ContributionFundingSourceStatus =
  | "eligible_exact"
  | "eligible_range"
  | "ineligible_not_applicable"
  | "ineligible_below_minimum"
  | "ineligible_no_capacity"
  | "requires_explicit_amount"
  | "requires_exact_amount"
  | "blocked_stale_data"
  | "blocked_invalid_data";

export type ContributionFundingAnalysisStatus =
  | "source_selected"
  | "no_action_required"
  | "no_eligible_source"
  | "blocked_priority"
  | "blocked_frequency"
  | "blocked_liquidity"
  | "invalid_input";

export type ContributionFundingBlocker =
  | "priority_result_missing"
  | "priority_result_invalid"
  | "priority_status_blocked"
  | "contribution_frequency_missing"
  | "contribution_frequency_invalid"
  | "contribution_amount_missing"
  | "contribution_amount_invalid"
  | "contribution_amount_below_minimum"
  | "contribution_amount_requires_exact_resolution"
  | "liquidity_snapshot_missing"
  | "liquidity_snapshot_stale"
  | "liquidity_snapshot_invalid"
  | "duplicate_liquidity_position"
  | "liquidity_position_value_invalid"
  | "liquid_usdc_missing"
  | "buffer_values_invalid"
  | "buffer_surplus_zero"
  | "excess_usdc_below_trigger"
  | "allocation_gap_result_missing"
  | "allocation_gap_result_invalid"
  | "priority_target_result_missing"
  | "allocation_cap_missing"
  | "allocation_cap_invalid"
  | "capped_capacity_below_minimum"
  | "funding_source_not_applicable"
  | "same_asset_cannot_correct_allocation"
  | "multiple_priority_targets_require_plan_allocation"
  | "source_selection_inconsistent"
  | "safety_buffer_would_be_reduced_below_requirement"
  | "timestamps_invalid";

export type ContributionFundingUsdcPositionSource = "wallet_balance" | "protocol_position" | "other_canonical_source";

export type ContributionFundingLiquidityStatus = "liquid_now" | "requires_withdrawal" | "locked" | "reserved" | "unavailable" | "unknown";

/**
 * One canonically-classified USDC position. `liquidityStatus` MUST come from upstream classification
 * — Step 15F never infers it from the source type. Only `liquid_now` counts as available-now USDC.
 */
export interface ContributionFundingUsdcPosition {
  positionId: string;

  source: ContributionFundingUsdcPositionSource;

  liquidityStatus: ContributionFundingLiquidityStatus;

  valueUsd: number;

  calculatedAt: string;

  canonicalClassificationUsed: true;

  notes: string[];
}

/**
 * A canonical liquidity snapshot of USDC positions. Populated upstream (never fetched here); Step 15F
 * only sums the already-classified `liquid_now` value and reports diagnostic totals for the rest.
 */
export interface ContributionFundingLiquiditySnapshot {
  snapshotId: string;

  calculatedAt: string;
  checkedAt: string;

  sourcePortfolioVersion: string;

  status: "current" | "stale" | "invalid";

  usdcPositions: ContributionFundingUsdcPosition[];

  canonicalLiquidityClassificationUsed: true;

  notes: string[];
}

export type ContributionFundingCapacityKind = "exact" | "range" | "unresolved";

export interface ContributionFundingSourceOption {
  sourceId: ContributionFundingSourceId;

  timing: ContributionFundingTiming;
  status: ContributionFundingSourceStatus;

  capacityKind: ContributionFundingCapacityKind;

  grossSourceCapacityUsd?: number;

  minimumGrossSourceCapacityUsd?: number;
  maximumGrossSourceCapacityUsd?: number;

  mathematicalPlanningCapUsd?: number;

  cappedSourceCapacityUsd?: number;

  minimumCappedSourceCapacityUsd?: number;
  maximumCappedSourceCapacityUsd?: number;

  applicablePriorityPurpose: "safety_buffer" | "stable_allocation" | "growth_allocation";

  applicableTargetIds: string[];

  minimumPolicyApplied: "none" | "absolute_50" | "excess_usdc_250";

  minimumPassed: boolean;

  safetyBufferPreserved: boolean;

  exactCurrentAmountKnown: boolean;

  sourceCapacityCalculated: boolean;
  finalPlanAmountCalculated: false;
  residualAmountCalculated: false;
  targetAllocationAcrossIdsCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;

  blockers: ContributionFundingBlocker[];
  warnings: string[];

  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface ContributionFundingSelectionResult {
  schemaVersion: "1.0.0";
  policyId: "contribution_funding_selection_v1";
  policyVersion: "1.0.0";

  status: ContributionFundingAnalysisStatus;

  generatedAt: string;
  checkedAt: string;

  priorityPurpose?: "safety_buffer" | "stable_allocation" | "growth_allocation" | "on_track";

  priorityTargetIds: string[];

  sourceOptions: ContributionFundingSourceOption[];

  primaryFundingSourceId?: ContributionFundingSourceId;
  alternativeFundingSourceIds: ContributionFundingSourceId[];

  mixedFundingAllowed: false;
  mixedFundingSelected: false;

  upcomingContributionEvaluated: boolean;
  existingExcessUsdcEvaluated: boolean;

  contributionFrequencyApplied: boolean;
  liquidityEvaluated: boolean;
  excessUsdcCalculated: boolean;

  liquidUsdcAvailableNowUsd?: number;
  canonicalBufferSurplusUsd?: number;
  excessLiquidUsdcAboveBufferUsd?: number;
  projectedEligibleBufferAfterMaximumExcessUseUsd?: number;

  sourceSelected: boolean;
  fundingAvailabilityEvaluated: boolean;

  finalContributionAmountCalculated: false;
  residualAmountCalculated: false;
  finalTargetSelected: false;
  targetAllocationAcrossIdsCalculated: false;
  dcaPlanGenerated: false;
  suggestionGenerated: false;

  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: ContributionFundingBlocker[];
  warnings: string[];
  notes: string[];
}
