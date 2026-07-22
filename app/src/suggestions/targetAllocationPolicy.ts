/**
 * targetAllocationPolicy — Step 22B. The canonical, versioned, NON-MOUNTED product-policy CONSTANTS and
 * STRUCTURAL VALIDATORS for the future five-factor Target Allocation calculation (rules/target-allocation.md).
 *
 * THIS MODULE IS NOT MOUNTED. It contains no target calculator and is imported by NOTHING in the engine
 * (engine.ts / rebalanceAssessment / dcaSuggestion / onTrackAssessment / recommendedAllocation). The mounted
 * target remains RISK-ONLY (`wallet/recommendedAllocation.ts`) until a later step (22C) mounts a multifactor
 * assessment AFTER this policy is explicitly approved. Adding a second production target calculator here is
 * out of scope by design — this file only pins the approved matrices/weights/bands and validates that
 * they are internally consistent (weights sum to 1, every enum is covered, every value is a 0–100 stable %,
 * bands tile their domain with no gaps/overlap, the degraded renormalization denominator is exactly 0.90).
 *
 * CONVENTION (single, enforced): every factor outputs `stableTargetPct ∈ [0, 100]`; higher = more stable.
 * `volatileTargetPct = 100 − stableTargetPct`. No crypto/stable, risk-score, or suitability-score mixing.
 *
 * STATUS: approved (product owner, 2026-07-22) — all 11 checklist items in rules/target-allocation.md §20 are
 * approved. Approval LOCKS these values and authorizes Step 22C to mount them; it does NOT itself mount anything.
 * Nothing consumes them for a user-facing target yet — the mounted target stays risk-only until 22C.
 */
import { FINANCIAL_GOAL_OPTIONS, RISK_OPTIONS, TIMELINE_OPTIONS } from "../state/goalState";

export const TARGET_ALLOCATION_POLICY_ID = "target_allocation_policy_v1";
export const TARGET_ALLOCATION_POLICY_VERSION = "1.0.0";
export const TARGET_ALLOCATION_POLICY_STATUS: "draft" | "approved" | "deprecated" = "approved";
export const TARGET_ALLOCATION_METHODOLOGY_VERSION = "target_allocation_methodology_1.0.0";

/** Exact documented factor weights. Sum MUST equal 1.00 (validated below). */
export const TARGET_ALLOCATION_FACTOR_WEIGHTS = {
  risk: 0.35,
  horizon: 0.20,
  goal: 0.20,
  netCashFlow: 0.15,
  market: 0.10,
} as const;

/** Mounted Risk matrix, documented in STABLE-target terms (mirrors RISK_TARGET_ALLOCATION.stablePct — unchanged). */
export const RISK_STABLE_TARGET_PCT: Record<string, number> = {
  very_low: 80,
  low: 60,
  medium: 40,
  high: 20,
  very_high: 10,
};

/**
 * Time Horizon matrix (PROPOSAL). Monotonic: shorter horizon → higher stable target. `not_sure_yet` is an
 * explicit conservative-neutral value (never silently treated as a specific duration). No age/interpolation.
 */
export const HORIZON_STABLE_TARGET_PCT: Record<string, number> = {
  "6_months": 90,
  "1_year": 80,
  "2_years": 65,
  "5_years": 40,
  "10_plus_years": 20,
  not_sure_yet: 55,
};

/**
 * Financial Goal matrix (PROPOSAL). Reflects the goal's inherent tolerance for allocation volatility only —
 * NOT age, NOT horizon (separately weighted), NOT the risk factor. `not_sure_yet` is an explicit neutral value.
 */
export const GOAL_STABLE_TARGET_PCT: Record<string, number> = {
  retire_early: 35, // accumulation goal, high growth tolerance
  build_long_term_wealth: 40, // balanced growth
  generate_passive_income: 60, // income/yield orientation → moderately stable
  save_for_big_purchase: 75, // near-term security → high stable
  not_sure_yet: 50, // explicit neutral
};

export interface CashFlowBand {
  id: string;
  label: string;
  /** Inclusive upper bound of the savings-rate band (fraction). `null` = +∞ (open top band). */
  upperInclusive: number | null;
  stableTargetPct: number;
}

