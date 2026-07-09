/**
 * engine — the deterministic Suggestion Engine MVP entry point
 * (rules/suggestion-engine-rules.md). Pure product logic: same inputs (and
 * generatedAt) → same output. No AI, no fetching, no invented values.
 *
 * Step 3 scope: ONLY the Safety Buffer rule runs. Rebalance, On Track, and
 * Top Pick selection are later steps — every suggestion leaves this engine
 * with `is_top_pick: false` until Top Pick Logic exists.
 *
 * Nothing here is imported by UI code yet; rendering (via the copy mapper) is
 * a later step. Demo Mode never calls this engine.
 */
import type { SuggestionEngineInputs } from "./engineInputs";
import type {
  SuggestionEngineResult,
  SuggestionReasonCode,
  EngineSuggestion,
} from "./engineTypes";
import { deriveBufferSuggestion } from "./bufferSuggestion";
import { deriveRebalanceSuggestion } from "./rebalanceSuggestion";
import { deriveOnTrackSuggestion } from "./onTrackSuggestion";
import { selectTopPick } from "./topPick";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";

/**
 * Run the engine over an input snapshot. `generatedAt` defaults to now but can
 * be pinned (fixtures/tests) so the whole result is reproducible.
 *
 * Step 5 scope — MVP ordering (SAFETY BUFFER COMES FIRST):
 *   1. Build the Safety Buffer suggestion.
 *   2. Buffer Override: if the buffer is NOT fully funded, return the buffer
 *      suggestion alone — no Rebalance, no On Track.
 *   3. If the buffer is fully funded, try Rebalance; if it fires, return it.
 *   4. If no Rebalance, try On Track (informational "aligned" state).
 * Finally, deterministic Top Pick selection (topPick.ts) marks at most one
 * eligible actionable suggestion — never the UI or AI.
 */
export function runSuggestionEngine(
  inputs: SuggestionEngineInputs,
  generatedAt: number = Date.now()
): SuggestionEngineResult {
  const warnings: SuggestionReasonCode[] = [];
  if (inputs.value.anyUnpriced) warnings.push("partial_pricing");

  const suggestions: EngineSuggestion[] = [];

  // 1) Safety Buffer first.
  const buffer = deriveBufferSuggestion(inputs, generatedAt);
  if (buffer) suggestions.push(buffer);

  // 2) Buffer Override: an underfunded buffer suppresses every other rule.
  const bufferSatisfied = inputs.safetyBuffer?.fullyFunded === true;
  if (bufferSatisfied) {
    // 3) Rebalance takes precedence over On Track.
    const rebalance = deriveRebalanceSuggestion(inputs, generatedAt);
    if (rebalance) {
      suggestions.push(rebalance);
    } else {
      // 4) Otherwise the portfolio is aligned → informational On Track.
      const onTrack = deriveOnTrackSuggestion(inputs, generatedAt);
      if (onTrack) suggestions.push(onTrack);
    }
  }

  // Honest unavailability: required inputs missing (no wallet data, no
  // pricing, or no derived Safety Buffer) → "missing_data". A fully funded,
  // in-target portfolio with complete inputs is NOT unavailable — it produces
  // the On Track state above.
  const missingRequired =
    !inputs.dataQuality.hasWalletData ||
    !inputs.dataQuality.hasPricing ||
    inputs.safetyBuffer == null;

  // Deterministic Top Pick: mark at most one eligible actionable suggestion.
  const ranked = selectTopPick(suggestions);

  return {
    engine_version: SUGGESTION_ENGINE_VERSION,
    generated_at: generatedAt,
    suggestions: ranked,
    warnings,
    unavailable_reason:
      ranked.length === 0 && missingRequired ? "missing_data" : undefined,
  };
}
