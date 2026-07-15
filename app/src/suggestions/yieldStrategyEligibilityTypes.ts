/**
 * yieldStrategyEligibilityTypes — Step 16D. The versioned type contract for the deterministic Stable
 * Yield ELIGIBILITY layer. It answers ONE question per lane: "may this EXACT strategy proceed to a
 * later (16E) comparison for the Safety Buffer lane, the Excess-USDC lane, both, or neither?".
 *
 * It NEVER answers which strategy is better, which is the leader, how much USDC to allocate, whether to
 * move a position, or whether to generate a suggestion. It combines exact registry identity + lifecycle
 * (16B), the 16A strategy/lane policy, 16C market-data readiness, static product risk-review metadata
 * (16D), and user risk compatibility for the excess lane. It is deterministic, versioned, comparison-
 * free, amount-free, suggestion-free, UI-free, and read-only. It consumes NO wallet balances / positions
 * and calculates NO capital. A zero-approved production registry yields an empty eligibility set — valid.
 */
import type { StableYieldStrategyType } from "./stableYieldPolicyTypes";

export const YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_ELIGIBILITY_POLICY_ID = "yield_strategy_eligibility_v1";
export const YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION = "1.0.0";

export const YIELD_STRATEGY_RISK_REVIEW_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_RISK_REVIEW_POLICY_ID = "yield_strategy_risk_review_v1";
export const YIELD_STRATEGY_RISK_REVIEW_POLICY_VERSION = "1.0.0";

/** The two lanes eligibility is evaluated against (short form: `buffer` / `excess`). */
export type YieldStrategyEligibilityLane = "buffer" | "excess";

/** Per-lane eligibility status for one exact strategy. */
export type YieldStrategyLaneEligibilityStatus =
  | "eligible_for_comparison"
  | "ineligible"
  | "blocked_missing_data"
  | "blocked_stale_data"
  | "unsupported"
  | "invalid";

/** Whole-set status. `empty_approved_set` is the valid production state today. */
export type YieldStrategyEligibilitySetStatus = "complete" | "empty_approved_set" | "blocked" | "invalid";

/**
 * The deterministic blocker vocabulary. Accumulated in gate order; a later successful check never
 * erases an earlier blocker.
 */
export type YieldStrategyEligibilityBlocker =
  // input / control
  | "input_invalid"
  | "unknown_lane"
  | "checked_at_invalid"
  // registry + identity
  | "strategy_not_registered"
  | "strategy_not_approved"
  | "exact_identity_missing"
  | "address_missing"
  | "lifecycle_not_active"
  | "lane_not_supported"
  | "risk_lane_not_supported"
  | "principal_asset_not_supported"
  | "strategy_type_not_supported"
  // market data
  | "market_snapshot_missing"
  | "market_snapshot_invalid"
  | "market_snapshot_partial"
  | "market_snapshot_stale"
  | "market_provenance_missing"
  | "apy_missing"
  | "apy_invalid"
  | "apy_definition_unknown"
  | "apy_definition_not_comparable"
  | "tvl_missing"
  | "tvl_invalid"
  | "tvl_below_minimum"
  | "liquidity_missing"
  | "liquidity_unknown"
  | "liquidity_confidence_insufficient"
  | "withdrawal_status_unknown"
  | "withdrawal_unavailable"
  | "withdrawal_queue_active"
  | "withdrawal_delay_unknown"
  | "withdrawal_delay_exceeds_policy"
  | "fee_definition_missing"
  | "market_capacity_unavailable"
  // risk review
  | "risk_review_missing"
  | "risk_review_invalid"
  | "risk_review_stale"
  | "review_identity_mismatch"
  | "operational_status_unknown"
  | "strategy_paused"
  | "strategy_deprecated"
  | "audit_status_unknown"
  | "audit_requirement_not_met"
  | "custody_model_unknown"
  | "non_custodial_requirement_not_met"
  | "leverage_status_unknown"
  | "leverage_not_allowed"
  | "resulting_exposure_unknown"
  | "resulting_exposure_not_allowed"
  | "risk_score_missing"
  | "risk_score_invalid"
  | "risk_score_below_minimum"
  | "risk_tier_unknown"
  | "user_risk_incompatible"
  // policy
  | "buffer_strategy_not_conservative"
  | "buffer_strategy_not_immediately_liquid"
  | "buffer_strategy_not_usdc_only"
  | "buffer_strategy_uses_leverage"
  | "buffer_strategy_has_lp_exposure"
  | "excess_strategy_not_compatible"
  | "eligibility_inconsistent";

