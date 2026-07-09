/**
 * positionOptimizationSuggestion — the deterministic "Review Existing Yield
 * Positions" rule (category `position_optimization`;
 * rules/suggestion-engine-rules.md). Pure over SuggestionEngineInputs: no
 * fetching, no pricing, no AI, no protocol choice, no invented APY.
 *
 * It reviews only EXISTING DEPLOYED positions (LSTs, native stake, protocol/
 * yield) that meet a deterministic review condition — missing sourced APY, low
 * sourced APY, or over-concentration. It NEVER claims a position is bad or a
 * protocol is unsafe, and NEVER names a replacement — it only flags that a
 * position "may need review". One AGGREGATED suggestion is returned, not one
 * card per position.
 *
 * SAFETY BUFFER COMES FIRST (engine-enforced); this rule is the lowest-priority
 * actionable candidate and may coexist with Rebalance/Staking/Stable Yield.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SuggestionEngineInputs } from "./engineInputs";
import type {
  EngineSuggestion,
  SuggestionGuardrail,
  SuggestionReasonCode,
} from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_POSITION_REVIEW_USD,
  MIN_REVIEW_APY,
  MIN_CONCENTRATION_REVIEW_USD,
  POSITION_CONCENTRATION_THRESHOLD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";

/** Stable suggestion ID. */
export const POSITION_OPTIMIZATION_SUGGESTION_ID = "position_optimization_review";

/** An existing DEPLOYED position (LST / native stake / protocol), priced. */
function isDeployedPosition(p: WalletPosition): boolean {
  return (
    (p.type === "lst" || p.type === "stake" || p.type === "protocol") &&
    typeof p.valueUsd === "number"
  );
}

/**
 * Trigger: fully funded buffer ∧ pricing ∧ a priced total ∧ at least one priced
 * deployed position that meets a review condition, with total flagged value at
 * least the minimum. Anything missing → null; liquid wallet tokens, unpriced
 * positions, and healthy positions are never flagged.
 */
export function derivePositionOptimizationSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const reasons = new Set<SuggestionReasonCode>();
  let totalFlaggedValueUsd = 0;

  for (const p of inputs.positions) {
    if (!isDeployedPosition(p)) continue;
    const v = p.valueUsd as number;
    let flagged = false;

    // A. Missing sourced APY on a meaningful deployed position.
    if (v >= MIN_POSITION_REVIEW_USD && p.apy == null) {
      reasons.add("missing_apy_data");
      flagged = true;
    }
    // B. Low sourced APY.
    if (v >= MIN_POSITION_REVIEW_USD && typeof p.apy === "number" && p.apy < MIN_REVIEW_APY) {
      reasons.add("low_yield_position");
      flagged = true;
    }
    // C. Over-concentration of a single deployed position.
    if (v >= MIN_CONCENTRATION_REVIEW_USD && v / totalPricedUsd >= POSITION_CONCENTRATION_THRESHOLD) {
      reasons.add("concentration_risk");
      flagged = true;
    }

    if (flagged) totalFlaggedValueUsd += v;
  }

  if (reasons.size === 0) return null;
  if (totalFlaggedValueUsd < MIN_POSITION_REVIEW_USD) return null;

  // Deterministic reason-code order.
  const reasonOrder: SuggestionReasonCode[] = [
    "missing_apy_data",
    "low_yield_position",
    "concentration_risk",
  ];
  const reason_codes = reasonOrder.filter((c) => reasons.has(c));

  const hasApyReview = reasons.has("missing_apy_data") || reasons.has("low_yield_position");
  const hasConcentration = reasons.has("concentration_risk");

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "position_value_threshold", status: "passed" },
    { code: "apy_data_review", status: hasApyReview ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "concentration_review", status: hasConcentration ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "protocol_selection", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  return {
    id: POSITION_OPTIMIZATION_SUGGESTION_ID,
    category: "position_optimization",
    reason_codes,

    title_key: "suggestion.position_optimization.title",
    description_key: "suggestion.position_optimization.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: {
      valueUsd: totalFlaggedValueUsd,
      label: "Positions to review",
    },

    scores: {
      impact: Math.min(totalFlaggedValueUsd / totalPricedUsd, 1),
      urgency: hasConcentration ? 0.45 : 0.35,
      efficiency: reasons.has("low_yield_position") ? 0.6 : 0.5,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
