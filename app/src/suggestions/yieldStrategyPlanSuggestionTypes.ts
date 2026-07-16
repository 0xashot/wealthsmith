/**
 * yieldStrategyPlanSuggestionTypes — Step 16H-A. The versioned contract for converting a Step 16G
 * ready plan into a deterministic, read-only Suggestion Engine suggestion (category `stable_yield`).
 * The Step 16G plan is the SOLE source of truth: this layer re-selects no product, recalculates no
 * amount, chooses no lane/strategy, infers no APY/capacity/minimum, alters no plan ID, and modifies no
 * projection. It builds NO transaction/execution/signature and generates no user-facing copy (only copy
 * KEYS). The structured metadata is attached to the engine suggestion for later UI/Smith-AI steps.
 */
export const YIELD_STRATEGY_SUGGESTION_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_SUGGESTION_POLICY_ID = "yield_strategy_suggestion_v1";
export const YIELD_STRATEGY_SUGGESTION_POLICY_VERSION = "1.0.0";

/** Stable suggestion-id prefix (the rest is the stable Step 16G plan id). */
export const YIELD_STRATEGY_SUGGESTION_ID_PREFIX = "sy_plan_";

/** APY provenance, preserved VERBATIM only when supplied by already-approved upstream product data. */
export interface StableYieldSuggestionApyProvenance {
  netApyPct?: number;
  grossApyPct?: number;
  apyDefinition: string;
  apyWindow: string;
  sourceId: string;
  sourceLabel?: string;
}

/** Before/after coverage projection, copied verbatim from the 16G plan (never recalculated). */
export interface StableYieldPlanSuggestionProjection {
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
}

/** Structured Stable Yield plan metadata attached to a plan-backed `stable_yield` suggestion. */
export interface StableYieldPlanSuggestionMeta {
  schemaVersion: "1.0.0";
  suggestionPolicyId: string;
  suggestionPolicyVersion: string;

  /** The Step 16G plan id — preserved verbatim (this layer never alters it). */
  sourcePlanId: string;
  planPolicyId: string;
  planPolicyVersion: string;

  lane: "buffer" | "excess";
  actionMode: "start_new_position" | "add_to_existing_strategy";

  strategyId: string;
  displayName: string;
  protocolId: string;
  protocolDisplayName: string;
  productAddress: string;
  principalAssetId: string;

  amountUsd: number;
  amountCents: number;

  fundingSource: "direct_wallet_usdc";
  fundingAvailableUsd: number;

  laneCapitalUsd: number;
  effectiveMinimumUsd: number;
  effectiveMaximumUsd: number;
  effectiveProductCapacityUsd: number;
  capacityMode: string;
  capacitySourceId: string;
  capacityFetchedAt: string;

  comparisonStatus: string;
  comparisonLeaderReason: string;
  comparisonLeaderScore?: number;
  leaderPositionStatus: string;

  projection: StableYieldPlanSuggestionProjection;

  /** Present only when APY provenance was supplied by approved upstream product data. */
  apy?: StableYieldSuggestionApyProvenance;

  readOnly: true;
  /** The user deposits externally — WealthSmith never custodies or executes. */
  externalManagementRequired: true;

  productSelected: true;
  amountSelected: true;
  planGenerated: true;
  suggestionGenerated: true;

  updatesProductOutput: false;
  executionPrepared: false;
  transactionBuilt: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/** Where a plan was suppressed relative to suggestion conversion. */
export type StableYieldSuggestionSuppressionStage = "planning" | "suggestion_conversion" | "none";

/** Deterministic diagnostic for whether a plan became a suggestion (and why not). No user copy. */
export interface StableYieldSuggestionDiagnostic {
  emitted: boolean;
  suppressionStage: StableYieldSuggestionSuppressionStage;
  reason: string;
  planStatus: string;
  bufferLaneStatus: string;
  excessLaneStatus: string;
  selectedLane?: "buffer" | "excess";
  noPlanReason?: string;
  category: "stable_yield";
  lane?: "buffer" | "excess";
  actionable: boolean;
  topPickEligible: boolean;
  suggestionId?: string;
  sourcePlanId?: string;
}

export interface StableYieldPlanSuggestionValidationResult {
  valid: boolean;
  errors: string[];
}
