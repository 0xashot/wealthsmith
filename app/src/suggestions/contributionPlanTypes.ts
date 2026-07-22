/**
 * contributionPlanTypes — Step 15G. The versioned type contract for the deterministic, read-only
 * contribution + DCA plan generator. It combines Step 15E priority, the Step 15F primary funding
 * source + capped capacity, Step 15D allocation caps/projections, Step 15B cadence, and Step 15C
 * minimums into ONE structured plan. It is the first layer allowed to select the single final
 * target, calculate the final planned USD amount/range, stage an existing-excess-USDC DCA schedule,
 * and project post-plan allocation + Safety Buffer progress.
 *
 * It still generates NO product suggestion, NO card/modal copy, updates NO product output, selects
 * NO swap route/protocol, estimates NO fees/slippage, prepares NO transaction, requests NO
 * signature, reserves/moves NO funds, and automates NOTHING. Read-only; deterministic (same input →
 * same output, including a deterministic plan id).
 */
export const CONTRIBUTION_PLAN_SCHEMA_VERSION = "1.0.0";
export const CONTRIBUTION_PLAN_POLICY_ID = "contribution_plan_v1";
export const CONTRIBUTION_PLAN_POLICY_VERSION = "1.0.0";
export const EXCESS_USDC_DCA_POLICY_ID = "excess_usdc_staged_dca_v1";
export const EXCESS_USDC_DCA_POLICY_VERSION = "1.0.0";

export type ContributionPlanGenerationStatus =
  | "ready_exact"
  | "ready_range"
  | "no_action_required"
  | "blocked_funding"
  | "blocked_priority"
  | "blocked_multiple_targets"
  | "blocked_projection"
  | "invalid_input";

export type ContributionPlanKind =
  | "safety_buffer_contribution"
  | "stable_allocation_contribution"
  | "growth_recurring_contribution"
  | "growth_excess_usdc_dca";

export type ContributionPlanCadenceMode = "recurring_contribution_template" | "explicit_current_contribution" | "staged_existing_capital";

export type ContributionPlanAmountKind = "exact" | "range";

export type ContributionPlanBlocker =
  | "priority_result_missing"
  | "priority_result_invalid"
  | "funding_result_missing"
  | "funding_result_invalid"
  | "funding_source_not_selected"
  | "primary_source_option_missing"
  | "primary_source_not_eligible"
  | "priority_target_missing"
  | "multiple_priority_targets_require_suballocation_policy"
  | "target_not_registered"
  | "target_role_invalid"
  | "target_result_missing"
  | "allocation_gap_result_missing"
  | "allocation_gap_result_invalid"
  | "amount_missing"
  | "amount_invalid"
  | "amount_unsafe"
  | "amount_below_minimum"
  | "amount_exceeds_source_capacity"
  | "amount_exceeds_allocation_cap"
  | "amount_rounding_would_overshoot"
  | "amount_range_invalid"
  | "projection_invalid"
  | "projection_overshoots_target"
  | "safety_buffer_projection_invalid"
  | "safety_buffer_not_preserved"
  | "tranche_policy_invalid"
  | "tranche_amount_invalid"
  | "tranche_below_minimum"
  | "tranche_total_mismatch"
  | "source_target_pair_invalid"
  | "on_track_cannot_generate_plan"
  | "timestamps_invalid"
  | "plan_inconsistent";

export interface ContributionPlanAmount {
  kind: ContributionPlanAmountKind;

  exactAmountCents?: number;
  exactAmountUsd?: number;

  minimumAmountCents?: number;
  maximumAmountCents?: number;

  minimumAmountUsd?: number;
  maximumAmountUsd?: number;

  sourceCapacityCapped: boolean;

  roundingMode: "exact_cents" | "floor_to_cents_for_cap";

  allocationCapUsd?: number;

  minimumPolicyApplied: "none" | "absolute_50" | "excess_usdc_250";

  minimumPassed: boolean;
}

export interface ContributionPlanCadence {
  mode: ContributionPlanCadenceMode;

  contributionFrequencyId?: "weekly" | "biweekly" | "monthly" | "quarterly" | "occasional";

  contributionsPerYear?: number;

  amountVariesByOneCent?: boolean;

  /**
   * When a fixed-frequency contribution splits into a one-cent-wide range (e.g. $461.53–$461.54)
   * only to reconcile the annual total, this is the single representative per-contribution amount
   * to surface on compact UI — the rounded average, which equals the amount the majority of
   * contributions actually are. The exact min–max range is still available for detailed views.
   */
  representativeContributionAmountUsd?: number;

  trancheCount?: number;
  durationDays?: number;
  relativeDayOffsets?: number[];

