/**
 * yieldStrategyEligibilityPolicy — Step 16D. The deterministic, versioned per-lane eligibility RULES.
 * It reuses the canonical documented thresholds (never re-invents a number): the 16C freshness bounds +
 * APY/withdrawal vocab, and the Step 12E protocol-eligibility gates in `engineThresholds.ts`
 * (`MIN_PROTOCOL_TVL_USD`, `MIN_PROTOCOL_RISK_SCORE`, `MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER`,
 * `MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD`, `MIN_LIQUIDITY_USD`). Where no canonical threshold is
 * documented (product-review freshness), it does NOT invent one — it relies on the review's explicit
 * `validUntil` and marks the freshness policy unresolved. POLICY ONLY: no comparison, no amount, no
 * suggestion, no execution.
 */
import {
  MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD,
  MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER,
  MIN_LIQUIDITY_USD,
  MIN_PROTOCOL_RISK_SCORE,
  MIN_PROTOCOL_TVL_USD,
} from "./engineThresholds";
import {
  YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS,
  YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS,
} from "./yieldStrategyMarketDataPolicy";
import {
  YIELD_STRATEGY_ELIGIBILITY_POLICY_ID,
  YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION,
  YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION,
  type YieldStrategyEligibilityLane,
  type YieldStrategyResultingExposure,
} from "./yieldStrategyEligibilityTypes";
import type { YieldWithdrawalStatus } from "./yieldStrategyMarketDataTypes";

export const YIELD_STRATEGY_ELIGIBILITY_POLICY_EXISTS = true;

/* ------------------------------------------------------------------ *
 * Canonical thresholds — re-exported from their documented sources (never re-declared with new values).
 * ------------------------------------------------------------------ */
export {
  MIN_PROTOCOL_TVL_USD,
  MIN_PROTOCOL_RISK_SCORE,
  MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER,
  MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD,
  MIN_LIQUIDITY_USD,
} from "./engineThresholds";

/** The canonical non-custodial requirement both lanes enforce. */
export const REQUIRED_CUSTODY_MODEL = "non_custodial" as const;

/** No canonical product-review freshness max-age is documented — do not invent one; rely on validUntil. */
export const PRODUCT_REVIEW_FRESHNESS_POLICY_RESOLVED = false;

/** Leverage is never permitted by any documented Stable Yield product policy today. */
export const LEVERAGE_PERMITTED = false;

/** Exposures the Excess-USDC lane may allow (reviewed). Buffer lane is stricter (usdc_only). */
export const EXCESS_ALLOWED_EXPOSURES: readonly YieldStrategyResultingExposure[] = ["usdc_only", "stablecoin_pair", "stable_basket"];
/** The Safety Buffer lane allows exactly one exposure. */
export const BUFFER_ALLOWED_EXPOSURES: readonly YieldStrategyResultingExposure[] = ["usdc_only"];

/** Withdrawal states the Safety Buffer lane accepts (instant only — reused from 16C). */
export const BUFFER_ALLOWED_WITHDRAWAL_STATUSES: readonly YieldWithdrawalStatus[] = ["instant_currently_available"];
/** Withdrawal states the Excess lane accepts (anything with a known, available path). */
export const EXCESS_ALLOWED_WITHDRAWAL_STATUSES: readonly YieldWithdrawalStatus[] = [
  "instant_currently_available",
  "partial_currently_available",
  "withdrawal_required",
  "queue_possible",
];

/** Per-lane rule bundle. */
export interface YieldStrategyLaneRule {
  lane: YieldStrategyEligibilityLane;
  marketFreshnessMaxAgeMs: number;
  tvlMinUsd: number;
  minRiskScore: number;
  maxWithdrawalHours: number;
  allowedExposures: YieldStrategyResultingExposure[];
  allowedWithdrawalStatuses: YieldWithdrawalStatus[];
  requiredCustodyModel: "non_custodial";
  requiredRiskTier?: "conservative";
  requireInstantLiquidity: boolean;
  requireExplicitAvailableLiquidity: boolean;
  minAvailableLiquidityUsd?: number;
  requireBufferUseReviewed: boolean;
  requireExcessUseReviewed: boolean;
  requireUserRiskCompatibility: boolean;
  leveragePermitted: boolean;
}

const BUFFER_RULE: YieldStrategyLaneRule = {
  lane: "buffer",
  marketFreshnessMaxAgeMs: YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS,
  tvlMinUsd: MIN_PROTOCOL_TVL_USD,
  minRiskScore: MIN_PROTOCOL_RISK_SCORE,
  maxWithdrawalHours: MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER,
  allowedExposures: [...BUFFER_ALLOWED_EXPOSURES],
  allowedWithdrawalStatuses: [...BUFFER_ALLOWED_WITHDRAWAL_STATUSES],
  requiredCustodyModel: REQUIRED_CUSTODY_MODEL,
  requiredRiskTier: "conservative",
  requireInstantLiquidity: true,
  requireExplicitAvailableLiquidity: true,
  minAvailableLiquidityUsd: MIN_LIQUIDITY_USD,
  requireBufferUseReviewed: true,
  requireExcessUseReviewed: false,
  // The strict buffer policy is intrinsic; it never depends on (or is relaxed by) the user's risk level.
  requireUserRiskCompatibility: false,
  leveragePermitted: false,
};

