/**
 * contributionAllocationGapTypes — Step 15D. The versioned, ASSET-AGNOSTIC type contract for the
 * contribution-planning allocation-gap engine. It compares a canonical portfolio snapshot against
 * the Step 15C target-allocation policy and describes, per mapped target, the mathematical
 * allocation gap and the mathematical caps to reach target.
 *
 * CRITICAL BOUNDARY: this layer may calculate mathematical allocation gaps and mathematical caps.
 * It must NOT calculate available funding, deployable capital, a suggested contribution, or a
 * suggested DCA amount — those require the LATER Safety Buffer, contribution-priority, and
 * funding-source layers. It never selects a target, applies a contribution frequency, generates a
 * plan/suggestion, changes product output, or enables execution/signatures.
 *
 * GENERIC BY CONSTRUCTION: nothing here assumes the target is SOL or that a holding lives in a
 * Solana wallet. Future native BTC/ETH (native-chain asset ids) and specific approved RWA targets
 * are representable; multiple growth targets become computable once a versioned sub-allocation
 * policy supplies their percentages.
 */
import type { InvestmentTargetHoldingSource } from "./investmentTargetTypes";

export const CONTRIBUTION_ALLOCATION_GAP_SCHEMA_VERSION = "1.0.0";
export const CONTRIBUTION_ALLOCATION_GAP_POLICY_ID = "contribution_allocation_gap_v1";
export const CONTRIBUTION_ALLOCATION_GAP_POLICY_VERSION = "1.0.0";

export type ContributionAllocationGapAnalysisStatus =
  | "complete"
  | "blocked_policy_readiness"
  | "empty_portfolio"
  | "invalid_input";

export type ContributionAllocationGapClassification =
  | "underweight_trigger_met"
  | "underweight_below_trigger"
  | "at_target"
  | "overweight"
  | "not_evaluable";

export type ContributionAllocationHypotheticalMode = "external_contribution" | "internal_reallocation";

export type ContributionAllocationGapBlocker =
  | "portfolio_snapshot_missing"
  | "portfolio_total_missing"
  | "portfolio_total_invalid"
  | "portfolio_total_negative"
  | "portfolio_snapshot_stale"
  | "target_values_missing"
  | "duplicate_target_value"
  | "unknown_target"
  | "target_value_invalid"
  | "target_value_negative"
  | "target_value_exceeds_portfolio"
  | "target_values_exceed_portfolio"
  | "allocation_policy_missing"
  | "allocation_policy_invalid"
  | "allocation_policy_not_configured"
  | "contribution_target_policy_not_ready"
  | "target_percentage_invalid"
  | "target_percentages_do_not_total_100"
  | "target_not_in_allocation_policy"
  | "empty_portfolio_requires_initial_allocation_plan"
  | "external_target_unreachable_at_100_percent"
  | "hypothetical_amount_invalid"
  | "hypothetical_amount_exceeds_non_target_value"
  | "calculation_inconsistent";

/**
 * Already-aggregated economic exposure for one investment target. `valueUsd` is the canonical,
 * once-counted USD exposure supplied by the upstream portfolio layer (e.g. SOL exposure already
 * folds native stake + supported LSTs without double-counting an LST receipt and its underlying).
 * This type never derives value from raw positions — it consumes a normalized number.
 */
export interface ContributionPortfolioTargetExposure {
  targetId: string;
  assetId: string;

  valueUsd: number;

  holdingSources: InvestmentTargetHoldingSource[];

  sourcePositionCount?: number;

  valuationReady: boolean;

  notes: string[];
}

/**
 * A canonical portfolio-allocation snapshot: the total portfolio value (the SAME denominator the
 * existing portfolio engine uses — unknown/unsupported/long-tail holdings included) plus the
 * already-aggregated target exposures. Exposures may cover enabled, disabled, or modeled targets;
 * only targets present in the allocation policy receive a gap result. Non-target and unregistered
 * value stays in `totalPortfolioValueUsd` and is never dropped from the denominator.
 */
export interface ContributionPortfolioAllocationSnapshot {
  snapshotId: string;
  calculatedAt: string;
  checkedAt: string;

  sourcePortfolioVersion: string;

  totalPortfolioValueUsd: number;

  targetExposures: ContributionPortfolioTargetExposure[];

  valuationStatus: "current" | "stale" | "invalid";

