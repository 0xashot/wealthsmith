/**
 * yieldStrategyComparisonPolicy — Step 16E. The versioned, deterministic comparison POLICY: the 0–100
 * score scale + precision, the 1.00-point material-tie threshold, the lane-specific dimension weights,
 * the withdrawal-status / source-quality mappings, and the score helpers. It reuses the canonical
 * documented thresholds from `engineThresholds.ts` (12E) and the 16C freshness bounds — it re-invents
 * no numbers. POLICY ONLY: no wallet, no capital, no amount, no plan, no suggestion, no execution.
 *
 * Canonical priority (documented): Safety > Yield > Cost > Convenience. APY must never dominate the
 * Safety Buffer comparison.
 */
import {
  MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD,
  MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER,
} from "./engineThresholds";
import {
  YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS,
  YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS,
} from "./yieldStrategyMarketDataPolicy";
import {
  YIELD_STRATEGY_COMPARISON_DIMENSIONS,
  YIELD_STRATEGY_COMPARISON_POLICY_ID,
  YIELD_STRATEGY_COMPARISON_POLICY_VERSION,
  YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION,
  type YieldStrategyComparisonDimensionKey,
  type YieldStrategyComparisonLane,
} from "./yieldStrategyComparisonTypes";
import type { YieldMarketProvenanceKind, YieldWithdrawalStatus } from "./yieldStrategyMarketDataTypes";

export const YIELD_STRATEGY_COMPARISON_POLICY_EXISTS = true;

/** 0–100 additive weighted score. Precision reuses the SOL selector's 6-dp rounding behavior. */
export const YIELD_STRATEGY_COMPARISON_SCORE_SCALE_MAX = 100;
export const YIELD_STRATEGY_COMPARISON_SCORE_PRECISION = 6;

/**
 * Material-tie threshold: a top-two total-score gap of <= 1.00 point (out of 100) is a MATERIAL tie and
 * the leader is withheld. This is intentionally larger than the SOL selector's numeric epsilon: a
 * sub-1-point gap (≈1%) is not a defensible basis to name a leader over principal safety.
 */
export const YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD = 1.0;

/** Sensitivity perturbation: ±10% relative on each single dimension weight (others rebalanced to 100). */
export const YIELD_STRATEGY_COMPARISON_SENSITIVITY_PERTURBATION_PCT = 0.1;

/* ------------------------------------------------------------------ *
 * Lane weights (v1). No documented canonical Stable Yield weights pre-exist, so these are the versioned
 * source of truth. Each set totals exactly 100.
 * ------------------------------------------------------------------ */
export const YIELD_STRATEGY_BUFFER_WEIGHTS: Record<YieldStrategyComparisonDimensionKey, number> = {
  risk_quality: 35,
  withdrawal_liquidity: 30,
  net_yield: 15,
  market_depth: 10,
  user_cost: 5,
  data_quality: 5,
};
export const YIELD_STRATEGY_EXCESS_WEIGHTS: Record<YieldStrategyComparisonDimensionKey, number> = {
  risk_quality: 25,
  withdrawal_liquidity: 20,
  net_yield: 25,
  market_depth: 15,
  user_cost: 10,
  data_quality: 5,
};

export function getYieldStrategyLaneWeights(lane: YieldStrategyComparisonLane): Record<YieldStrategyComparisonDimensionKey, number> {
  return { ...(lane === "buffer" ? YIELD_STRATEGY_BUFFER_WEIGHTS : YIELD_STRATEGY_EXCESS_WEIGHTS) };
}

/** Withdrawal-status sub-score (unknown is invalid — never scored). */
export const YIELD_WITHDRAWAL_STATUS_SCORES: Record<Exclude<YieldWithdrawalStatus, "unknown">, number> = {
  instant_currently_available: 100,
  partial_currently_available: 75,
  withdrawal_required: 50,
  queue_possible: 25,
  unavailable: 0,
};

/** withdrawal_liquidity sub-component weights (sum 1). */
export const YIELD_WITHDRAWAL_SUBWEIGHTS = { status: 0.4, delay: 0.3, liquidity: 0.3 } as const;

/** data_quality sub-component weights (sum 1). */
export const YIELD_DATA_QUALITY_SUBWEIGHTS = { provenance: 0.6, freshness: 0.4 } as const;

/**
 * Source-quality mapping — reuses the 16C `YieldMarketProvenanceKind` vocabulary (no second enum).
 * documented_source (protocol API/SDK or official endpoint) is the primary/highest tier;
 * backend_normalized is an approved-provider aggregation; same_origin_runtime_payload is a fallback;
 * `none` is invalid (unscoreable). Browser-fetched data is invalid regardless of kind.
 */
export const YIELD_SOURCE_QUALITY_SCORES: Record<Exclude<YieldMarketProvenanceKind, "none">, number> = {
  documented_source: 100,
  backend_normalized: 70,
  same_origin_runtime_payload: 50,
};

