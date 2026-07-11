/**
 * engineThresholds — APPROVED MVP constants for the deterministic Suggestion
 * Engine. Thresholds are owned by product logic (this module), never hardcoded
 * in UI components and never adjusted dynamically
 * (checklists/suggestion-top-pick-checklist.md §9.2, top-pick-rules.md).
 */
import type { GuardrailStatus } from "./engineTypes";

/** Stamped on every engine output for stale detection and explainability. */
export const SUGGESTION_ENGINE_VERSION = "suggestion-engine-mvp-v1";

/*
 * Safety Buffer target months are RISK-BASED and supplied by the existing
 * approved Safety Buffer logic. The Suggestion Engine consumes the derived
 * target (targetMonths / targetUsd / shortfallUsd on
 * SuggestionEngineInputs.safetyBuffer); it does not define the target.
 * No fixed buffer-month constant is exported here, deliberately.
 */

/**
 * Minimum actionable suggestion size (top-pick-rules.md guardrails —
 * "Minimum trade size >= $50"). Conditions below this size may still be
 * reported, but as disabled with reason `below_min_size`.
 */
export const MIN_SUGGESTION_AMOUNT_USD = 50;

/**
 * Rebalance trigger (top-pick-rules.md — "Allocation delta >= +/-10%"):
 * a bucket's |current − target| in percentage points must reach this before a
 * Rebalance suggestion exists.
 */
export const REBALANCE_DELTA_THRESHOLD_PCT = 10;

/**
 * Staking (idle SOL) — always leave a small SOL reserve for network fees; never
 * suggest staking the full balance. `eligibleSol = max(liquidSol − reserve, 0)`.
 */
export const SOL_FEE_RESERVE = 0.1;

/** Minimum eligible SOL value before an idle-SOL staking suggestion appears. */
export const MIN_STAKING_SUGGESTION_USD = 50;

/**
 * Minimum eligible stablecoin value (above the Safety Buffer AND the target
 * stable allocation) before an excess-stablecoin yield suggestion appears.
 */
export const MIN_STABLE_YIELD_SUGGESTION_USD = 100;

/* DCA (contribution-funded gradual entry toward the crypto target). */
/** Minimum DCA amount, contribution, and target-gap before a DCA review appears. */
export const MIN_DCA_SUGGESTION_USD = 50;
/** Minimum crypto underweight (as a fraction, 0.02 = 2 percentage points). */
export const DCA_MIN_CRYPTO_UNDERWEIGHT_PCT = 0.02;

/* Trim (review of non-core long-tail liquid wallet tokens). */
/** Aggregate/flagged trim value below this is too small to flag. */
export const MIN_TRIM_SUGGESTION_USD = 100;
/** Aggregate non-core exposure below this share of the portfolio is not flagged. */
export const TRIM_PORTFOLIO_SHARE_THRESHOLD = 0.05;
/** A single non-core token at/above this share of the portfolio warrants review. */
export const TRIM_SINGLE_TOKEN_CONCENTRATION_THRESHOLD = 0.1;
/** This many small non-core tokens can trigger a cleanup review. */
export const TRIM_SMALL_POSITION_COUNT_THRESHOLD = 3;
/** A non-core token at/below this value counts as a "small" position. */
export const TRIM_SMALL_POSITION_MAX_USD = 50;

/* Capital efficiency (idle liquid wallet crypto not covered by other rules). */
/** Aggregate idle-asset value below this is too small to flag. */
export const MIN_CAPITAL_EFFICIENCY_SUGGESTION_USD = 100;
/** Idle assets below this share of the priced portfolio are not flagged. */
export const CAPITAL_EFFICIENCY_PORTFOLIO_SHARE_THRESHOLD = 0.02;

/* Position optimization (review of existing staked/yield/protocol positions). */
/** A deployed position below this value is too small to flag for review. */
export const MIN_POSITION_REVIEW_USD = 100;
/** Sourced APY below this percent (e.g. < 1%) is low enough to review. */
export const MIN_REVIEW_APY = 1;
/** Concentration review only matters for positions at/above this value. */
export const MIN_CONCENTRATION_REVIEW_USD = 1000;
/** A single position at/above this share of the priced portfolio is reviewed. */
export const POSITION_CONCENTRATION_THRESHOLD = 0.5;

/*
 * Protocol ELIGIBILITY gates (Step 12E) — deterministic thresholds that decide
 * whether a candidate protocol is "eligible to evaluate", NOT which to pick and
 * NOT a score. Missing data never passes (→ insufficient_data). Used only by the
 * pure eligibility helpers; the Suggestion Engine never consumes these.
 */
export const MIN_PROTOCOL_TVL_USD = 1_000_000;
export const MIN_PROTOCOL_RISK_SCORE = 7;
export const MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER = 24;
export const MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD = 168;
export const MIN_LIQUIDITY_USD = 100_000;
export const MAX_PRICE_IMPACT_PCT = 0.5;

/* Duplicate exposure (multiple deployed positions sharing an underlying group). */
/** A deployed position below this value is ignored as dust when grouping. */
export const MIN_DUPLICATE_EXPOSURE_POSITION_USD = 50;
/** A duplicate group's combined value below this is too small to flag. */
export const MIN_DUPLICATE_EXPOSURE_GROUP_USD = 250;
/** A duplicate group below this share of the priced portfolio is not flagged. */
export const DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD = 0.05;

/**
 * Honest status for guardrails whose inputs do not exist in the app yet.
 * Cost, liquidity, and slippage require quote/route infrastructure that this
 * prototype does not have — so the engine reports those guardrails as
 * `not_evaluated`. They are NEVER invented and never silently marked passed
 * (approved MVP decision; see rules/top-pick-rules.md — Guardrails).
 */
export const GUARDRAIL_STATUS_NOT_EVALUATED: GuardrailStatus = "not_evaluated";

/*
 * Documented product thresholds NOT used by the MVP suggestion set (Buffer /
 * Rebalance / On Track) and therefore intentionally not exported yet:
 *   - Idle capital trigger  >= $250   (capital-efficiency suggestions, future)
 *   - Underweight core asset >= 5%    (DCA suggestions, future)
 *   - Slippage rejection     > 0.5%   (needs quote data; see above)
 * Add them here (with product approval) when those suggestion types ship.
 */