  notes: string[];
}

export interface ContributionAllocationHypotheticalInput {
  targetId: string;
  mode: ContributionAllocationHypotheticalMode;
  amountUsd: number;
}

/**
 * The projected allocation for an EXPLICITLY supplied hypothetical amount. An external contribution
 * increases both the target value and the total portfolio value; an internal reallocation keeps the
 * total constant. Funding availability, the Safety Buffer, and any source asset are NOT evaluated.
 */
export interface ContributionAllocationProjection {
  mode: ContributionAllocationHypotheticalMode;
  amountUsd: number;

  sourceTotalPortfolioValueUsd: number;
  sourceTargetValueUsd: number;
  sourceTargetPct: number;

  projectedTotalPortfolioValueUsd: number;
  projectedTargetValueUsd: number;
  projectedTargetPct: number;

  targetPct: number;
  projectedGapPercentagePoints: number;

  wouldOvershootTarget: boolean;
  withinTargetWithoutOvershoot: boolean;

  fundingAvailabilityEvaluated: false;
  safetyBufferEvaluated: false;
  sourceAssetSelected: false;
  planGenerated: false;
  suggestionGenerated: false;
}

/**
 * The per-target allocation-gap result. Amounts here are MATHEMATICAL allocation quantities only —
 * the internal-reallocation and external-contribution figures are caps "to reach target", never
 * "available", "deployable", "investable", "suggested", or "approved".
 */
export interface ContributionTargetAllocationGapResult {
  targetId: string;
  assetId: string;

  currentValueUsd: number;
  totalPortfolioValueUsd: number;

  currentPct?: number;
  targetPct: number;

  signedGapPercentagePoints?: number;
  underweightPercentagePoints?: number;
  overweightPercentagePoints?: number;

  classification: ContributionAllocationGapClassification;

  underweightTriggerPercentagePoints: number;
  underweightTriggerMet: boolean;

  staticTargetValueAtCurrentTotalUsd?: number;
  signedStaticGapAtCurrentTotalUsd?: number;

  internalReallocationUsdToReachTarget?: number;
  externalContributionUsdToReachTarget?: number;

  maximumInternalReallocationIncreaseWithoutOvershootUsd?: number;
  maximumExternalContributionIncreaseWithoutOvershootUsd?: number;

  currentOverweightUsdAtCurrentTotal?: number;

  hypotheticalProjection?: ContributionAllocationProjection;

  eligibleForFutureGrowthContributionEvaluation: boolean;
  contributionTargetPolicyReady: boolean;

  fundingSourceEvaluated: false;
  fundingAvailabilityEvaluated: false;
  safetyBufferEvaluated: false;
  contributionFrequencyApplied: false;
  contributionAmountCalculated: false;
  targetSelected: false;
  planGenerated: false;
  suggestionGenerated: false;

  blockers: ContributionAllocationGapBlocker[];
  warnings: string[];

  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface ContributionAllocationGapAnalysisResult {
  schemaVersion: "1.0.0";
  policyId: "contribution_allocation_gap_v1";
  policyVersion: "1.0.0";

  status: ContributionAllocationGapAnalysisStatus;

  generatedAt: string;
  checkedAt: string;

  sourceSnapshotId?: string;
  sourcePortfolioVersion?: string;

  sourceAllocationPolicyId?: string;
  sourceAllocationPolicyVersion?: string;

  totalPortfolioValueUsd?: number;

  mappedTargetValueUsd?: number;
  registeredNonTargetValueUsd?: number;
  unmappedOtherValueUsd?: number;

  mappedTargetPctTotal?: number;

  targetResults: ContributionTargetAllocationGapResult[];

  underweightTargetIds: string[];
  triggerMetTargetIds: string[];
  overweightTargetIds: string[];
  atTargetIds: string[];

  emptyPortfolio: boolean;

  currentAllocationCalculated: boolean;

  fundingSourceEvaluated: false;
  fundingAvailabilityEvaluated: false;
  safetyBufferEvaluated: false;
  contributionFrequencyApplied: false;
  contributionPriorityEvaluated: false;
  contributionAmountCalculated: false;
  targetSelected: false;
  dcaPlanGenerated: false;
  suggestionGenerated: false;

  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: ContributionAllocationGapBlocker[];
  warnings: string[];
  notes: string[];
}
