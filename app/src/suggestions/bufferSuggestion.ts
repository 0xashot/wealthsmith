/**
 * bufferSuggestion — the canonical production Safety Buffer card mapper (Step 21C).
 *
 * `buildSafetyBufferCardFromAssessment` is the ONE authoritative buffer-card builder. It renders the existing
 * `top_up_buffer` contract from the canonical `SafetyBufferAssessment` (safetyBufferAssessment.ts), which projects
 * the canonical `computeSafetyBufferCoverage` result WITHOUT re-running stable identity, verified-liquidity, or
 * interval reasoning. It is honest by construction:
 *   - a DEFINITE shortfall amount is the CONFIRMED minimum (never the verified-only worst case, never a plan amount);
 *   - an UNRESOLVED coverage state shows NO definite amount (recognized-but-unresolved value might close the gap);
 *   - a below-$50 confirmed gap is an INFORMATIONAL "nearly funded" state (no disabled action button);
 *   - target/coverage-unavailable are informational states, never a false "below target" claim.
 *
 * The pre-canonical direct rule was relocated in Step 21C and DELETED in Step 21F, and is no longer reachable
 * from any mounted/Demo/testing-production path — the engine consumes only the fail-closed `bufferOverride`.
 */
import type { EngineSuggestion, SuggestionGuardrail, SuggestionReasonCode, ReviewMetric } from "./engineTypes";
import { SUGGESTION_ENGINE_VERSION, GUARDRAIL_STATUS_NOT_EVALUATED } from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, metric } from "./suggestionReviewDetails";
import type { SafetyBufferAssessment } from "./safetyBufferAssessment";

/** Stable suggestion ID (IDs must not change across runs/copy/state updates). */
export const BUFFER_SUGGESTION_ID = "top_up_buffer";

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Build the canonical `top_up_buffer` card from a SafetyBufferAssessment, or `null` when coverage is COMPLETE
 * (no card; downstream may be evaluated). Every other state produces exactly one buffer-category card. NEVER
 * falls back to the legacy direct rule.
 */