/**
 * Net Cash Flow matrix (PROPOSAL), keyed on SavingsRate = (income − expenses) / income (a fraction, NOT dollars,
 * NOT the contribution amount). Bands are ordered ascending; select the FIRST band whose upperInclusive ≥ s.
 * Domain is all finite reals: s ≤ 0 → 80; 0 < s ≤ 0.10 → 65; 0.10 < s ≤ 0.20 → 50; 0.20 < s ≤ 0.35 → 35; s > 0.35 → 20.
 * Higher savings rate → more capacity for volatility → lower stable target. Negative and >100% rates are valid.
 */
export const CASH_FLOW_STABLE_BANDS: readonly CashFlowBand[] = [
  { id: "nonpositive", label: "Savings rate ≤ 0%", upperInclusive: 0, stableTargetPct: 80 },
  { id: "low", label: "0% – 10%", upperInclusive: 0.1, stableTargetPct: 65 },
  { id: "moderate", label: "10% – 20%", upperInclusive: 0.2, stableTargetPct: 50 },
  { id: "strong", label: "20% – 35%", upperInclusive: 0.35, stableTargetPct: 35 },
  { id: "high", label: "> 35%", upperInclusive: null, stableTargetPct: 20 },
];

export interface MarketBand {
  id: string;
  label: string;
  /** Inclusive score bounds [min, max] on the 0–100 index. */
  minInclusive: number;
  maxInclusive: number;
  stableTargetPct: number;
}

/**
 * Market Conditions matrix (documented, fixed). Contrarian, deterministic ALLOCATION input (NOT a trade signal):
 * higher greed → higher stable target; higher fear → lower stable target. Bands tile 0–100 inclusively.
 * CROSS-BAND SWING: the target difference between the Extreme Fear and Extreme Greed market states, with all other
 * factors held constant, is (80−20) × 0.10 = 6 percentage points — below the ±10pp Rebalance threshold, so the
 * market factor can never single-handedly force a Rebalance. (This is NOT the full-vs-degraded difference, which
 * depends on the profile-only target because the degraded calculation renormalizes the other 90%.)
 */
export const MARKET_STABLE_TARGET_BANDS: readonly MarketBand[] = [
  { id: "extreme_fear", label: "Extreme Fear", minInclusive: 0, maxInclusive: 24, stableTargetPct: 20 },
  { id: "fear", label: "Fear", minInclusive: 25, maxInclusive: 49, stableTargetPct: 35 },
  { id: "neutral", label: "Neutral", minInclusive: 50, maxInclusive: 59, stableTargetPct: 50 },
  { id: "greed", label: "Greed", minInclusive: 60, maxInclusive: 74, stableTargetPct: 65 },
  { id: "extreme_greed", label: "Extreme Greed", minInclusive: 75, maxInclusive: 100, stableTargetPct: 80 },
];

/** Target-confidence states the future TargetAllocationAssessment may report. */
export type TargetAllocationConfidence = "full" | "degraded_market_excluded" | "unavailable" | "blocked";

/* ------------------------------------------------------------------ *
 * Structural validators — pure, deterministic, NON-MOUNTED. No target is produced. Each returns error strings.
 * ------------------------------------------------------------------ */
const FLOAT_TOLERANCE = 1e-9;

export function validateWeightsSumToOne(): string[] {
  const w = TARGET_ALLOCATION_FACTOR_WEIGHTS;
  const sum = w.risk + w.horizon + w.goal + w.netCashFlow + w.market;
  return Math.abs(sum - 1) <= FLOAT_TOLERANCE ? [] : [`weights_sum_${sum}_not_1`];
}

/** The degraded (market-excluded) renormalization denominator must be exactly (1 − marketWeight) = 0.90. */
export function validateDegradedDenominator(): string[] {
  const denom = 1 - TARGET_ALLOCATION_FACTOR_WEIGHTS.market;
  return Math.abs(denom - 0.9) <= FLOAT_TOLERANCE ? [] : [`degraded_denominator_${denom}_not_0.9`];
}