  actualCalendarDatesGenerated: false;
}

export interface ContributionPlanStep {
  stepIndex: number;

  relativeDayOffset?: number;

  amount: ContributionPlanAmount;

  sourceId: "upcoming_contribution" | "existing_excess_usdc";

  sourceAssetId?: string;
  targetId: string;
  targetAssetId: string;

  purpose: "increase_safety_buffer" | "increase_stable_allocation" | "increase_growth_allocation";

  executionStatus: "read_only_plan";

  routeSelected: false;
  protocolSelected: false;
  transactionPrepared: false;
  transactionSubmitted: false;
  walletSignatureRequired: false;
}

export interface ContributionPlanProjectionPoint {
  amountCents: number;
  amountUsd: number;

  sourceTotalPortfolioValueUsd?: number;
  projectedTotalPortfolioValueUsd?: number;

  sourceTargetValueUsd?: number;
  projectedTargetValueUsd?: number;

  sourceTargetPct?: number;
  projectedTargetPct?: number;

  targetPct?: number;
  projectedGapPercentagePoints?: number;

  wouldOvershootTarget: boolean;

  sourceEligibleBufferUsd?: number;
  projectedEligibleBufferUsd?: number;
  requiredBufferUsd?: number;
  projectedBufferShortfallUsd?: number;

  safetyBufferPreserved: boolean;
}

export interface ContributionPlanProjection {
  kind: "exact" | "range";

  exact?: ContributionPlanProjectionPoint;

  minimum?: ContributionPlanProjectionPoint;
  maximum?: ContributionPlanProjectionPoint;
}

export interface ContributionPlanUnallocatedCapacity {
  calculated: boolean;

  exactUnusedCents?: number;
  exactUnusedUsd?: number;

  minimumUnusedCents?: number;
  maximumUnusedCents?: number;

  minimumUnusedUsd?: number;
  maximumUnusedUsd?: number;

  routed: false;
  nextPurposeSelected: false;
}

export interface ContributionPlan {
  planId: string;

  schemaVersion: "1.0.0";
  policyId: "contribution_plan_v1";
  policyVersion: "1.0.0";

  status: "ready_exact" | "ready_range";

  kind: ContributionPlanKind;

  generatedAt: string;
  checkedAt: string;

  priorityPurpose: "safety_buffer" | "stable_allocation" | "growth_allocation";

  fundingSourceId: "upcoming_contribution" | "existing_excess_usdc";

  fundingTiming: "expected_future" | "available_now";

  selectedTargetId: string;
  selectedTargetAssetId: string;

  sourceAssetId?: string;

  amount: ContributionPlanAmount;
  cadence: ContributionPlanCadence;
  steps: ContributionPlanStep[];

  projection: ContributionPlanProjection;

  unallocatedSourceCapacity: ContributionPlanUnallocatedCapacity;

  alternativeFundingSourceIds: Array<"upcoming_contribution" | "existing_excess_usdc">;

  sourcePriorityPolicyId: string;
  sourcePriorityPolicyVersion: string;

  sourceFundingPolicyId: string;
  sourceFundingPolicyVersion: string;

  sourceAllocationPolicyId?: string;
  sourceAllocationPolicyVersion?: string;

  sourcePlanPolicyId: "contribution_plan_v1";
  sourcePlanPolicyVersion: "1.0.0";

  planGenerated: true;
  finalTargetSelected: true;
  finalPlanAmountCalculated: boolean;

  exactExecutionAmountResolved: boolean;

  mixedFundingUsed: false;
  alternativePlanGenerated: false;
  residualRouted: false;

  routeEvaluated: false;
  costEvaluated: false;
  slippageEvaluated: false;
  liquidityRouteEvaluated: false;
  protocolEvaluated: false;

  executionReady: false;
  automationEnabled: false;
  suggestionGenerated: false;
  updatesProductOutput: false;

  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: ContributionPlanBlocker[];
  warnings: string[];
  notes: string[];
}

export interface ContributionPlanGenerationResult {
  schemaVersion: "1.0.0";
  policyId: "contribution_plan_v1";
  policyVersion: "1.0.0";

  status: ContributionPlanGenerationStatus;

  generatedAt: string;
  checkedAt: string;

  plan?: ContributionPlan;

  noActionReason?: "contribution_allocation_on_track";

  planGenerated: boolean;
  contributionPlanGenerated: boolean;
  dcaPlanGenerated: boolean;

  finalTargetSelected: boolean;
  finalPlanAmountCalculated: boolean;

  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: ContributionPlanBlocker[];
  warnings: string[];
  notes: string[];
}
