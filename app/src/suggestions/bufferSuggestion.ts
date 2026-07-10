/**
 * bufferSuggestion — the deterministic "Top Up Safety Buffer" rule
 * (rules/suggestion-engine-rules.md — APPROVED MVP scope; top-pick-rules.md —
 * Buffer impact formula).
 *
 * Pure function over SuggestionEngineInputs: no fetching, no pricing, no AI.
 * The Safety Buffer it reads is ALREADY DERIVED by the approved risk-based
 * product logic (safetyBufferTarget.ts + deriveSafetyBuffer) — this rule
 * consumes targetMonths / targetUsd / shortfallUsd as given and never
 * recomputes them.
 *
 * "Actionable" output is REVIEW-ONLY: it marks the suggestion valid for the
 * user to review. Nothing here (or downstream in MVP) executes a transaction,
 * requests a signature, or moves funds.
 */
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_SUGGESTION_AMOUNT_USD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";

/** Stable suggestion ID (IDs must not change across runs/copy updates). */
export const BUFFER_SUGGESTION_ID = "top_up_buffer";

/**
 * Trigger: the derived Safety Buffer exists (which already requires monthly
 * expenses + a known risk level), pricing and wallet data exist, and the
 * buffer is underfunded (not fullyFunded, shortfall > 0). Any missing input →
 * null (the engine reports unavailability; nothing is invented).
 *
 * Below the minimum suggestion size the condition is still reported, but as a
 * DISABLED, non-actionable suggestion with reason "below_min_size" and a
 * failed min_trade_size guardrail.
 */
export function deriveBufferSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  const q = inputs.dataQuality;

  if (!sb) return null;
  if (!q.hasWalletData || !q.hasPricing) return null;
  if (!q.hasMonthlyExpenses || !q.hasRiskTolerance) return null;
  if (sb.fullyFunded || sb.shortfallUsd <= 0) return null;

  const belowMin = sb.shortfallUsd < MIN_SUGGESTION_AMOUNT_USD;

  // Buffer impact/urgency (top-pick-rules.md): shortfall relative to the
  // required buffer, clamped to 1. Efficiency stays null in MVP (its inputs —
  // cost/liquidity/slippage — are not evaluated).
  const ratio = sb.targetUsd > 0 ? Math.min(sb.shortfallUsd / sb.targetUsd, 1) : 0;

  const guardrails: SuggestionGuardrail[] = [
    {
      code: "pricing_available",
      status: inputs.value.totalUsd != null ? "passed" : "failed",
    },
    // Funding the buffer can never break the buffer.
    { code: "buffer_protection", status: "passed" },
    {
      code: "min_trade_size",
      status: belowMin ? "failed" : "passed",
      message: belowMin
        ? `Shortfall is below the $${MIN_SUGGESTION_AMOUNT_USD} minimum suggestion size.`
        : undefined,
    },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  return {
    id: BUFFER_SUGGESTION_ID,
    category: "buffer",
    reason_codes: belowMin ? ["buffer_low", "below_min_size"] : ["buffer_low"],

    title_key: "suggestion.buffer.title",
    description_key: "suggestion.buffer.description",

    action_kind: belowMin ? "disabled" : "review_only",
    is_actionable: !belowMin,
    // Top Pick is assigned only by Top Pick Logic (a later step).
    is_top_pick: false,

    amount: {
      valueUsd: sb.shortfallUsd,
      label: "Buffer shortfall",
    },
    to: { bucket: "stables" },

    // Topping up the buffer is a stablecoin reserve move — no yield protocol is
    // chosen here (a later "deploy buffer into stable yield" step could change
    // this to not_evaluated).
    protocolSelection: notApplicableProtocolSelection("selection_not_required"),

    // The risk-based target consumed as-is — never altered by the engine.
    post_buffer_months: sb.targetMonths,

    scores: {
      impact: ratio,
      urgency: ratio,
      efficiency: null,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
