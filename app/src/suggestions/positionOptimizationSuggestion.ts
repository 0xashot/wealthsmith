/**
 * positionOptimizationSuggestion — the canonical production Position Optimization card mapper (Step 20C).
 *
 * `buildPositionOptimizationCardFromAssessment` is the ONE authoritative card builder. It renders the existing
 * `position_optimization_review` review-only card from the canonical `PositionOptimizationAssessment`
 * (positionOptimizationAssessment.ts): exact economic-position identity (counted once), authoritative gross-asset
 * accounting with liabilities separate, honest APY state (missing / unsupported / not-applicable /
 * freshness-unverified / stale / fresh), source-specific freshness governance, exact shared-underlying exposure,
 * and trigger-specific review language. It selects no position, proposes no protocol, adds no exit/execution CTA,
 * and introduces no route/quote/transaction/signature behavior.
 *
 * The pre-canonical rule was relocated to a legacy module in Step 20C and DELETED in Step 20D. There is no
 * fallback: the engine emits a Position Optimization candidate only when the mounted rail supplies this canonical
 * card, and nothing can independently derive one from raw positions outside this mapper + assessment.
 */
import type { EngineSuggestion, SuggestionGuardrail, SuggestionReasonCode, ReviewPosition, ReviewCalculation, ReviewLimitation } from "./engineTypes";
import { SUGGESTION_ENGINE_VERSION, MIN_POSITION_REVIEW_USD, POSITION_CONCENTRATION_THRESHOLD, DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD, GUARDRAIL_STATUS_NOT_EVALUATED } from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, metric } from "./suggestionReviewDetails";
import type { PositionOptimizationAssessment, PositionOptimizationPosition, PoApyState, PoLifecycle } from "./positionOptimizationAssessment";
import {
  SUGGESTION_PO_REASON_MISSING_APY, SUGGESTION_PO_REASON_LOW_YIELD, SUGGESTION_PO_REASON_CONCENTRATION, SUGGESTION_PO_REASON_SHARED,
  SUGGESTION_PO_POS_MISSING_APY, SUGGESTION_PO_POS_LOW_YIELD, SUGGESTION_PO_POS_CONCENTRATION, SUGGESTION_PO_POS_SHARED,
  SUGGESTION_PO_APY_FRESHNESS_UNVERIFIED, SUGGESTION_PO_APY_UNAVAILABLE, SUGGESTION_PO_APY_STALE, SUGGESTION_PO_APY_NO_COMPARISON,
  SUGGESTION_PO_APY_NOT_APPLICABLE, SUGGESTION_PO_APY_UNRESOLVED,
  SUGGESTION_PO_LIMIT_FRESHNESS, SUGGESTION_PO_LIMIT_NO_COMPARISON, SUGGESTION_PO_LIMIT_EXPOSURE,
} from "../state/approvedCopy";

/** Stable suggestion ID (unchanged; IDs must not change across runs/copy updates). */
export const POSITION_OPTIMIZATION_SUGGESTION_ID = "position_optimization_review";

const round1Pct = (fraction: number): number => Math.round(fraction * 1000) / 10;

const APY_DISPLAY_STATE: Record<PoApyState, string> = {
  sourced_fresh: "APY sourced",
  sourced_freshness_unverified: SUGGESTION_PO_APY_FRESHNESS_UNVERIFIED,
  sourced_stale: SUGGESTION_PO_APY_STALE,
  missing_expected: SUGGESTION_PO_APY_UNAVAILABLE,
  source_failed: SUGGESTION_PO_APY_UNAVAILABLE,
  unsupported: SUGGESTION_PO_APY_NO_COMPARISON,
  not_applicable: SUGGESTION_PO_APY_NOT_APPLICABLE,
  unresolved: SUGGESTION_PO_APY_UNRESOLVED,
};
const LIFECYCLE_LABEL: Record<PoLifecycle, string> = {
  active: "Active", activating: "Activating", deactivating: "Deactivating", withdrawable: "Withdrawable",
  inactive: "Inactive", locked: "Locked", unresolved: "Lifecycle unverified", not_applicable: "",
};

/**
 * Build the canonical `position_optimization_review` card from a PositionOptimizationAssessment. Returns null
 * unless overall readiness + review confidence are allowed, ≥ 1 trigger family is proven, total unique flagged
 * value meets the minimum, and flagged positions are non-empty. NEVER falls back to the legacy rule.
 */
