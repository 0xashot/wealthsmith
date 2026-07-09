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
