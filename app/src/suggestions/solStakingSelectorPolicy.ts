/**
 * solStakingSelectorPolicy — Step 14W. The versioned, explicit policy for the deterministic
 * read-only SOL staking selector COMPARISON. It fixes the weights, the minimum meaningful
 * cohort ranges, the score precision, and the tie epsilon — and validates them.
 *
 * POLICY: "balanced_safety_first_v1". WealthSmith should not chase small yield differences by
 * accepting materially weaker REVIEWED protocol risk, so the reviewed risk score dominates
 * (50%); the durable 30-day APY signal (30%) outweighs the faster current APY (10%); and a
 * transparent APY-consistency signal (10%) rounds it out. Adoption, fees, exit mechanics, and
 * token model are DELIBERATELY excluded from the cross-type score (their units/meanings are not
 * genuinely comparable across LST and native candidates) — they remain descriptive context with
 * zero weight.
 */
import type { SolStakingSelectorDimensionKey } from "./solStakingSelectorTypes";

export const SOL_STAKING_SELECTOR_POLICY_VERSION = "1.0.0";
export const SOL_STAKING_SELECTOR_POLICY_ID = "balanced_safety_first_v1";

/** Minimum cohort ranges keep a narrow cohort from being stretched to a full 0–10 spread. */
export const SOL_STAKING_SELECTOR_MIN_APY_RANGE_PCT_POINTS = 0.25;
export const SOL_STAKING_SELECTOR_MIN_STABILITY_RANGE_PCT_POINTS = 0.1;
export const SOL_STAKING_SELECTOR_SCORE_PRECISION = 6;
export const SOL_STAKING_SELECTOR_TIE_EPSILON = 0.000001;

/** The exact, explicit weights. They total 1.00. */
export const SOL_STAKING_SELECTOR_WEIGHTS: Record<SolStakingSelectorDimensionKey, number> = {
  reviewed_risk_score: 0.5,
  apy_30d: 0.3,
  current_apy: 0.1,
  apy_stability: 0.1,
};

/** Dimensions that are DELIBERATELY excluded from the cross-type v1 score (kept as context). */
export const SOL_STAKING_SELECTOR_EXCLUDED_FROM_SCORE: readonly string[] = [
  "tvl_usd",
  "delegated_stake_sol",
  "annual_management_fee",
  "validator_commission",
  "direct_unstake_fee",
  "immediate_liquidity",
  "epoch_exit_timing",
  "token_model",
];

export interface SolStakingSelectorPolicy {
  policyId: string;
  policyVersion: string;
  weights: Record<SolStakingSelectorDimensionKey, number>;
  minApyRangePctPoints: number;
  minStabilityRangePctPoints: number;
  scorePrecision: number;
  tieEpsilon: number;
}

export const SOL_STAKING_SELECTOR_POLICY: SolStakingSelectorPolicy = {
  policyId: SOL_STAKING_SELECTOR_POLICY_ID,
  policyVersion: SOL_STAKING_SELECTOR_POLICY_VERSION,
  weights: SOL_STAKING_SELECTOR_WEIGHTS,
  minApyRangePctPoints: SOL_STAKING_SELECTOR_MIN_APY_RANGE_PCT_POINTS,
  minStabilityRangePctPoints: SOL_STAKING_SELECTOR_MIN_STABILITY_RANGE_PCT_POINTS,
  scorePrecision: SOL_STAKING_SELECTOR_SCORE_PRECISION,
  tieEpsilon: SOL_STAKING_SELECTOR_TIE_EPSILON,
};

const SUPPORTED_DIMENSIONS: SolStakingSelectorDimensionKey[] = ["reviewed_risk_score", "apy_30d", "current_apy", "apy_stability"];

export interface SelectorPolicyValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a selector policy. Fails closed on missing dimensions, negative / non-finite
 * weights, weights not totaling 1.00, unsupported metrics, non-positive normalization ranges,
 * invalid precision, or an invalid tie epsilon.
 */
export function validateSolStakingSelectorPolicy(policy: unknown): SelectorPolicyValidationResult {
  const errors: string[] = [];
  if (!policy || typeof policy !== "object") return { valid: false, errors: ["policy_not_an_object"] };
  const p = policy as SolStakingSelectorPolicy;

  const weights = p.weights;
  if (!weights || typeof weights !== "object") {
    errors.push("missing_weights");
  } else {
    // Every supported dimension must be present.
    for (const d of SUPPORTED_DIMENSIONS) {
      if (!(d in weights)) errors.push(`missing_dimension:${d}`);
    }
    // No unsupported metric may carry weight.
    for (const key of Object.keys(weights)) {
      if (!SUPPORTED_DIMENSIONS.includes(key as SolStakingSelectorDimensionKey)) errors.push(`unsupported_dimension:${key}`);
    }
    let sum = 0;
    for (const d of SUPPORTED_DIMENSIONS) {
      const w = weights[d];
      if (typeof w !== "number" || !Number.isFinite(w)) errors.push(`non_finite_weight:${d}`);
      else if (w < 0) errors.push(`negative_weight:${d}`);
      else sum += w;
    }
    if (errors.every((e) => !e.startsWith("non_finite_weight") && !e.startsWith("negative_weight") && !e.startsWith("missing_dimension")) && Math.abs(sum - 1) > 1e-9) {
      errors.push(`weights_do_not_total_one:${sum}`);
    }
  }

  if (!(typeof p.minApyRangePctPoints === "number" && p.minApyRangePctPoints > 0)) errors.push("invalid_min_apy_range");
  if (!(typeof p.minStabilityRangePctPoints === "number" && p.minStabilityRangePctPoints > 0)) errors.push("invalid_min_stability_range");
  if (!(Number.isInteger(p.scorePrecision) && p.scorePrecision >= 0 && p.scorePrecision <= 12)) errors.push("invalid_precision");
  if (!(typeof p.tieEpsilon === "number" && p.tieEpsilon > 0 && p.tieEpsilon < 1)) errors.push("invalid_tie_epsilon");

  return { valid: errors.length === 0, errors };
}
