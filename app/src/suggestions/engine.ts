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
import type { SuggestionEngineResult, SuggestionReasonCode } from "./engineTypes";
import { deriveBufferSuggestion } from "./bufferSuggestion";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";

/**
 * Run the engine over an input snapshot. `generatedAt` defaults to now but can
 * be pinned (fixtures/tests) so the whole result is reproducible.
 */
export function runSuggestionEngine(
  inputs: SuggestionEngineInputs,
  generatedAt: number = Date.now()
): SuggestionEngineResult {
  const warnings: SuggestionReasonCode[] = [];
  if (inputs.value.anyUnpriced) warnings.push("partial_pricing");

  // Step 3: Safety Buffer rule only.
  const buffer = deriveBufferSuggestion(inputs, generatedAt);
  const suggestions = buffer ? [buffer] : [];

  // Honest unavailability: required inputs missing (no wallet data, no
  // pricing, or no derived Safety Buffer) → "missing_data". A fully funded
  // buffer with complete inputs is NOT unavailable — it is simply an empty
  // suggestion list (On Track becomes its own suggestion in a later step).
  const missingRequired =
    !inputs.dataQuality.hasWalletData ||
    !inputs.dataQuality.hasPricing ||
    inputs.safetyBuffer == null;

  return {
    engine_version: SUGGESTION_ENGINE_VERSION,
    generated_at: generatedAt,
    suggestions,
    warnings,
    unavailable_reason:
      suggestions.length === 0 && missingRequired ? "missing_data" : undefined,
  };
}
