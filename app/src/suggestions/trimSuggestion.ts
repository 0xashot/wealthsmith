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
import { SUGGESTION_ENGINE_VERSION, MIN_TRIM_SUGGESTION_USD, GUARDRAIL_STATUS_NOT_EVALUATED } from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails } from "./suggestionReviewDetails";
import type { TrimAssessment } from "./trimAssessment";
import { TOKEN_REGISTRY } from "../wallet/walletPosition";
import {
  SUGGESTION_TRIM_SINGLE_DESCRIPTION, SUGGESTION_TRIM_FROZEN_SINGLE_DESCRIPTION, SUGGESTION_TRIM_MULTI_DESCRIPTION, SUGGESTION_TRIM_SMALL_DESCRIPTION, SUGGESTION_TRIM_ALLTHREE_DESCRIPTION,
  SUGGESTION_TRIM_LIMIT_TRANSFER_UNAVAILABLE, SUGGESTION_TRIM_LIMIT_TRANSFER_UNRESOLVED, SUGGESTION_TRIM_LIMIT_TRANSFER_BOTH,
} from "../state/approvedCopy";

/** Stable suggestion ID (unchanged; IDs must not change across runs/copy updates). */
export const TRIM_SUGGESTION_ID = "trim_long_tail_assets";

const round1Pct = (fraction: number): number => Math.round(fraction * 1000) / 10;

/** Spell out small counts ("three small positions"); fall back to digits beyond the table. */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const countWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);
const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

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
  const ts = assessment.transferabilitySummary;

  // Reason codes — canonical ordering, mapped to the existing engine union (transferability warnings live in
  // review limitations, not reason codes). Deterministic + deduped.
  const reason_codes: SuggestionReasonCode[] = [];
  if (hasAggregate) reason_codes.push("long_tail_exposure");
  if (hasConcentration) reason_codes.push("token_concentration_review");
  if (hasSmall) reason_codes.push("small_position_cleanup");
  reason_codes.push("non_core_token_exposure");
  reason_codes.push("liquidity_not_evaluated");

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
      ...(h.mint && TOKEN_REGISTRY[h.mint]?.icon ? { icon: TOKEN_REGISTRY[h.mint]!.icon as string } : h.iconUrl ? { iconUrl: h.iconUrl } : {}),
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

  // 23C.2 — direct card line. Exact single-asset form when only one non-core asset is in scope; otherwise the
  // generic "assets" form. Destination is USDC (the Trim destination). Read-only: the CTA stays "Review".
  const trimAmountUsd = Math.round(total).toLocaleString("en-US");
  const isSingle = assessment.candidateHoldings.length === 1;
  // A single frozen / non-transferable asset can't be swapped — never surface a "Swap … to USDC" action for it; the
  // card action + modal handoff point to Solscan instead, and the read-only Swap Route section is suppressed.
  const singleFrozen = isSingle && involvedAssets[0]?.actionability === "unavailable";
  const solscanTokenUrl = assessment.candidateHoldings[0]?.mint ? `https://solscan.io/token/${assessment.candidateHoldings[0].mint}` : undefined;
  const trimImpactText = singleFrozen
    ? `Check ${assessment.candidateHoldings[0].symbol} on Solscan`
    : isSingle
      ? `Swap $${trimAmountUsd} of ${assessment.candidateHoldings[0].symbol} to USDC`
      : `Swap $${trimAmountUsd} of assets to USDC`;
  // Card + modal heading names the single asset's exposure; the multi-asset form is generic non-core exposure.
  const trimTitle = isSingle ? `Reduce ${assessment.candidateHoldings[0].symbol} exposure` : "Reduce Non-Core Exposure";

  // 24J — plain-language card/modal body. Single non-core asset names it + its portfolio share; a pure small-position
  // cleanup (below the aggregate-share threshold) is framed as simplification; otherwise the aggregate-share form.
  const shareText = String(round1Pct(share));
  const smallIds = assessment.smallCandidateIds;
  const concIds = assessment.concentratedCandidateIds;
  const isSmallOnly = hasSmall && !hasAggregate && !hasConcentration;
  // All three triggers with exactly one concentrated leader and the remaining candidates all small → a decomposed
  // "leader + smaller positions" body. Requires a clean split (leader + smalls cover every candidate) to stay honest.
  const concHolding = concIds.length === 1 ? assessment.candidateHoldings.find((h) => h.holdingId === concIds[0]) : undefined;
  const isAllThree = hasAggregate && hasConcentration && hasSmall && concHolding != null && !smallIds.includes(concHolding.holdingId) && 1 + smallIds.length === assessment.candidateHoldings.length;
  let descriptionOverride: string;
  if (singleFrozen) {
    descriptionOverride = SUGGESTION_TRIM_FROZEN_SINGLE_DESCRIPTION.replace("{asset}", assessment.candidateHoldings[0].symbol).replace("{share}", shareText);
  } else if (isSingle) {
    descriptionOverride = SUGGESTION_TRIM_SINGLE_DESCRIPTION.replace("{asset}", assessment.candidateHoldings[0].symbol).replace("{share}", shareText).replace("{amount}", trimAmountUsd);
  } else if (isAllThree) {
    const concShare = denom > 0 && concHolding!.recognizedValueUsd !== null ? round1Pct(concHolding!.recognizedValueUsd / denom) : 0;
    const smallShare = denom > 0 ? round1Pct(assessment.smallCandidateCombinedValueUsd / denom) : 0;
    descriptionOverride = SUGGESTION_TRIM_ALLTHREE_DESCRIPTION
      .replace("{count}", capitalize(countWord(assessment.candidateHoldings.length)))
      .replace("{aggShare}", shareText)
      .replace("{concAsset}", concHolding!.symbol)
      .replace("{concShare}", String(concShare))
      .replace("{smallCount}", countWord(smallIds.length))
      .replace("{smallShare}", String(smallShare));
  } else if (isSmallOnly) {
    descriptionOverride = SUGGESTION_TRIM_SMALL_DESCRIPTION.replace("{count}", countWord(smallIds.length)).replace("{amount}", trimAmountUsd);
  } else {
    descriptionOverride = SUGGESTION_TRIM_MULTI_DESCRIPTION.replace("{share}", shareText).replace("{amount}", trimAmountUsd);
  }

  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "trim",
    actionKind: "review_only",
    title: trimTitle, // keep the modal title identical to the card
    guardrails,
    protocolSelection,
    // 24J — same plain-language body on the card and in the modal; no Key metrics / Guardrails / calculations.
    reason: descriptionOverride,
    metrics: [],
    hideGuardrails: true,
    // A frozen / non-transferable asset can't be swapped → suppress the Swap Route section and offer a read-only
    // "Check on Solscan" handoff instead of a swap CTA.
    ...(singleFrozen ? { hideSwapRoute: true } : {}),
    ...(singleFrozen && solscanTokenUrl ? { externalLink: { label: "Solscan", ctaLabel: "Check on Solscan", url: solscanTokenUrl, opensInNewTab: true, secondaryLabel: "Cancel" } } : {}),
    involvedAssets,
    additionalLimitations,
  });

  return {
    id: TRIM_SUGGESTION_ID,
    category: "trim",
    reason_codes,
    title_key: "suggestion.trim.title",
    titleOverride: trimTitle,
    description_key: "suggestion.trim.description",
    descriptionOverride,
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
