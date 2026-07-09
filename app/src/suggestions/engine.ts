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
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";

/**
 * Run the engine over an input snapshot. `generatedAt` defaults to now but can
 * be pinned (fixtures/tests) so the whole result is reproducible.
 *
 * Step 4 scope: Safety Buffer + Rebalance rules. SAFETY BUFFER COMES FIRST —
 * while the buffer is underfunded, only the buffer suggestion may appear
 * (Buffer Override); the Rebalance rule itself also gates on a fully funded
 * buffer, so this ordering is belt-and-suspenders. On Track and Top Pick are
 * later steps; every suggestion still leaves with is_top_pick=false.
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

  // 2) Buffer Override: if the buffer is not fully funded, no other suggestion
  //    may appear — return the buffer suggestion (if any) alone.
  const bufferSatisfied = inputs.safetyBuffer?.fullyFunded === true;
  if (bufferSatisfied) {
    const rebalance = deriveRebalanceSuggestion(inputs, generatedAt);
    if (rebalance) suggestions.push(rebalance);
  }

  // Honest unavailability: required inputs missing (no wallet data, no
  // pricing, or no derived Safety Buffer) → "missing_data". A fully funded,
  // in-target portfolio with complete inputs is NOT unavailable — it is simply
  // an empty suggestion list (On Track becomes its own suggestion in a later
  // step).
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