/** Static product risk-review reviewStatus. Does NOT override registry lifecycle. */
export type YieldStrategyRiskReviewStatus = "approved" | "conditional" | "rejected" | "expired" | "incomplete";
export type YieldStrategyOperationalStatus = "active" | "paused" | "deprecated" | "disabled" | "unknown";
export type YieldStrategyResultingExposure = "usdc_only" | "stablecoin_pair" | "stable_basket" | "mixed_asset" | "unknown";
export type YieldStrategyCustodyModel = "non_custodial" | "custodial" | "hybrid" | "unknown";
export type YieldStrategyAuditStatus = "verified" | "partial" | "none" | "unknown";
export type YieldStrategyLeverageUsed = true | false | "unknown";
export type YieldStrategyRiskTier = "conservative" | "moderate" | "elevated" | "unknown";

/**
 * The static, versioned product RISK REVIEW. Separate from the registry (identity-only) and the market
 * snapshot (live-data-only). Its exact strategyId/protocolId/address must match the registry; a review
 * never approves a `documentation_required` entry and its `reviewStatus` never overrides lifecycle.
 */
export interface YieldStrategyRiskReview {
  schemaVersion: "1.0.0";
  policyId: "yield_strategy_risk_review_v1";
  policyVersion: "1.0.0";

  reviewId: string;
  reviewVersion: string;

  strategyId: string;
  protocolId: string;
  address: string;

  reviewedAt: string;
  validUntil?: string;

  reviewStatus: YieldStrategyRiskReviewStatus;
  operationalStatus: YieldStrategyOperationalStatus;

  principalAssetId: string;

  resultingExposure: YieldStrategyResultingExposure;
  custodyModel: YieldStrategyCustodyModel;
  auditStatus: YieldStrategyAuditStatus;
  auditReferences: Array<{ auditor: string; reportUrl?: string; reportDate?: string }>;

  leverageUsed: YieldStrategyLeverageUsed;
  smartContractRiskTier: YieldStrategyRiskTier;
  riskScore?: number;

  compatibleUserRiskProfileIds: string[];

  bufferUseReviewed: boolean;
  excessUseReviewed: boolean;

  notes: string[];

  comparisonPerformed: false;
  leaderSelected: false;
  amountCalculated: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/** One exact strategy's per-lane eligibility result. */
export interface YieldStrategyLaneEligibilityResult {
  schemaVersion: "1.0.0";
  policyId: "yield_strategy_eligibility_v1";
  policyVersion: "1.0.0";

  strategyId: string;
  protocolId: string;
  address?: string;

  lane: YieldStrategyEligibilityLane;
  status: YieldStrategyLaneEligibilityStatus;

  registryApproved: boolean;
  exactIdentityReady: boolean;
  marketDataReady: boolean;
  riskReviewReady: boolean;
  userRiskCompatible: boolean;

  eligibleForComparison: boolean;

  apyDefinitionReady: boolean;
  tvlRequirementPassed: boolean;
  liquidityRequirementPassed: boolean;
  withdrawalRequirementPassed: boolean;
  auditRequirementPassed: boolean;
  custodyRequirementPassed: boolean;
  leverageRequirementPassed: boolean;
  exposureRequirementPassed: boolean;
  operationalRequirementPassed: boolean;

  comparisonPerformed: false;
  rankAssigned: false;
  leaderSelected: false;
  userCapitalEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: YieldStrategyEligibilityBlocker[];
  warnings: string[];
  notes: string[];
}

/** The whole eligibility set across both lanes, in canonical registry order. */
export interface YieldStrategyEligibilitySet {
  schemaVersion: "1.0.0";
  policyId: "yield_strategy_eligibility_v1";
  policyVersion: "1.0.0";

  status: YieldStrategyEligibilitySetStatus;
  checkedAt: string;

  bufferResults: YieldStrategyLaneEligibilityResult[];
  excessResults: YieldStrategyLaneEligibilityResult[];

  bufferEligibleStrategyIds: string[];
  excessEligibleStrategyIds: string[];

  blockedStrategyIds: string[];
  unsupportedStrategyIds: string[];

  emptyApprovedSet: boolean;

  comparisonPerformed: false;
  rankingPerformed: false;
  leaderSelected: false;
  walletPositionsEvaluated: false;
  userCapitalEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: YieldStrategyEligibilityBlocker[];
  warnings: string[];
  notes: string[];
}

export interface YieldStrategyEligibilityValidationResult {
  valid: boolean;
  errors: string[];
}

/** Strategy types that can ever be eligible (16A taxonomy minus the unapproved `future_other`). */
export const ELIGIBLE_STRATEGY_TYPES: readonly StableYieldStrategyType[] = ["lending", "managed_vault", "staking_like_vault", "stable_liquidity_strategy"];