const EXCESS_RULE: YieldStrategyLaneRule = {
  lane: "excess",
  marketFreshnessMaxAgeMs: YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS,
  tvlMinUsd: MIN_PROTOCOL_TVL_USD,
  minRiskScore: MIN_PROTOCOL_RISK_SCORE,
  maxWithdrawalHours: MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD,
  allowedExposures: [...EXCESS_ALLOWED_EXPOSURES],
  allowedWithdrawalStatuses: [...EXCESS_ALLOWED_WITHDRAWAL_STATUSES],
  requiredCustodyModel: REQUIRED_CUSTODY_MODEL,
  requireInstantLiquidity: false,
  requireExplicitAvailableLiquidity: false,
  requireBufferUseReviewed: false,
  requireExcessUseReviewed: true,
  requireUserRiskCompatibility: true,
  leveragePermitted: LEVERAGE_PERMITTED,
};

export function getYieldStrategyLaneRule(lane: YieldStrategyEligibilityLane): YieldStrategyLaneRule {
  return JSON.parse(JSON.stringify(lane === "buffer" ? BUFFER_RULE : EXCESS_RULE));
}

export interface YieldStrategyEligibilityPolicy {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";
  buffer: YieldStrategyLaneRule;
  excess: YieldStrategyLaneRule;
  reviewFreshnessPolicyResolved: boolean;
  notes: string[];
}

export function getYieldStrategyEligibilityPolicy(): YieldStrategyEligibilityPolicy {
  return {
    schemaVersion: YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_ELIGIBILITY_POLICY_ID,
    policyVersion: YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION,
    buffer: getYieldStrategyLaneRule("buffer"),
    excess: getYieldStrategyLaneRule("excess"),
    reviewFreshnessPolicyResolved: PRODUCT_REVIEW_FRESHNESS_POLICY_RESOLVED,
    notes: [
      "Thresholds are reused from engineThresholds.ts (12E) + yieldStrategyMarketDataPolicy.ts (16C); none re-invented.",
      "No APY minimum — a low APY may stay eligible and lose later in comparison (16E).",
      "No canonical product-review freshness max-age is documented; expiry relies on the review's validUntil.",
    ],
  };
}

export interface YieldStrategyEligibilityPolicyValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the policy is internally consistent + wired to the canonical thresholds. Fails closed. */
export function validateYieldStrategyEligibilityPolicy(policy: YieldStrategyEligibilityPolicy = getYieldStrategyEligibilityPolicy()): YieldStrategyEligibilityPolicyValidation {
  const errors: string[] = [];
  if (policy.schemaVersion !== YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (policy.policyId !== YIELD_STRATEGY_ELIGIBILITY_POLICY_ID) errors.push("wrong_policy_id");
  // Buffer must be strictly the tighter lane.
  if (policy.buffer.marketFreshnessMaxAgeMs >= policy.excess.marketFreshnessMaxAgeMs) errors.push("buffer_freshness_not_stricter");
  if (policy.buffer.maxWithdrawalHours > policy.excess.maxWithdrawalHours) errors.push("buffer_withdrawal_not_stricter");
  if (!(policy.buffer.allowedExposures.length === 1 && policy.buffer.allowedExposures[0] === "usdc_only")) errors.push("buffer_exposure_not_usdc_only");
  if (policy.buffer.requiredRiskTier !== "conservative") errors.push("buffer_tier_not_conservative");
  if (policy.buffer.leveragePermitted !== false || policy.excess.leveragePermitted !== false) errors.push("leverage_permitted");
  if (policy.buffer.requiredCustodyModel !== "non_custodial" || policy.excess.requiredCustodyModel !== "non_custodial") errors.push("custody_not_non_custodial");
  // Thresholds must equal their canonical documented sources.
  if (policy.buffer.tvlMinUsd !== MIN_PROTOCOL_TVL_USD || policy.excess.tvlMinUsd !== MIN_PROTOCOL_TVL_USD) errors.push("tvl_min_not_canonical");
  if (policy.buffer.minRiskScore !== MIN_PROTOCOL_RISK_SCORE) errors.push("risk_score_min_not_canonical");
  if (policy.buffer.maxWithdrawalHours !== MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER) errors.push("buffer_withdrawal_not_canonical");
  if (policy.excess.maxWithdrawalHours !== MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD) errors.push("excess_withdrawal_not_canonical");
  return { valid: errors.length === 0, errors };
}
