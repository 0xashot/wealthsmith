/**
 * trimSuggestion — the canonical production Trim card mapper (Step 19C).
 *
 * `buildTrimCardFromAssessment` is the ONE authoritative Trim card builder. It renders the existing
 * `trim_long_tail_assets` review-only card from the canonical `TrimAssessment` (trimAssessment.ts): exact-mint
 * core exclusion, direct-wallet multi-account aggregation, an authoritative gross-asset denominator, and the
 * three unchanged trigger rules. It selects no token, adds no execution CTA, and introduces no route/quote/
 * transaction/signature behavior. Transferability is reported as a review limitation — never as proof an asset
 * can be sold, swapped, consolidated, or removed.
 *
 * The pre-canonical symbol-based rule was deleted in Step 19D — there is no legacy Trim calculation, no engine
 * fallback, and no Rebalance-copied completeness gate. Missing canonical override ⇒ no Trim candidate.
 */
import type { EngineSuggestion, SuggestionGuardrail, SuggestionReasonCode, ReviewAsset } from "./engineTypes";
import type { ReviewLimitation } from "./engineTypes";
import { SUGGESTION_ENGINE_VERSION, MIN_TRIM_SUGGESTION_USD, TRIM_PORTFOLIO_SHARE_THRESHOLD, GUARDRAIL_STATUS_NOT_EVALUATED } from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, pctMetric, metric } from "./suggestionReviewDetails";
import type { TrimAssessment } from "./trimAssessment";
import { TOKEN_REGISTRY } from "../wallet/walletPosition";
import {
  SUGGESTION_TRIM_REASON_AGGREGATE, SUGGESTION_TRIM_REASON_CONCENTRATION, SUGGESTION_TRIM_REASON_SMALL,
  SUGGESTION_TRIM_EXPLAIN_AGGREGATE, SUGGESTION_TRIM_EXPLAIN_CONCENTRATION, SUGGESTION_TRIM_EXPLAIN_SMALL,
  SUGGESTION_TRIM_LIMIT_TRANSFER_UNAVAILABLE, SUGGESTION_TRIM_LIMIT_TRANSFER_UNRESOLVED, SUGGESTION_TRIM_LIMIT_TRANSFER_BOTH,
} from "../state/approvedCopy";

/** Stable suggestion ID (unchanged; IDs must not change across runs/copy updates). */
export const TRIM_SUGGESTION_ID = "trim_long_tail_assets";

const round1Pct = (fraction: number): number => Math.round(fraction * 1000) / 10;

/**
 * Build the canonical `trim_long_tail_assets` card from a TrimAssessment. Returns null unless overall readiness
 * is allowed, at least one trigger is proven, the total candidate value meets the minimum, the denominator is
 * authoritative, and candidate holdings are non-empty. NEVER falls back to the legacy symbol-based rule.
 */