/** The lane market-freshness bound reused for the data-quality freshness sub-score. */
export function laneFreshnessMaxAgeMs(lane: YieldStrategyComparisonLane): number {
  return lane === "buffer" ? YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS : YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS;
}
/** The lane withdrawal-delay ceiling reused for the delay sub-score (12E canonical). */
export function laneMaxWithdrawalHours(lane: YieldStrategyComparisonLane): number {
  return lane === "buffer" ? MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER : MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD;
}

export { MIN_LIQUIDITY_USD, MIN_PROTOCOL_TVL_USD } from "./engineThresholds";

/* ------------------------------------------------------------------ *
 * Deterministic score helpers (mirror the SOL selector's roundTo/clamp behavior).
 * ------------------------------------------------------------------ */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
export function roundScore(n: number, precision: number = YIELD_STRATEGY_COMPARISON_SCORE_PRECISION): number {
  const f = Math.pow(10, precision);
  return Math.round(n * f) / f;
}
/** Deterministic min-max normalization to 0–100. Equal values (or a single value) → neutral 50. */
export function minMaxNormalize(value: number, min: number, max: number): number {
  if (!(max > min)) return 50;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

export interface YieldStrategyComparisonPolicy {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";
  scoreScaleMax: number;
  scorePrecision: number;
  materialTieThreshold: number;
  sensitivityPerturbationPct: number;
  bufferWeights: Record<YieldStrategyComparisonDimensionKey, number>;
  excessWeights: Record<YieldStrategyComparisonDimensionKey, number>;
  priority: string[];
  notes: string[];
}

export function getYieldStrategyComparisonPolicy(): YieldStrategyComparisonPolicy {
  return {
    schemaVersion: YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_COMPARISON_POLICY_ID,
    policyVersion: YIELD_STRATEGY_COMPARISON_POLICY_VERSION,
    scoreScaleMax: YIELD_STRATEGY_COMPARISON_SCORE_SCALE_MAX,
    scorePrecision: YIELD_STRATEGY_COMPARISON_SCORE_PRECISION,
    materialTieThreshold: YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD,
    sensitivityPerturbationPct: YIELD_STRATEGY_COMPARISON_SENSITIVITY_PERTURBATION_PCT,
    bufferWeights: getYieldStrategyLaneWeights("buffer"),
    excessWeights: getYieldStrategyLaneWeights("excess"),
    priority: ["safety", "yield", "cost", "convenience"],
    notes: [
      "Weights reuse no pre-existing canonical Stable Yield set; they are the versioned v1 source of truth (each totals 100).",
      "Thresholds (TVL/liquidity/withdrawal-hours) reuse engineThresholds.ts (12E); freshness reuses 16C.",
      "Material-tie 1.00 point + strict ±10% weight sensitivity differ from the SOL selector on purpose (principal safety).",
    ],
  };
}

export interface YieldStrategyComparisonPolicyValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the comparison policy: weights present exactly once, finite, non-negative, total exactly 100. */
export function validateYieldStrategyComparisonPolicy(policy: YieldStrategyComparisonPolicy = getYieldStrategyComparisonPolicy()): YieldStrategyComparisonPolicyValidation {
  const errors: string[] = [];
  if (policy.schemaVersion !== YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (policy.policyId !== YIELD_STRATEGY_COMPARISON_POLICY_ID) errors.push("wrong_policy_id");
  if (policy.scoreScaleMax !== 100) errors.push("wrong_score_scale");
  if (!(Number.isInteger(policy.scorePrecision) && policy.scorePrecision >= 0 && policy.scorePrecision <= 12)) errors.push("invalid_precision");
  if (!(policy.materialTieThreshold > 0)) errors.push("invalid_tie_threshold");
  if (!(policy.sensitivityPerturbationPct > 0 && policy.sensitivityPerturbationPct < 1)) errors.push("invalid_perturbation");
  for (const [laneName, weights] of [["buffer", policy.bufferWeights], ["excess", policy.excessWeights]] as const) {
    const keys = Object.keys(weights);
    for (const d of YIELD_STRATEGY_COMPARISON_DIMENSIONS) if (!(d in weights)) errors.push(`${laneName}_missing_${d}`);
    for (const k of keys) if (!(YIELD_STRATEGY_COMPARISON_DIMENSIONS as readonly string[]).includes(k)) errors.push(`${laneName}_unknown_${k}`);
    let total = 0;
    for (const d of YIELD_STRATEGY_COMPARISON_DIMENSIONS) {
      const w = weights[d];
      if (!(typeof w === "number" && Number.isFinite(w) && w >= 0)) errors.push(`${laneName}_invalid_weight_${d}`);
      else total += w;
    }
    if (Math.round(total * 1e6) / 1e6 !== 100) errors.push(`${laneName}_weights_not_100`);
  }
  return { valid: errors.length === 0, errors };
}