function coverageErrors(name: string, options: ReadonlyArray<{ value: string }>, matrix: Record<string, number>): string[] {
  const errors: string[] = [];
  const slugs = new Set(options.map((o) => o.value));
  for (const slug of slugs) if (!(slug in matrix)) errors.push(`${name}_missing_slug_${slug}`);
  for (const key of Object.keys(matrix)) if (!slugs.has(key)) errors.push(`${name}_extra_slug_${key}`);
  return errors;
}

export function validateEnumCoverage(): string[] {
  return [
    ...coverageErrors("risk", RISK_OPTIONS, RISK_STABLE_TARGET_PCT),
    ...coverageErrors("horizon", TIMELINE_OPTIONS, HORIZON_STABLE_TARGET_PCT),
    ...coverageErrors("goal", FINANCIAL_GOAL_OPTIONS, GOAL_STABLE_TARGET_PCT),
  ];
}

function rangeErrors(name: string, values: number[]): string[] {
  return values
    .filter((v) => !(Number.isFinite(v) && v >= 0 && v <= 100))
    .map((v) => `${name}_stable_pct_${v}_out_of_range`);
}

export function validateStablePctRanges(): string[] {
  return [
    ...rangeErrors("risk", Object.values(RISK_STABLE_TARGET_PCT)),
    ...rangeErrors("horizon", Object.values(HORIZON_STABLE_TARGET_PCT)),
    ...rangeErrors("goal", Object.values(GOAL_STABLE_TARGET_PCT)),
    ...rangeErrors("cashflow", CASH_FLOW_STABLE_BANDS.map((b) => b.stableTargetPct)),
    ...rangeErrors("market", MARKET_STABLE_TARGET_BANDS.map((b) => b.stableTargetPct)),
  ];
}

/** Market bands must tile 0–100 with no gap/overlap and inclusive integer boundaries. */
export function validateMarketBandContinuity(): string[] {
  const errors: string[] = [];
  const bands = [...MARKET_STABLE_TARGET_BANDS].sort((a, b) => a.minInclusive - b.minInclusive);
  if (bands[0].minInclusive !== 0) errors.push(`market_lower_bound_${bands[0].minInclusive}_not_0`);
  if (bands[bands.length - 1].maxInclusive !== 100) errors.push(`market_upper_bound_${bands[bands.length - 1].maxInclusive}_not_100`);
  for (let i = 1; i < bands.length; i++) {
    if (bands[i].minInclusive !== bands[i - 1].maxInclusive + 1) {
      errors.push(`market_gap_or_overlap_between_${bands[i - 1].id}_and_${bands[i].id}`);
    }
  }
  return errors;
}

/** Cash-flow bands must tile all finite reals (ascending upperInclusive, last open) with no gap/overlap. */
export function validateCashFlowBandContinuity(): string[] {
  const errors: string[] = [];
  const bands = CASH_FLOW_STABLE_BANDS;
  for (let i = 0; i < bands.length - 1; i++) {
    const upper = bands[i].upperInclusive;
    const nextUpper = bands[i + 1].upperInclusive;
    if (upper == null) errors.push(`cashflow_open_band_not_last_${bands[i].id}`);
    else if (nextUpper != null && nextUpper <= upper) errors.push(`cashflow_non_ascending_${bands[i].id}_${bands[i + 1].id}`);
  }
  if (bands[bands.length - 1].upperInclusive != null) errors.push("cashflow_last_band_not_open");
  return errors;
}

export interface TargetAllocationPolicyValidation {
  ok: boolean;
  errors: string[];
  policyId: string;
  policyVersion: string;
  status: string;
}

/** Run every structural check. Pure; produces no target. Used by policy-validation fixtures only. */
export function validateTargetAllocationPolicy(): TargetAllocationPolicyValidation {
  const errors = [
    ...validateWeightsSumToOne(),
    ...validateDegradedDenominator(),
    ...validateEnumCoverage(),
    ...validateStablePctRanges(),
    ...validateMarketBandContinuity(),
    ...validateCashFlowBandContinuity(),
  ];
  return {
    ok: errors.length === 0,
    errors,
    policyId: TARGET_ALLOCATION_POLICY_ID,
    policyVersion: TARGET_ALLOCATION_POLICY_VERSION,
    status: TARGET_ALLOCATION_POLICY_STATUS,
  };
}
