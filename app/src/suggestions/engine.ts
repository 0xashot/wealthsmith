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
import { deriveStakingSuggestion } from "./stakingSuggestion";
import { deriveStableYieldSuggestion } from "./stableYieldSuggestion";
import { deriveOnTrackSuggestion } from "./onTrackSuggestion";
import { selectTopPick } from "./topPick";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";

/**
 * Run the engine over an input snapshot. `generatedAt` defaults to now but can
 * be pinned (fixtures/tests) so the whole result is reproducible.
 *
 * Ordering (SAFETY BUFFER COMES FIRST):
 *   1. Build the Safety Buffer suggestion.
 *   2. Buffer Override: if the buffer is NOT fully funded, return the buffer
 *      suggestion alone — no deployment/yield/rebalance, no On Track.
 *   3. If the buffer is fully funded, collect the actionable candidates in
 *      category-priority order: Rebalance, Staking (idle SOL), then Stable Yield
 *      (excess stablecoins). Stable Yield is SUPPRESSED when Rebalance applies —
 *      rebalancing the stable allocation takes precedence over deploying it.
 *   4. If there are no candidates, fall back to On Track ("aligned").
 * Finally, deterministic Top Pick selection (topPick.ts) marks at most one
 * eligible actionable suggestion by category priority — never the UI or AI.
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
    // 3) Actionable candidates in engine (category-priority) order.
    const candidates: EngineSuggestion[] = [];
    const rebalance = deriveRebalanceSuggestion(inputs, generatedAt);
    if (rebalance) candidates.push(rebalance);
    const staking = deriveStakingSuggestion(inputs, generatedAt);
    if (staking) candidates.push(staking);
    // Stable Yield only when Rebalance does not apply (allocation already close
    // enough to target); Staking is unaffected (it uses SOL, not stables).
    if (!rebalance) {
      const stableYield = deriveStableYieldSuggestion(inputs, generatedAt);
      if (stableYield) candidates.push(stableYield);
    }

    if (candidates.length > 0) {
      suggestions.push(...candidates);
    } else {
      // 4) Nothing actionable → informational On Track.
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
