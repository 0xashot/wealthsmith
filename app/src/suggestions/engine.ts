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
import { deriveCapitalEfficiencySuggestion } from "./capitalEfficiencySuggestion";
import { deriveStakingSuggestion } from "./stakingSuggestion";
import { deriveStableYieldSuggestion } from "./stableYieldSuggestion";
import { deriveDcaSuggestion } from "./dcaSuggestion";
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
  completenessGates?: CompletenessGateMap,
  /**
   * Step 18C/18G — the production Rebalance result. `card` (or null) is the ONE authoritative Rebalance
   * suggestion (built from the canonical RebalanceAssessment behind `rebalance_to_plan`). `material` is the
   * SEPARATE "material Rebalance need" signal (drift breach + valid calculation) that preserves conflict
   * suppression even when no card is emitted. There is NO legacy bucket fallback: when this is ABSENT the
   * engine produces NO Rebalance candidate (fail closed). The mounted rail always supplies it.
   */
  rebalanceOverride?: { card: EngineSuggestion | null; material: boolean; materialCryptoToStables?: boolean },
  /**
   * Step 19C — the production Trim result. `candidate` (or null) is the ONE authoritative Trim suggestion
   * (built from the canonical TrimAssessment behind `trim_long_tail_assets`). There is NO legacy symbol-based
   * fallback: when this is ABSENT the engine produces NO Trim candidate (fail closed). `materialReviewNeed`
   * mirrors overall readiness (audit signal); Trim never suppresses another suggestion. The mounted rail
   * always supplies it. Trim coexists with Rebalance and Capital Efficiency and keeps its category-4 order.
   */
  trimOverride?: { candidate: EngineSuggestion | null; materialReviewNeed?: boolean },
  /**
   * Step 20C — the production Position Optimization result. `candidate` (or null) is the ONE authoritative
   * review suggestion (built from the canonical PositionOptimizationAssessment behind
   * `position_optimization_review`). There is NO legacy fallback: when ABSENT the engine produces NO card
   * (fail closed). `reviewNeed` mirrors overall readiness (audit signal); it never suppresses another
   * suggestion. The mounted rail always supplies it. Keeps its lowest (category-8) order; coexists with all.
   */
  positionOptimizationOverride?: { candidate: EngineSuggestion | null; reviewNeed?: boolean }
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
    // Step 18C/18G — the ONE authoritative Rebalance result comes exclusively from the canonical assessment
    // via `rebalanceOverride`; its OWN direction-specific gates already applied (the over-broad completeness
    // `allows` is NOT re-applied). There is NO legacy bucket fallback: when the override is absent (missing
    // canonical input), the engine produces NO Rebalance candidate (fail closed). The mounted rail always
    // passes the override, so production never depends on this default.
    const rebalance = rebalanceOverride?.card ?? null;
    const rebalanceApplies = rebalanceOverride?.material ?? false;
    if (rebalance) candidates.push(rebalance);
    // Capital Efficiency ranks above Staking/Stable Yield; may coexist with all.
    const capitalEfficiency = deriveCapitalEfficiencySuggestion(inputs, generatedAt);
    if (capitalEfficiency) candidates.push(capitalEfficiency);
    // Step 19C/19D — the ONE authoritative Trim result comes exclusively from the canonical TrimAssessment via
    // `trimOverride` (built by `buildTrimCardFromAssessment` behind the SAME `trim_long_tail_assets` contract).
    // Its OWN Trim-specific gates already applied; the obsolete Rebalance-copied Trim completeness gate was
    // removed in 19D. NO legacy fallback: when the override is absent, the engine produces NO Trim candidate
    // (fail closed). Trim coexists with Rebalance AND Capital Efficiency — neither suppresses it (both may fire).
    const trim = trimOverride?.candidate ?? null;
    if (trim) candidates.push(trim);
    // Step 18E — a PROVEN material crypto_to_stables need suppresses a new staking suggestion (staking
    // preserves crypto exposure and reduces liquid SOL; Rebalance outranks yield optimization). Narrows
    // only — never enables staking. Keyed on the material NEED, independent of Rebalance-card presence.
    const staking = deriveStakingSuggestion(inputs, generatedAt);
    if (staking && allows("staking") && rebalanceOverride?.materialCryptoToStables !== true) candidates.push(staking);
    // Stable Yield and DCA only when Rebalance does not apply. 18C: keyed on MATERIAL Rebalance NEED
    // (rebalanceApplies), not card presence — so crypto_to_stables (or insufficient-USDC) material drift
    // still suppresses conflicting deployment even when no Rebalance card can safely be shown.
    if (!rebalanceApplies) {
      // Step 16H-A — prefer the plan-backed Stable Yield suggestion; it suppresses the legacy rule
      // (one stable-yield card per run). Production passes none (no approved product → no ready plan).
      // 17H.1 — the direct-USDC-lending completeness gate narrows this (never enables it).
      const stableYield = planStableYield ?? deriveStableYieldSuggestion(inputs, generatedAt);
      if (stableYield && allows("directLending")) candidates.push(stableYield);
      // Step 15H — prefer the plan-backed DCA; it suppresses the legacy DCA (one DCA per plan).
      const dca = planDca ?? deriveDcaSuggestion(inputs, generatedAt);
      if (dca && allows("dca")) candidates.push(dca);
    }
    // Step 20C — the ONE authoritative Position Optimization result comes exclusively from the canonical
    // PositionOptimizationAssessment via `positionOptimizationOverride` (built by
    // `buildPositionOptimizationCardFromAssessment` behind the SAME `position_optimization_review` contract).
    // Its OWN trigger-specific gates already applied; the obsolete Rebalance-copied SOL-exposure gate is not
    // used. NO legacy fallback: when the override is absent, the engine produces NO card (fail closed). It is
    // the lowest-priority actionable candidate and coexists with every higher category (reviews deployed positions).
    const positionOpt = positionOptimizationOverride?.candidate ?? null;
    if (positionOpt) candidates.push(positionOpt);

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