export function buildSafetyBufferCardFromAssessment(a: SafetyBufferAssessment, generatedAt: number): EngineSuggestion | null {
  if (a.presentationState === "complete") return null;

  const base = {
    id: BUFFER_SUGGESTION_ID,
    category: "buffer" as const,
    protocolSelection: notApplicableProtocolSelection("selection_not_required"),
    is_top_pick: false, // set only by selectTopPick
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };

  const target = a.targetUsd;
  const verified = a.verifiedLiquidStableValueUsd;
  const proven = a.provenMinimumShortfallUsd ?? 0;
  const worst = a.verifiedOnlyShortfallUsd ?? proven;
  const isRange = worst > proven; // some unresolved value exists but is insufficient to prove full funding

  // ---- Definite shortfall (coverageState incomplete, proven ≥ $50) → review-only, amount = confirmed minimum. ----
  if (a.presentationState === "definite_shortfall") {
    const planReady = a.contribution.contributionPlanState !== "none" && a.contribution.planIsReady === true;
    const score = target != null && target > 0 ? Math.min(proven / target, 1) : 0;
    const guardrails: SuggestionGuardrail[] = [
      { code: "pricing_available", status: "passed" },
      { code: "buffer_protection", status: "passed" },
      { code: "coverage_confidence", status: "passed" },
      { code: "min_trade_size", status: "passed" },
      { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    ];
    const metrics: ReviewMetric[] = [
      usdMetric("Verified liquid reserve", verified ?? 0),
      ...(isRange && a.maximumPossibleCoverageUsd != null ? [usdMetric("Maximum possible coverage", a.maximumPossibleCoverageUsd)] : []),
      ...(target != null ? [usdMetric("Safety Buffer target", target)] : []),
      usdMetric("Amount needed", proven),
      ...(isRange ? [usdMetric("Maximum amount needed", worst)] : []),
      ...(a.monthsCoveredVerified != null ? [metric("Expenses covered", round1(a.monthsCoveredVerified), "months", "months")] : []),
      ...(a.targetMonths != null ? [metric("Target months", a.targetMonths, "months", "months")] : []),
      ...(planReady && a.contribution.plannedContributionUsd != null ? [usdMetric(a.contribution.planIsRange ? "Next planned contribution (max)" : "Next planned contribution", a.contribution.plannedContributionUsd)] : []),
      ...(planReady && a.contribution.remainingProvenShortfallAfterPlanUsd != null ? [usdMetric("Confirmed gap after contribution", a.contribution.remainingProvenShortfallAfterPlanUsd)] : []),
      ...(planReady && isRange && a.contribution.remainingVerifiedOnlyShortfallAfterPlanUsd != null ? [usdMetric("Maximum remaining gap after plan", a.contribution.remainingVerifiedOnlyShortfallAfterPlanUsd)] : []),
    ];
    const calculations = [
      { label: "Maximum amount needed", formula: "target − verified liquid reserve", currentValue: verified ?? 0, targetValue: target ?? 0, difference: worst, unit: "USD" },
      ...(isRange && a.maximumPossibleCoverageUsd != null
        ? [{ label: "Confirmed minimum shortfall", formula: "target − maximum possible coverage", currentValue: a.maximumPossibleCoverageUsd, targetValue: target ?? 0, difference: proven, unit: "USD" as const }]
        : [{ label: "Confirmed shortfall (no unresolved value)", formula: "target − verified liquid reserve", currentValue: verified ?? 0, targetValue: target ?? 0, difference: proven, unit: "USD" as const }]),
    ];
    const reason_codes: SuggestionReasonCode[] = ["buffer_low", "buffer_shortfall_confirmed"];
    return {
      ...base,
      reason_codes,
      title_key: "suggestion.buffer.title",
      description_key: planReady ? "suggestion.buffer.plan.description" : isRange ? "suggestion.buffer.range.description" : "suggestion.buffer.description",
      action_kind: "review_only",
      is_actionable: true,
      amount: { valueUsd: proven, label: isRange ? "Minimum amount needed" : "Amount needed" },
      to: { bucket: "stables" },
      post_buffer_months: a.targetMonths ?? undefined,
      scores: { impact: score, urgency: score, efficiency: null },
      guardrails,
      reviewDetails: buildReviewDetails({ category: "buffer", actionKind: "review_only", guardrails, protocolSelection: base.protocolSelection, metrics, calculations }),
    };
  }

  // ---- Below minimum (0 < proven < $50) → informational "nearly funded" (NO disabled action button). ----
  if (a.presentationState === "definite_shortfall_below_minimum") {
    const guardrails: SuggestionGuardrail[] = [
      { code: "pricing_available", status: "passed" },
      { code: "buffer_protection", status: "passed" },
      { code: "coverage_confidence", status: "passed" },
      { code: "min_trade_size", status: "not_applicable" },
      { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    ];
    const metrics: ReviewMetric[] = [
      usdMetric("Verified liquid reserve", verified ?? 0),
      ...(target != null ? [usdMetric("Safety Buffer target", target)] : []),
      usdMetric("Confirmed remaining gap", proven),
      ...(a.targetMonths != null ? [metric("Target months", a.targetMonths, "months", "months")] : []),
    ];
    return {
      ...base,
      reason_codes: ["buffer_low", "buffer_nearly_funded"],
      title_key: "suggestion.buffer.nearly_funded.title",
      description_key: "suggestion.buffer.nearly_funded.description",
      action_kind: "informational",
      is_actionable: false,
      amount: { valueUsd: proven, label: "Confirmed remaining gap" },
      post_buffer_months: a.targetMonths ?? undefined,
      scores: { impact: 0, urgency: 0, efficiency: null },
      guardrails,
      reviewDetails: buildReviewDetails({ category: "buffer", actionKind: "informational", guardrails, protocolSelection: base.protocolSelection, metrics }),
    };
  }

  // ---- Unresolved coverage → informational verification state (NO definite amount, NO plan-as-required). ----
  if (a.presentationState === "coverage_unresolved") {
    const guardrails: SuggestionGuardrail[] = [
      { code: "pricing_available", status: "passed" },
      { code: "buffer_protection", status: "passed" },
      { code: "coverage_confidence", status: "unresolved" },
      { code: "liquidity_verification", status: "unresolved" },
      { code: "min_trade_size", status: "not_applicable" },
      { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    ];
    // Metadata only (no primary amount). When magnitude is open we present NO finite gap range.
    const metrics: ReviewMetric[] = [
      usdMetric("Verified liquid reserve", verified ?? 0),
      ...(target != null ? [usdMetric("Safety Buffer target", target)] : []),
      ...(a.unresolvedStableValueUsd != null && !a.maximumCoverageIsOpen ? [usdMetric("Stable value awaiting verification", a.unresolvedStableValueUsd)] : []),
      ...(!a.maximumCoverageIsOpen && worst > 0 ? [usdMetric("Possible remaining gap (up to)", worst)] : []),
    ];
    return {
      ...base,
      reason_codes: ["buffer_low", "buffer_coverage_unresolved"],
      title_key: "suggestion.buffer.unresolved.title",
      description_key: "suggestion.buffer.unresolved.description",
      action_kind: "informational",
      is_actionable: false,
      post_buffer_months: a.targetMonths ?? undefined,
      scores: { impact: 0, urgency: 0, efficiency: null },
      guardrails,
      reviewDetails: buildReviewDetails({ category: "buffer", actionKind: "informational", guardrails, protocolSelection: base.protocolSelection, metrics }),
    };
  }

  // ---- Target unavailable → informational profile-completion state (NO amount, NO "below target"). ----
  if (a.presentationState === "target_unavailable") {
    const guardrails: SuggestionGuardrail[] = [
      { code: "buffer_protection", status: "passed" },
      { code: "coverage_confidence", status: "unresolved" },
      { code: "min_trade_size", status: "not_applicable" },
      { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
      { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    ];
    return {
      ...base,
      reason_codes: ["buffer_target_unavailable"],
      title_key: "suggestion.buffer.target_unavailable.title",
      description_key: "suggestion.buffer.target_unavailable.description",
      action_kind: "informational",
      is_actionable: false,
      scores: { impact: 0, urgency: 0, efficiency: null },
      guardrails,
      reviewDetails: buildReviewDetails({ category: "buffer", actionKind: "informational", guardrails, protocolSelection: base.protocolSelection, metrics: [] }),
    };
  }

  // ---- Coverage unavailable (valid target, coverage not classifiable) → informational, no amount. ----
  const guardrails: SuggestionGuardrail[] = [
    { code: "buffer_protection", status: "passed" },
    { code: "coverage_confidence", status: "unresolved" },
    { code: "liquidity_verification", status: "unresolved" },
    { code: "min_trade_size", status: "not_applicable" },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];
  return {
    ...base,
    reason_codes: ["buffer_coverage_unavailable"],
    title_key: "suggestion.buffer.coverage_unavailable.title",
    description_key: "suggestion.buffer.coverage_unavailable.description",
    action_kind: "informational",
    is_actionable: false,
    ...(target != null ? { post_buffer_months: a.targetMonths ?? undefined } : {}),
    scores: { impact: 0, urgency: 0, efficiency: null },
    guardrails,
    reviewDetails: buildReviewDetails({ category: "buffer", actionKind: "informational", guardrails, protocolSelection: base.protocolSelection, metrics: [] }),
  };
}
