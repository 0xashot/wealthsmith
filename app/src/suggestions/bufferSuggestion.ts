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
import { SUGGESTION_BUFFER_SHORTFALL_DETAIL, SUGGESTION_BUFFER_RANGE_DETAIL, SUGGESTION_BUFFER_NEARTARGET_DETAIL, SUGGESTION_BUFFER_NEARLY_FUNDED_DETAIL, SUGGESTION_BUFFER_PLAN_DETAIL, SUGGESTION_BUFFER_PLAN_PARTIAL_DETAIL, SUGGESTION_BUFFER_FROZEN_DETAIL, SUGGESTION_BUFFER_FROZEN_ONE, SUGGESTION_BUFFER_FROZEN_MANY } from "../state/approvedCopy";
import type { ReviewExcludedAsset } from "./engineTypes";

/** Approved token icon for a known stablecoin symbol (excluded-holding table); undefined → neutral fallback. */
const STABLE_ICON: Record<string, string> = { USDC: "assets/icons/token/usdc.svg", USDT: "assets/icons/token/usdt.svg" };

/** Stable suggestion ID (IDs must not change across runs/copy/state updates). */
export const BUFFER_SUGGESTION_ID = "top_up_buffer";

const round1 = (n: number): number => Math.round(n * 10) / 10;
/** Whole-dollar display, matching the card mapper's `usd0` so the card-face sentence reads identically. */
const usd0 = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
/** USD keeping cents only when present (e.g. 49.99 → "$49.99", 50 → "$50") — for the exact below-minimum gap. */
const usd2 = (n: number): string => Number.isInteger(n) ? usd0(n) : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** "{n} month" / "{n} months" (n rounded to 1dp; e.g. 4 → "4 months", 1 → "1 month"). */
const monthsPhrase = (n: number): string => { const v = round1(n); return `${v} month${v === 1 ? "" : "s"}`; };
/** Precise months for the "Current coverage" card (up to 2dp, trailing zeros dropped; e.g. 2.95 → "2.95", 4 → "4"). */
const months2 = (n: number): string => String(Number(n.toFixed(2)));
/**
 * READ-ONLY external handoff for topping up the Safety Buffer: a fiat on-ramp to buy USDC. Rendered as the modal's
 * sticky-footer primary button (opens MoonPay's own page in a new tab). WealthSmith never auto-opens it, buys, moves
 * funds, or requests a signature — the user chooses to continue on MoonPay.
 */
