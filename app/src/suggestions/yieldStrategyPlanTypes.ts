/**
 * yieldStrategyPlanTypes — Step 16G. Versioned contracts for the deterministic single read-only Stable
 * Yield PLAN: the per-lane evaluation, the before/after projection, the read-only plan, and the overall
 * decision. Step 16G selects one lane, one exact approved comparison-leader product, and one exact
 * read-only amount (funded ONLY by direct liquid USDC). It generates NO suggestion, NO card/modal, NO
 * deep link, NO transaction/instruction/route/signature, and updates NO product output.
 */
import type { YieldStrategyEligibilityLane } from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyLeaderPositionStatus } from "./yieldStrategyPositionTypes";
import type { YieldStrategyCapacityMode } from "./yieldStrategyProductCapacity";

export const YIELD_STRATEGY_PLAN_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_PLAN_POLICY_ID = "yield_strategy_plan_v1";
export const YIELD_STRATEGY_PLAN_POLICY_VERSION = "1.0.0";
export const YIELD_STRATEGY_PLAN_SELECTION_POLICY_ID = "yield_strategy_plan_selection_v1";
export const YIELD_STRATEGY_PLAN_SELECTION_POLICY_VERSION = "1.0.0";

/** Only two action modes — no switch/replace/migrate/rebalance (those are Step 19). */
export type YieldStrategyPlanActionMode = "start_new_position" | "add_to_existing_strategy";

export type YieldStrategyPlanDecisionStatus = "ready" | "no_plan" | "blocked" | "invalid";

export type YieldStrategyLaneEvaluationStatus =
  | "ready"
  | "no_comparison_leader"
  | "no_eligible_capital"
  | "below_minimum"
  | "product_capacity_unavailable"
  | "product_capacity_insufficient"
  | "leader_position_ambiguous"
  | "leader_position_unavailable"
  | "buffer_minimum_policy_missing"
  | "suppressed_by_higher_priority_lane"
  | "blocked"
  | "invalid";

export type YieldStrategyNoPlanReason =
  | "empty_approved_set"
  | "no_buffer_comparison_leader"
  | "no_excess_comparison_leader"
  | "comparison_leader_withheld_tie"
  | "comparison_leader_withheld_sensitivity"
  | "comparison_leader_withheld_incomparable_data"
  | "buffer_capital_unavailable"
  | "excess_capital_unavailable"
  | "buffer_amount_below_minimum"
  | "excess_amount_below_minimum"
  | "buffer_yield_minimum_policy_missing"
  | "product_capacity_missing"
  | "product_capacity_stale"
  | "product_capacity_unknown"
  | "product_full"
  | "deposits_paused"
  | "minimum_deposit_not_met"
  | "leader_position_ambiguous"
  | "leader_position_unavailable"
  | "no_ready_lane";

/** Deterministic before/after coverage projection. No expected earnings / APY multiplication. */
export interface YieldStrategyPlanProjection {
  directLiquidUsdcBeforeUsd: number;
  directLiquidUsdcAfterUsd: number;
  directWalletEligibleBufferBeforeUsd: number;
  directWalletEligibleBufferAfterUsd: number;
  existingEligibleBufferYieldBeforeUsd: number;
  existingEligibleBufferYieldAfterUsd: number;
  currentEligibleBufferBeforeUsd: number;
  currentEligibleBufferAfterUsd: number;
  requiredBufferUsd: number;
  requiredWalletFloorUsd: number;
  selectedProductCountsTowardBuffer: boolean;
  bufferCoveragePreserved: boolean;
  walletFloorPreserved: boolean;
  remainingLaneCapitalUsd: number;
}

export interface YieldStrategyPlanSource {
  type: "direct_wallet_usdc";
  assetId: "USDC";
  availableUsd: number;
}

export interface YieldStrategyPlan {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  planId: string;
  status: "ready";

  ownerAddress: string;
  checkedAt: string;

  lane: YieldStrategyEligibilityLane;
  actionMode: YieldStrategyPlanActionMode;

  strategyId: string;
  displayName: string;
  protocolId: string;
  protocolDisplayName: string;
  productAddress: string;
  principalAssetId: string;

  comparisonStatus: string;
  comparisonLeaderReason: string;
  comparisonLeaderScore?: number;

  leaderPositionStatus: YieldStrategyLeaderPositionStatus;

  source: YieldStrategyPlanSource;

  amountUsd: number;
  amountCents: number;

  laneCapitalUsd: number;
  effectiveProductCapacityUsd: number;
  effectiveMinimumUsd: number;
  effectiveMaximumUsd: number;

  capacityMode: YieldStrategyCapacityMode;
  capacitySourceId: string;
  capacityFetchedAt: string;

  projection: YieldStrategyPlanProjection;

  readOnly: true;

  productSelected: true;
  amountSelected: true;
  planGenerated: true;

  suggestionGenerated: false;
  updatesProductOutput: false;
  executionPrepared: false;
  transactionBuilt: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  warnings: string[];
  blockers: string[];
  notes: string[];
}

export interface YieldStrategyLaneEvaluation {
  lane: YieldStrategyEligibilityLane;
  status: YieldStrategyLaneEvaluationStatus;

  comparisonStatus: string;
  leaderSelectionReason: string;
  comparisonLeaderStrategyId?: string;
  comparisonLeaderScore?: number;
  leaderPositionStatus: YieldStrategyLeaderPositionStatus;
  actionMode?: YieldStrategyPlanActionMode;

  laneCapitalUsd: number;
  laneMinimumUsd?: number;
  effectiveMinimumUsd?: number;
  effectiveMaximumUsd?: number;
  effectiveProductCapacityUsd?: number;
  candidateAmountUsd?: number;
  candidateAmountCents?: number;
  capacityMode?: YieldStrategyCapacityMode;

  projection?: YieldStrategyPlanProjection;
  candidatePlan?: YieldStrategyPlan;

  noPlanReason?: YieldStrategyNoPlanReason;
  blockers: string[];
  warnings: string[];
  notes: string[];
}

export interface YieldStrategyPlanDecision {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  ownerAddress: string;
  checkedAt: string;

  status: YieldStrategyPlanDecisionStatus;

  bufferLaneEvaluation: YieldStrategyLaneEvaluation;
  excessLaneEvaluation: YieldStrategyLaneEvaluation;

  selectedLane?: YieldStrategyEligibilityLane;
  selectedPlan?: YieldStrategyPlan;

  selectedStrategyId?: string;
  selectedAmountUsd?: number;
  selectedAmountCents?: number;

  planCount: 0 | 1;

  selectedLaneCapitalUsd?: number;
  unselectedLane?: YieldStrategyEligibilityLane;
  unselectedLaneStatus?: YieldStrategyLaneEvaluationStatus;
  sharedSourceOverlapUsd: number;
  sharedSourceResolvedBySinglePlan: boolean;

  productSelected: boolean;
  amountSelected: boolean;
  planGenerated: boolean;

  suggestionGenerated: false;
  updatesProductOutput: false;
  executionPrepared: false;
  transactionBuilt: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  warnings: string[];
  blockers: string[];
  notes: string[];
}

export interface YieldStrategyPlanValidationResult { valid: boolean; errors: string[]; }
