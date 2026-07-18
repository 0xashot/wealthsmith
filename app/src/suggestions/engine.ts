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
import { deriveCapitalEfficiencySuggestion } from "./capitalEfficiencySuggestion";
import { deriveTrimSuggestion } from "./trimSuggestion";
import { deriveStakingSuggestion } from "./stakingSuggestion";
import { deriveStableYieldSuggestion } from "./stableYieldSuggestion";
import { deriveDcaSuggestion } from "./dcaSuggestion";
import { derivePositionOptimizationSuggestion } from "./positionOptimizationSuggestion";
import { deriveOnTrackSuggestion } from "./onTrackSuggestion";
import { completenessAllows, type CompletenessGateMap, type CompletenessDecision } from "../wallet/portfolioCompleteness";
import { selectTopPick } from "./topPick";
import { ensureExecutionGuardrails } from "./guardrails";
import { reconcileProtocolGuardrail } from "./protocolSelection";
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
 *      category-priority order: Rebalance, Capital Efficiency (idle assets),
 *      Trim (non-core long-tail review), Staking (idle SOL), Stable Yield
 *      (excess stablecoins), DCA (contribution-funded gradual entry), then
 *      Position Optimization (review of deployed positions). Stable Yield and
 *      DCA are SUPPRESSED when Rebalance applies; the others may coexist.
 *   4. If there are no candidates, fall back to On Track ("aligned").
 * Finally, deterministic Top Pick selection (topPick.ts) marks at most one
 * eligible actionable suggestion by category priority — never the UI or AI.
 */
export function runSuggestionEngine(
  inputs: SuggestionEngineInputs,
  generatedAt: number = Date.now(),
  /**
   * Step 15H — an optional pre-built plan-backed contribution suggestion (from the deterministic
   * 15A–15G pipeline). A `buffer`-category one enriches/replaces the generic Safety Buffer
   * suggestion; a `dca`-category one takes the DCA slot and suppresses the legacy DCA. It is merged
   * BEFORE the existing sort/Top-Pick pass, so the frontend receives already-ordered output.
   */
  contributionSuggestion?: EngineSuggestion | null,
  /**
   * Step 16H-A — an optional pre-built plan-backed Stable Yield suggestion (converted from a Step 16G
   * ready plan by `buildStableYieldPlanSuggestion`). When provided (category `stable_yield`), it takes
   * the Stable Yield slot and suppresses the legacy "Put Stablecoins to Work" rule (one stable-yield
   * card). It is merged BEFORE the sort/Top-Pick pass so the frontend receives already-ordered output.
   */
  stableYieldPlanSuggestion?: EngineSuggestion | null,
  /**
   * Step 17H.1 — optional portfolio-completeness gate map. Each present entry can only SUPPRESS a candidate
   * whose existing rule already produced it (AND-narrowing): `newAllowed = existingEligibility AND
   * gate==="allowed"`. Absent map (or entry) ⇒ no additional gating, so all prior behavior is preserved.
   * It NEVER enables an otherwise-ineligible suggestion, reorders candidates, or changes Top Pick.
   */
  completenessGates?: CompletenessGateMap
): SuggestionEngineResult {
  const warnings: SuggestionReasonCode[] = [];
  if (inputs.value.anyUnpriced) warnings.push("partial_pricing");
  const allows = (d: CompletenessDecision) => completenessAllows(completenessGates, d);

  const suggestions: EngineSuggestion[] = [];
  const planBuffer = contributionSuggestion?.category === "buffer" ? contributionSuggestion : null;
  const planDca = contributionSuggestion?.category === "dca" ? contributionSuggestion : null;
  const planStableYield = stableYieldPlanSuggestion?.category === "stable_yield" ? stableYieldPlanSuggestion : null;

  // 1) Safety Buffer first (plan-backed version enriches/replaces the generic one — one buffer card).
  const buffer = planBuffer ?? deriveBufferSuggestion(inputs, generatedAt);
  if (buffer) suggestions.push(buffer);

  // 2) Buffer Override: an underfunded buffer suppresses every other rule.
  const bufferSatisfied = inputs.safetyBuffer?.fullyFunded === true;
  if (bufferSatisfied) {
    // 3) Actionable candidates in engine (category-priority) order.
    const candidates: EngineSuggestion[] = [];
    const rebalance = deriveRebalanceSuggestion(inputs, generatedAt);
    if (rebalance && allows("rebalance")) candidates.push(rebalance);
    // Capital Efficiency ranks above Staking/Stable Yield; may coexist with all.
    const capitalEfficiency = deriveCapitalEfficiencySuggestion(inputs, generatedAt);
    if (capitalEfficiency) candidates.push(capitalEfficiency);
    // Trim (non-core long-tail review) — separate intent from Capital Efficiency;
    // both may fire and neither suppresses the other.
    const trim = deriveTrimSuggestion(inputs, generatedAt);
    if (trim && allows("trim")) candidates.push(trim);
    const staking = deriveStakingSuggestion(inputs, generatedAt);
    if (staking && allows("staking")) candidates.push(staking);
    // Stable Yield and DCA only when Rebalance does not apply (allocation
    // already close enough to target); Staking is unaffected (SOL, not stables).
    if (!rebalance) {
      // Step 16H-A — prefer the plan-backed Stable Yield suggestion; it suppresses the legacy rule
      // (one stable-yield card per run). Production passes none (no approved product → no ready plan).
      // 17H.1 — the direct-USDC-lending completeness gate narrows this (never enables it).
      const stableYield = planStableYield ?? deriveStableYieldSuggestion(inputs, generatedAt);
      if (stableYield && allows("directLending")) candidates.push(stableYield);
      // Step 15H — prefer the plan-backed DCA; it suppresses the legacy DCA (one DCA per plan).
      const dca = planDca ?? deriveDcaSuggestion(inputs, generatedAt);
      if (dca && allows("dca")) candidates.push(dca);
    }
    // Position Optimization is the lowest-priority actionable candidate and may
    // coexist with any of the above (it reviews already-deployed positions).
    const positionOpt = derivePositionOptimizationSuggestion(inputs, generatedAt);
    if (positionOpt && allows("positionOptimization")) candidates.push(positionOpt);

    if (candidates.length > 0) {
      suggestions.push(...candidates);
    } else {
      // 4) Nothing actionable → informational On Track (gated: unresolved completeness hides it).
      const onTrack = deriveOnTrackSuggestion(inputs, generatedAt);
      if (onTrack && allows("onTrack")) suggestions.push(onTrack);
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

  // Guarantee every suggestion carries the market-execution guardrails
  // (cost/liquidity/slippage) — appended as not_evaluated if a rule omitted
  // them — and a `protocol_selection` guardrail whose status mirrors the
  // suggestion's protocolSelection model (absent → not_applicable). Honest
  // coverage; never upgrades a status to passed.
  const withGuardrails = ranked.map((s) => ({
    ...s,
    guardrails: reconcileProtocolGuardrail(
      ensureExecutionGuardrails(s.guardrails),
      s.protocolSelection
    ),
  }));

  return {
    engine_version: SUGGESTION_ENGINE_VERSION,
    generated_at: generatedAt,
    suggestions: withGuardrails,
    warnings,
    unavailable_reason:
      ranked.length === 0 && missingRequired ? "missing_data" : undefined,
  };
}