export function buildPositionOptimizationCardFromAssessment(assessment: PositionOptimizationAssessment, generatedAt: number): EngineSuggestion | null {
  if (assessment.overallReadiness.status !== "allowed") return null;
  if (assessment.reviewConfidenceGate.status !== "allowed") return null;
  const hasMissing = assessment.triggerStates.missingApy === "triggered";
  const hasLow = assessment.triggerStates.lowYield === "triggered";
  const hasConcentration = assessment.triggerStates.concentration === "triggered";
  const hasShared = assessment.triggerStates.sharedExposure === "triggered";
  if (!hasMissing && !hasLow && !hasConcentration && !hasShared) return null;
  if (assessment.totalFlaggedValueUsd < MIN_POSITION_REVIEW_USD) return null;
  if (assessment.flaggedPositions.length === 0) return null;

  const gross = assessment.grossAssetValueUsd;
  const total = assessment.totalFlaggedValueUsd;

  // Reason codes (compatibility) — canonical order, deduped.
  const reasonOrder: SuggestionReasonCode[] = ["missing_apy_data", "low_yield_position", "concentration_risk", "duplicate_exposure"];
  const reasonSet = new Set<SuggestionReasonCode>();
  if (hasMissing) reasonSet.add("missing_apy_data");
  if (hasLow) reasonSet.add("low_yield_position");
  if (hasConcentration) reasonSet.add("concentration_risk");
  if (hasShared) reasonSet.add("duplicate_exposure"); // internal compatibility code; user copy says "shared underlying exposure"
  const reason_codes = reasonOrder.filter((c) => reasonSet.has(c));

  // Per-position trigger membership + safe shared-exposure label.
  const groupForPosition = (id: string) => assessment.sharedExposureGroups.find((g) => g.memberPositionIds.includes(id));
  const positionReasons = (p: PositionOptimizationPosition): { reasons: string[]; sharedLabel?: string } => {
    const reasons: string[] = [];
    if (hasMissing && p.missingDataEligible) reasons.push(SUGGESTION_PO_POS_MISSING_APY);
    if (hasLow && p.lowYieldEligible) reasons.push(SUGGESTION_PO_POS_LOW_YIELD);
    if (hasConcentration && p.concentrationEligible && gross > 0 && (p.recognizedValueUsd ?? 0) / gross >= POSITION_CONCENTRATION_THRESHOLD) reasons.push(SUGGESTION_PO_POS_CONCENTRATION);
    const g = groupForPosition(p.positionId);
    if (hasShared && g) reasons.push(SUGGESTION_PO_POS_SHARED);
    return { reasons, sharedLabel: g?.label };
  };

  const involvedPositions: ReviewPosition[] = assessment.flaggedPositions.map((p) => {
    const { reasons, sharedLabel } = positionReasons(p);
    const share = gross > 0 && p.recognizedValueUsd !== null ? round1Pct(p.recognizedValueUsd / gross) : undefined;
    return {
      protocol: p.protocolId ?? undefined,
      symbol: p.apy.yieldMethodology === "native_staking_apy" ? "SOL" : undefined,
      ...(p.recognizedValueUsd !== null ? { valueUsd: p.recognizedValueUsd } : {}),
      // Only expose a numeric APY when it is genuinely sourced; unverified/unsupported states carry a label, not a number.
      apy: p.apy.apyState === "sourced_fresh" || p.apy.apyState === "sourced_freshness_unverified" || p.apy.apyState === "sourced_stale" ? p.apy.apyValuePct : null,
      role: hasConcentration && reasons.includes(SUGGESTION_PO_POS_CONCENTRATION) ? "concentrated_position"
        : reasons.includes(SUGGESTION_PO_POS_SHARED) ? "duplicate_exposure_position"
        : reasons.includes(SUGGESTION_PO_POS_LOW_YIELD) ? "low_yield_position"
        : reasons.includes(SUGGESTION_PO_POS_MISSING_APY) ? "missing_apy_position"
        : p.positionType === "native_stake" ? "staked_position" : "yield_position",
      reason: reasons.join(", "),
      ...(share !== undefined ? { portfolioSharePct: share } : {}),
      apyDisplayState: APY_DISPLAY_STATE[p.apy.apyState],
      ...(LIFECYCLE_LABEL[p.lifecycleState] ? { lifecycleLabel: LIFECYCLE_LABEL[p.lifecycleState] } : {}),
      ...(sharedLabel ? { sharedExposureLabel: sharedLabel } : {}),
    };
  });

  // Trigger-family review reason (summary). Precedence: concentration → shared → low-yield → missing.
  const reason = hasConcentration ? SUGGESTION_PO_REASON_CONCENTRATION
    : hasShared ? SUGGESTION_PO_REASON_SHARED
    : hasLow ? SUGGESTION_PO_REASON_LOW_YIELD
    : SUGGESTION_PO_REASON_MISSING_APY;

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "position_value_threshold", status: "passed" },
    { code: "apy_data_review", status: hasMissing ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "concentration_review", status: hasConcentration ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "exposure_grouping", status: hasShared ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    // Yield COMPARISON is never marked evaluated when freshness/comparability is unresolved or unsupported.
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  // Counts for review metrics.
  const cp = assessment.canonicalPositions;
  const missingCount = assessment.flaggedPositions.filter((p) => hasMissing && p.missingDataEligible).length;
  const lowCount = assessment.flaggedPositions.filter((p) => hasLow && p.lowYieldEligible).length;
  const concentrationCount = assessment.flaggedPositions.filter((p) => positionReasons(p).reasons.includes(SUGGESTION_PO_POS_CONCENTRATION)).length;
  const sharedCombined = Math.round(assessment.sharedExposureGroups.reduce((s, g) => s + g.combinedValueUsd, 0) * 100) / 100;
  const freshnessUnverifiedCount = cp.filter((p) => p.apy.apyState === "sourced_freshness_unverified").length;
  const unsupportedCount = cp.filter((p) => p.apy.apyState === "unsupported").length;
  const lifecycleLimitedCount = cp.filter((p) => p.lifecycleState !== "active" && p.lifecycleState !== "not_applicable").length;

  const metrics = [
    usdMetric("Positions to review", total),
    metric("Distinct positions", assessment.flaggedPositions.length, "count"),
    metric("Share of gross assets", gross > 0 ? round1Pct(total / gross) : 0, "percent", "%"),
    ...(missingCount > 0 ? [metric("Positions with APY unavailable", missingCount, "count")] : []),
    ...(lowCount > 0 ? [metric("Positions with low sourced APY", lowCount, "count")] : []),
    ...(concentrationCount > 0 ? [metric("Concentrated positions", concentrationCount, "count")] : []),
    ...(hasShared ? [metric("Shared-underlying groups", assessment.sharedExposureGroups.length, "count"), usdMetric("Shared-underlying value", sharedCombined)] : []),
    ...(freshnessUnverifiedCount > 0 ? [metric("APY freshness unverified", freshnessUnverifiedCount, "count")] : []),
    ...(unsupportedCount > 0 ? [metric("Yield comparison unavailable", unsupportedCount, "count")] : []),
    ...(lifecycleLimitedCount > 0 ? [metric("Lifecycle-limited positions", lifecycleLimitedCount, "count")] : []),
  ];

  const calculations: ReviewCalculation[] = [
    { label: "Flagged positions vs gross assets", formula: "flagged value ÷ gross asset value", currentValue: total, targetValue: gross, difference: gross > 0 ? round1Pct(total / gross) : 0, unit: "USD" },
    ...assessment.flaggedPositions.filter((p) => positionReasons(p).reasons.includes(SUGGESTION_PO_POS_CONCENTRATION)).map((p) => ({ label: "Single-position concentration", formula: "position value ÷ gross asset value", currentValue: p.recognizedValueUsd ?? 0, targetValue: gross, threshold: round1Pct(POSITION_CONCENTRATION_THRESHOLD), difference: gross > 0 ? round1Pct((p.recognizedValueUsd ?? 0) / gross) : 0, unit: "USD" })),
    ...assessment.sharedExposureGroups.map((g) => ({ label: `Shared underlying exposure — ${g.label}`, formula: "combined value ÷ gross asset value", currentValue: g.combinedValueUsd, targetValue: gross, threshold: round1Pct(DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD), difference: g.portfolioShare !== null ? round1Pct(g.portfolioShare) : 0, unit: "USD" })),
  ];

  const additionalLimitations: ReviewLimitation[] = [];
  if (freshnessUnverifiedCount > 0) additionalLimitations.push({ kind: "apy_freshness_unverified", text: SUGGESTION_PO_LIMIT_FRESHNESS });
  if (unsupportedCount > 0) additionalLimitations.push({ kind: "yield_comparison_unavailable", text: SUGGESTION_PO_LIMIT_NO_COMPARISON });
  if (assessment.warnings.includes("exposure_group_unresolved")) additionalLimitations.push({ kind: "exposure_grouping_unresolved", text: SUGGESTION_PO_LIMIT_EXPOSURE });

  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "position_optimization",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    reason,
    metrics,
    involvedPositions,
    calculations,
    additionalLimitations,
  });

  return {
    id: POSITION_OPTIMIZATION_SUGGESTION_ID,
    category: "position_optimization",
    reason_codes,
    title_key: "suggestion.position_optimization.title",
    description_key: "suggestion.position_optimization.description",
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick
    amount: { valueUsd: total, label: "Positions to review" },
    protocolSelection,
    reviewDetails,
    // Scoring methodology unchanged; the denominator is now the AUTHORITATIVE gross-asset value.
    scores: {
      impact: gross > 0 ? Math.min(total / gross, 1) : 0,
      urgency: hasConcentration ? 0.45 : 0.35,
      efficiency: hasLow ? 0.6 : 0.5,
    },
    guardrails,
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
