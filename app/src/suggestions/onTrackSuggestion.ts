/**
 * onTrackSuggestion — the deterministic "On Track" informational state
 * (rules/suggestion-engine-rules.md — APPROVED MVP scope).
 *
 * Pure function over SuggestionEngineInputs: no fetching, no pricing, no AI.
 * On Track is INFORMATIONAL only — it explains a healthy condition (buffer
 * funded + allocation close to target) and is never actionable, never a Top
 * Pick, and carries no CTA, amount, or protocol handoff.
 *
 * It appears only when the two actionable rules do NOT trigger: the Safety
 * Buffer is fully funded (no buffer suggestion) and the crypto allocation is
 * within the ±10% rebalance threshold (no rebalance suggestion). The engine
 * enforces the ordering; this rule also re-checks the conditions so it is safe
 * to call in isolation.
 */
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  REBALANCE_DELTA_THRESHOLD_PCT,
} from "./engineThresholds";

/** Stable suggestion ID (IDs must not change across runs/copy updates). */
export const ON_TRACK_SUGGESTION_ID = "on_track";

/**
 * Trigger: wallet data ∧ pricing ∧ fully funded Safety Buffer ∧ allocation +
 * recommended target + delta all derived ∧ |crypto delta| < the ±10% rebalance
 * threshold. Any missing input, an underfunded buffer, or a delta at/over the
 * threshold → null (no On Track; the buffer or rebalance rule owns those cases).
 */
export function deriveOnTrackSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  const alloc = inputs.allocation;
  const q = inputs.dataQuality;

  if (!q.hasWalletData || !q.hasPricing) return null;
  if (!sb || !sb.fullyFunded) return null;
  if (
    !alloc ||
    alloc.currentCryptoPct == null ||
    alloc.recommendedCryptoPct == null ||
    alloc.cryptoDeltaPct == null
  ) {
    return null;
  }
  // Within the rebalance threshold — i.e. the rebalance rule would not fire.
  if (Math.abs(alloc.cryptoDeltaPct) >= REBALANCE_DELTA_THRESHOLD_PCT) return null;

  // On Track proposes no action, so the market-execution guardrails do not
  // apply (never fake "passed", and not merely "not_evaluated" either).
  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "allocation_delta", status: "passed" },
    { code: "cost_available", status: "not_applicable" },
    { code: "liquidity_available", status: "not_applicable" },
    { code: "slippage_available", status: "not_applicable" },
  ];

  return {
    id: ON_TRACK_SUGGESTION_ID,
    category: "on_track",
    reason_codes: ["portfolio_aligned"],

    title_key: "suggestion.on_track.title",
    description_key: "suggestion.on_track.description",

    action_kind: "informational",
    is_actionable: false,
    is_top_pick: false,

    // No amount / from / to — On Track proposes no move.
    delta_percent: alloc.cryptoDeltaPct,
    post_buffer_months: sb.targetMonths,

    scores: {
      impact: 0,
      urgency: 0,
      efficiency: null,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