export function buildTrimCardFromAssessment(assessment: TrimAssessment, generatedAt: number): EngineSuggestion | null {
  if (assessment.overallReadiness.status !== "allowed") return null;
  const hasAggregate = assessment.triggerStates.aggregateLongTail === "triggered";
  const hasConcentration = assessment.triggerStates.singleTokenConcentration === "triggered";
  const hasSmall = assessment.triggerStates.smallPositionCleanup === "triggered";
  if (!hasAggregate && !hasConcentration && !hasSmall) return null;
  if (assessment.totalCandidateValueUsd < MIN_TRIM_SUGGESTION_USD) return null;
  if (!(assessment.denominatorValueUsd > 0)) return null;
  if (assessment.candidateHoldings.length === 0) return null;

  const denom = assessment.denominatorValueUsd;
  const total = assessment.totalCandidateValueUsd;
  const share = assessment.candidatePortfolioShare ?? 0; // fraction of gross assets
  const concentratedCount = assessment.concentratedCandidateIds.length;
  const smallCount = assessment.smallCandidateIds.length;
  const ts = assessment.transferabilitySummary;

  // Reason codes — canonical ordering, mapped to the existing engine union (transferability warnings live in
  // review limitations, not reason codes). Deterministic + deduped.
  const reason_codes: SuggestionReasonCode[] = [];
  if (hasAggregate) reason_codes.push("long_tail_exposure");
  if (hasConcentration) reason_codes.push("token_concentration_review");
  if (hasSmall) reason_codes.push("small_position_cleanup");
  reason_codes.push("non_core_token_exposure");
  reason_codes.push("liquidity_not_evaluated");

  // Review-oriented summary reason (never an instruction). Precedence: concentration → aggregate → small.
  const reason = hasConcentration ? SUGGESTION_TRIM_REASON_CONCENTRATION : hasAggregate ? SUGGESTION_TRIM_REASON_AGGREGATE : SUGGESTION_TRIM_REASON_SMALL;

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "token_scope", status: "passed" },
    { code: "concentration_review", status: hasConcentration ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "token_selection", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  // Involved assets — canonical order; USER-SAFE fields only (no raw balance / accounts / dedupe keys). Multiple
  // accounts of one mint already appear as one holding. Actionability/reason are review context, never a CTA.
  const involvedAssets: ReviewAsset[] = assessment.candidateHoldings.map((h) => {
    const isConc = assessment.concentratedCandidateIds.includes(h.holdingId);
    const isSmall = assessment.smallCandidateIds.includes(h.holdingId);
    const holdingShare = denom > 0 && h.recognizedValueUsd !== null ? round1Pct(h.recognizedValueUsd / denom) : undefined;
    return {
      symbol: h.symbol,
      name: h.name,
      ...(h.recognizedValueUsd !== null ? { valueUsd: h.recognizedValueUsd } : {}),
      ...(h.uiAmount !== null ? { amount: h.uiAmount } : {}),
      role: "long_tail_asset" as const,
      // Portfolio-style identity: read-only Solscan link by mint + approved token icon when one exists.
      ...(h.mint ? { mint: h.mint } : {}),
      ...(h.mint && TOKEN_REGISTRY[h.mint]?.icon ? { icon: TOKEN_REGISTRY[h.mint]!.icon as string } : {}),
      ...(holdingShare !== undefined ? { portfolioSharePct: holdingShare } : {}),
      actionability: h.actionabilityState === "unavailable" ? "unavailable" : h.actionabilityState === "unresolved" ? "unresolved" : "transferable",
      reasonCategory: isConc ? "concentrated" : isSmall ? "small_position" : "part_of_aggregate_exposure",
    };
  });

  // Transferability limitation (review-only; never implies actionability). One concise combined line when both.
  const additionalLimitations: ReviewLimitation[] = [];
  const anyUnavailable = ts.unavailableTransferabilityCandidateValueUsd > 0;
  const anyUnresolved = ts.unresolvedTransferabilityCandidateValueUsd > 0;
  if (anyUnavailable && anyUnresolved) additionalLimitations.push({ kind: "transferability_limited", text: SUGGESTION_TRIM_LIMIT_TRANSFER_BOTH });
  else if (anyUnavailable) additionalLimitations.push({ kind: "transferability_unavailable", text: SUGGESTION_TRIM_LIMIT_TRANSFER_UNAVAILABLE });
  else if (anyUnresolved) additionalLimitations.push({ kind: "transferability_unresolved", text: SUGGESTION_TRIM_LIMIT_TRANSFER_UNRESOLVED });

  const metrics = [
    usdMetric("Non-core value to review", total),
    metric("Number of non-core assets", assessment.candidateHoldings.length, "count"),
    pctMetric("Portfolio share", round1Pct(share)),
    metric("Concentrated positions", concentratedCount, "count"),
    metric("Small positions", smallCount, "count"),
    usdMetric("Transferable value", ts.transferableCandidateValueUsd),
    ...(anyUnavailable ? [usdMetric("Not currently transferable", ts.unavailableTransferabilityCandidateValueUsd)] : []),
    ...(anyUnresolved ? [usdMetric("Transferability unverified", ts.unresolvedTransferabilityCandidateValueUsd)] : []),
  ];

  const calculations = [
    { label: "Non-core share of gross assets", formula: "non-core value ÷ gross asset value", currentValue: total, targetValue: denom, threshold: round1Pct(TRIM_PORTFOLIO_SHARE_THRESHOLD), difference: round1Pct(share), unit: "USD" },
    ...(hasAggregate ? [{ label: "Aggregate exposure", formula: SUGGESTION_TRIM_EXPLAIN_AGGREGATE, currentValue: total, targetValue: denom, unit: "USD" }] : []),
    ...(hasConcentration ? [{ label: "Concentration review", formula: SUGGESTION_TRIM_EXPLAIN_CONCENTRATION, currentValue: concentratedCount, unit: "count" }] : []),
    ...(hasSmall ? [{ label: "Small positions", formula: SUGGESTION_TRIM_EXPLAIN_SMALL, currentValue: smallCount, targetValue: assessment.smallCandidateCombinedValueUsd, unit: "count" }] : []),
  ];

  // 23C.2 — direct card line. Exact single-asset form when only one non-core asset is in scope; otherwise the
  // generic "assets" form. Destination is USDC (the Trim destination). Read-only: the CTA stays "Review".
  const trimAmountUsd = Math.round(total).toLocaleString("en-US");
  const trimImpactText = assessment.candidateHoldings.length === 1
    ? `Swap $${trimAmountUsd} of ${assessment.candidateHoldings[0].symbol} to USDC`
    : `Swap $${trimAmountUsd} of assets to USDC`;

  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "trim",
    actionKind: "review_only",
    title: "Reduce Long-Tail Assets", // 23C.2 — keep the modal title identical to the card
    guardrails,
    protocolSelection,
    reason,
    metrics,
    involvedAssets,
    calculations,
    additionalLimitations,
  });

  return {
    id: TRIM_SUGGESTION_ID,
    category: "trim",
    reason_codes,
    title_key: "suggestion.trim.title",
    titleOverride: "Reduce Long-Tail Assets",
    description_key: "suggestion.trim.description",
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick
    amount: { valueUsd: total, label: "Assets to review" },
    impactTextOverride: trimImpactText,
    protocolSelection,
    reviewDetails,
    // Scoring methodology unchanged; the denominator is now the AUTHORITATIVE gross-asset value (not the legacy
    // partial total). Urgency precedence: concentration → aggregate → small-only.
    scores: {
      impact: Math.min(total / denom, 1),
      urgency: hasConcentration ? 0.45 : hasAggregate ? 0.35 : 0.25,
      efficiency: 0.45,
    },
    guardrails,
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
