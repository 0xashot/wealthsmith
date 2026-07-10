/**
 * rebalanceSuggestion — the deterministic bucket-level "Rebalance" rule
 * (rules/suggestion-engine-rules.md — APPROVED MVP scope; top-pick-rules.md —
 * Rebalance trigger ±10% and category weight 0.9).
 *
 * Pure function over SuggestionEngineInputs: no fetching, no pricing, no AI.
 * MVP Rebalance is BUCKET-LEVEL (Crypto ↔ Stables) by approved product
 * decision — it never selects sell/buy tokens and never invents token-level
 * targets. The allocation delta it reads comes from the approved risk-based
 * recommended allocation (recommendedAllocation.ts), already derived upstream.
 *
 * SAFETY BUFFER COMES FIRST (Buffer Override): no Rebalance exists until the
 * Safety Buffer is fully funded, and an underweight-crypto rebalance may only
 * use stablecoins ABOVE the buffer target — it never dips into the buffer.
 *
 * "Actionable" output is REVIEW-ONLY. Nothing here executes a transaction,
 * requests a signature, or moves funds.
 */
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_SUGGESTION_AMOUNT_USD,
  REBALANCE_DELTA_THRESHOLD_PCT,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";

/** Stable suggestion ID (IDs must not change across runs/copy updates). */
export const REBALANCE_SUGGESTION_ID = "rebalance_to_plan";

/**
 * Trigger: buffer fully funded ∧ allocation + recommended target + delta all
 * derived ∧ priced total > 0 ∧ |crypto delta| ≥ the ±10% threshold. Any
 * missing input → null (nothing invented). Underweight crypto with no excess
 * stables above the buffer target → null (the buffer is never reduced).
 * An in-threshold amount under the $50 minimum → DISABLED suggestion with a
 * failed min_trade_size guardrail.
 */
export function deriveRebalanceSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  const alloc = inputs.allocation;
  const totalUsd = inputs.value.totalUsd;

  // Buffer Override: no rebalance until the Safety Buffer is fully funded.
  if (!sb || !sb.fullyFunded) return null;

  if (!inputs.dataQuality.hasPricing) return null;
  if (totalUsd == null || totalUsd <= 0) return null;
  if (
    !alloc ||
    alloc.currentCryptoPct == null ||
    alloc.recommendedCryptoPct == null ||
    alloc.cryptoDeltaPct == null
  ) {
    return null;
  }

  const delta = alloc.cryptoDeltaPct; // current − target; positive = overweight
  if (Math.abs(delta) < REBALANCE_DELTA_THRESHOLD_PCT) return null;

  const overweight = delta > 0;

  // Amount: the USD size of the bucket deviation. An underweight-crypto move
  // is CAPPED at the stables held ABOVE the buffer target (never the buffer).
  const deviationUsd = (totalUsd * Math.abs(delta)) / 100;
  let amountUsd = deviationUsd;
  if (!overweight) {
    const availableStableExcessUsd = Math.max(0, sb.stableUsd - sb.targetUsd);
    if (availableStableExcessUsd <= 0) return null;
    amountUsd = Math.min(deviationUsd, availableStableExcessUsd);
  }

  const belowMin = amountUsd < MIN_SUGGESTION_AMOUNT_USD;

  // Rebalance impact (top-pick-rules.md): deviation share, category weight 0.9.
  const ratio = Math.min(Math.abs(delta) / 100, 1);

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    // Fully funded buffer required + underweight amounts capped above it.
    { code: "buffer_protection", status: "passed" },
    { code: "allocation_delta", status: "passed" },
    {
      code: "min_trade_size",
      status: belowMin ? "failed" : "passed",
      message: belowMin
        ? `Amount is below the $${MIN_SUGGESTION_AMOUNT_USD} minimum suggestion size.`
        : undefined,
    },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  return {
    id: REBALANCE_SUGGESTION_ID,
    category: "rebalance",
    reason_codes: [
      overweight ? "crypto_overweight" : "crypto_underweight",
      ...(belowMin ? (["below_min_size"] as const) : []),
    ],

    title_key: "suggestion.rebalance.title",
    description_key: overweight
      ? "suggestion.rebalance.crypto_overweight.description"
      : "suggestion.rebalance.crypto_underweight.description",

    action_kind: belowMin ? "disabled" : "review_only",
    is_actionable: !belowMin,
    // Top Pick is assigned only by Top Pick Logic (a later step).
    is_top_pick: false,

    amount: {
      valueUsd: amountUsd,
      label: "Suggested rebalance amount",
    },
    // Bucket-level only (approved MVP decision) — no token selection.
    from: { bucket: overweight ? "crypto" : "stables" },
    to: { bucket: overweight ? "stables" : "crypto" },

    delta_percent: delta,

    // Bucket-level rebalance — no protocol involved (token/cost/liquidity/
    // slippage stay not_evaluated via their guardrails).
    protocolSelection: notApplicableProtocolSelection("selection_not_required"),

    scores: {
      impact: ratio * 0.9,
      urgency: ratio,
      efficiency: null,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