const BUFFER_MOONPAY_LINK = { label: "Buy USDC on Moonpay", ctaLabel: "Buy USDC on Moonpay", url: "https://www.moonpay.com/buy/usdc", opensInNewTab: true } as const;

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

  // ---- Detected unvetted USDC lending position → the SPECIFIC "Review Your Safety Buffer USDC" card + move modal. ----
  // Present ONLY when the engine confidently identified the position + an approved destination (else null → the generic
  // states below). The USDC is already EXCLUDED from coverage upstream; this card never counts, moves, or signs, and it
  // never calls the position unsafe — it states only that the position has not yet passed WealthSmith's vetting.
  if (a.bufferPositionReview) {
    const r = a.bufferPositionReview;
    const detected = r.amountDisplay != null ? r.amountDisplay : r.token; // "2,000 USDC" or "USDC"
    const cardDescription =
      `We found ${detected} in ${r.product} on ${r.protocol}. This lending position has not yet passed ` +
      `WealthSmith's vetting for Safety Buffer use, so we do not currently count it toward your buffer.`;
    const modalIntro =
      `Your ${detected} is currently deposited in ${r.product} on ${r.protocol}. This position has not yet ` +
      `passed WealthSmith's vetting for Safety Buffer use and is not currently included in your available buffer. ` +
      `Move the funds to ${r.token} lending in ${r.approvedDestination}, which is currently approved for your Safety Buffer.`;
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
    // Focused 4-card set (no "Key metrics" heading, no Guardrails): the verified-only gap the excluded position leaves
    // open, current verified reserve, target, and current coverage. The excluded position itself is broken out below.
    const hasMonths = a.targetMonths != null && a.monthsCoveredVerified != null;
    const coverageCard = hasMonths ? [metric("Current coverage", `${months2(a.monthsCoveredVerified as number)} of ${months2(a.targetMonths as number)} months`, "count")] : [];
    const metrics: ReviewMetric[] = [
      usdMetric("Amount needed", worst),
      usdMetric("Current", verified ?? 0),
      ...(target != null ? [usdMetric("Target", target)] : []),
      ...coverageCard,
    ];
    // "Excluded from Safety Buffer" table — the detected-but-not-counted position (Asset / Amount / Value / Reason).
    const excludedReviewAssets: ReviewExcludedAsset[] = [{
      symbol: r.token,
      ...(r.uiAmount != null ? { amount: r.uiAmount } : {}),
      ...(r.valueUsd != null ? { valueUsd: r.valueUsd } : {}),
      reason: "Unvetted",
      ...(STABLE_ICON[r.token] ? { icon: STABLE_ICON[r.token] } : {}),
    }];
    return {
      ...base,
      reason_codes: ["buffer_low", "buffer_position_not_vetted"],
      title_key: "suggestion.buffer.title",
      description_key: "suggestion.buffer.description",
      titleOverride: "Review Your Safety Buffer USDC",
      descriptionOverride: cardDescription,
      action_kind: "review_only",
      is_actionable: true,
      to: { bucket: "stables" },
      post_buffer_months: a.targetMonths ?? undefined,
      scores: { impact: 0, urgency: 0, efficiency: null },
      guardrails,
      reviewDetails: buildReviewDetails({
        category: "buffer",
        actionKind: "review_only",
        guardrails,
        protocolSelection: base.protocolSelection,
        title: "Move Your Safety Buffer USDC",
        reason: modalIntro,
        metrics,
        hideMetricsHeading: true,
        hideGuardrails: true,
        excludedAssets: excludedReviewAssets,
        externalLink: {
          label: r.approvedDestination,
          ctaLabel: `Move to ${r.approvedDestination}`,
          url: r.destinationUrl,
          opensInNewTab: true,
          secondaryLabel: "Cancel",
        },
      }),
    };
  }

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
    // Numbers-rich body + focused metric set for a CLEAN shortfall (no covering plan). Two shapes: a definite
    // shortfall (no unresolved value) and a range (some stablecoin value still being verified). Both spell out the
    // real numbers on the card AND modal, drop the "Key metrics" heading, and hide the Guardrails checklist.
    const hasMonths = a.targetMonths != null && a.monthsCoveredVerified != null;
    const coverageCard = hasMonths ? [metric("Current coverage", `${months2(a.monthsCoveredVerified as number)} of ${months2(a.targetMonths as number)} months`, "count")] : [];
    let detailedBody: string | undefined;
    let focusedMetrics: ReviewMetric[] | undefined;
    let bufferTitleOverride: string | undefined;
    let excludedReviewAssets: ReviewExcludedAsset[] | undefined;
    const frozenHoldings = a.excludedStableHoldings ?? [];
    // A next planned contribution that FULLY covers the confirmed gap → "Complete Your Safety Buffer" (direct the
    // contribution to USDC). Only when the plan actually closes the gap (partial plans keep the general copy).
    const planFullyCovers = planReady && a.contribution.plannedContributionUsd != null &&
      (a.contribution.remainingProvenShortfallAfterPlanUsd === 0 || (a.contribution.plannedContributionUsd as number) >= proven);
    if (planFullyCovers && verified != null && target != null && hasMonths) {
      bufferTitleOverride = "Complete Your Safety Buffer";
      detailedBody = SUGGESTION_BUFFER_PLAN_DETAIL.replace("{shortfall}", usd0(proven));
      focusedMetrics = [usdMetric("Amount needed", proven), usdMetric("Current", verified), usdMetric("Target", target), ...coverageCard, usdMetric("Next planned contribution", a.contribution.plannedContributionUsd as number)];
    } else if (planReady && a.contribution.plannedContributionUsd != null && verified != null && target != null && hasMonths) {
      // Plan-backed PARTIAL: the next contribution reduces but does NOT close the confirmed gap. Primary amount stays
      // the confirmed gap; direct the contribution to USDC and note the remainder still needs adding afterward.
      detailedBody = SUGGESTION_BUFFER_PLAN_PARTIAL_DETAIL.replace("{shortfall}", usd0(proven));
      focusedMetrics = [usdMetric("Amount needed", proven), usdMetric("Current", verified), usdMetric("Target", target), ...coverageCard, usdMetric("Next planned contribution", a.contribution.plannedContributionUsd as number)];
    } else if (!planReady && verified != null && target != null && hasMonths) {
      if (!isRange && frozenHoldings.length > 0) {
        // A frozen (not transferable) stablecoin is excluded from the eligible reserve → name the eligible amount and
        // the excluded holding(s), and surface them in an "Excluded from Safety Buffer" table.
        const frozenClause = frozenHoldings.length === 1 ? SUGGESTION_BUFFER_FROZEN_ONE : SUGGESTION_BUFFER_FROZEN_MANY.replace("{n}", String(frozenHoldings.length));
        detailedBody = SUGGESTION_BUFFER_FROZEN_DETAIL
          .replace("{verified}", usd0(verified))
          .replace("{frozenClause}", frozenClause)
          .replace("{shortfall}", usd0(proven))
          .replace("{target}", usd0(target));
        focusedMetrics = [usdMetric("Amount needed", proven), usdMetric("Current", verified), usdMetric("Target", target), ...coverageCard];
        excludedReviewAssets = frozenHoldings.map((h) => ({ symbol: h.symbol, ...(h.uiAmount != null ? { amount: h.uiAmount } : {}), ...(h.valueUsd != null ? { valueUsd: h.valueUsd } : {}), reason: h.reason, ...(STABLE_ICON[h.symbol] ? { icon: STABLE_ICON[h.symbol] } : {}) }));
      } else if (!isRange) {
        // When the covered months round to the target months (e.g. 2.95 → "3" vs target "3"), the "cover N months /
        // target N months" phrasing reads as funded — state the gap directly instead.
        detailedBody = monthsPhrase(a.monthsCoveredVerified as number) === monthsPhrase(a.targetMonths as number)
          ? SUGGESTION_BUFFER_NEARTARGET_DETAIL.replace(/\{shortfall\}/g, usd0(proven)).replace("{months}", months2(a.targetMonths as number))
          : SUGGESTION_BUFFER_SHORTFALL_DETAIL
              .replace("{current}", usd0(verified))
              .replace("{covered}", monthsPhrase(a.monthsCoveredVerified as number))
              .replace("{target}", usd0(target))
              .replace("{targetMonths}", monthsPhrase(a.targetMonths as number))
              .replace("{shortfall}", usd0(proven));
        focusedMetrics = [usdMetric("Amount needed", proven), usdMetric("Current", verified), usdMetric("Target", target), ...coverageCard];
      } else if (a.maximumPossibleCoverageUsd != null) {
        const beingVerified = a.maximumPossibleCoverageUsd - verified;
        const additional = worst - proven;
        detailedBody = SUGGESTION_BUFFER_RANGE_DETAIL
          .replace("{current}", usd0(verified))
          .replace("{beingVerified}", usd0(beingVerified))
          .replace("{target}", usd0(target))
          .replace("{shortfall}", usd0(proven))
          .replace("{additional}", usd0(additional));
        focusedMetrics = [usdMetric("Amount needed", proven), usdMetric("Current", verified), usdMetric("Being verified", beingVerified), usdMetric("Target", target), ...coverageCard];
      }
    }
    const metrics: ReviewMetric[] = focusedMetrics ?? [
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
    const reason_codes: SuggestionReasonCode[] = ["buffer_low", "buffer_shortfall_confirmed"];
    return {
      ...base,
      reason_codes,
      title_key: "suggestion.buffer.title",
      ...(bufferTitleOverride ? { titleOverride: bufferTitleOverride } : {}),
      description_key: planReady ? "suggestion.buffer.plan.description" : isRange ? "suggestion.buffer.range.description" : "suggestion.buffer.description",
      ...(detailedBody ? { descriptionOverride: detailedBody } : {}),
      action_kind: "review_only",
      is_actionable: true,
      amount: { valueUsd: proven, label: isRange ? "Minimum amount needed" : "Amount needed" },
      impactTextOverride: isRange ? `Add at least ${usd0(proven)} to your Safety Buffer.` : `Add ${usd0(proven)} to your Safety Buffer.`,
      to: { bucket: "stables" },
      post_buffer_months: a.targetMonths ?? undefined,
      scores: { impact: score, urgency: score, efficiency: null },
      guardrails,
      reviewDetails: buildReviewDetails({ category: "buffer", actionKind: "review_only", ...(detailedBody ? { reason: detailedBody, hideMetricsHeading: true, hideGuardrails: true } : {}), ...(excludedReviewAssets ? { excludedAssets: excludedReviewAssets } : {}), guardrails, protocolSelection: base.protocolSelection, metrics, externalLink: BUFFER_MOONPAY_LINK }),
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
      descriptionOverride: SUGGESTION_BUFFER_NEARLY_FUNDED_DETAIL.replace("{shortfall}", usd2(proven)),
      impactTextOverride: `${usd2(proven)} remaining`,
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
