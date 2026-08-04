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
import { getProtocolCandidateById } from "./protocolRegistry";
import { lookupMint } from "../wallet/walletPosition";
import { buildDismissalSignature } from "../state/dismissedSuggestions";
import { buildReviewDetails, usdMetric, metric } from "./suggestionReviewDetails";
import type { PositionOptimizationAssessment, PositionOptimizationPosition, PoApyState, PoLifecycle } from "./positionOptimizationAssessment";
import {
  SUGGESTION_PO_REASON_MISSING_APY, SUGGESTION_PO_REASON_LOW_YIELD, SUGGESTION_PO_REASON_CONCENTRATION, SUGGESTION_PO_REASON_SHARED,
  SUGGESTION_PO_POS_MISSING_APY, SUGGESTION_PO_POS_LOW_YIELD, SUGGESTION_PO_POS_CONCENTRATION, SUGGESTION_PO_POS_SHARED,
  SUGGESTION_PO_APY_FRESHNESS_UNVERIFIED, SUGGESTION_PO_APY_UNAVAILABLE, SUGGESTION_PO_APY_STALE, SUGGESTION_PO_APY_NO_COMPARISON,
  SUGGESTION_PO_APY_NOT_APPLICABLE, SUGGESTION_PO_APY_UNRESOLVED,
  SUGGESTION_PO_LIMIT_FRESHNESS, SUGGESTION_PO_LIMIT_NO_COMPARISON, SUGGESTION_PO_LIMIT_EXPOSURE,
  SUGGESTION_PO_NAMED_TITLE, SUGGESTION_PO_NAMED_IMPACT, SUGGESTION_PO_MULTI_IMPACT,
  SUGGESTION_PO_NAMED_CONCENTRATION, SUGGESTION_PO_NAMED_LOW_YIELD, SUGGESTION_PO_NAMED_MISSING_APY, SUGGESTION_PO_NAMED_SHARED,
  SUGGESTION_PO_NAMED_CONCENTRATION_DETAIL, SUGGESTION_PO_CONCENTRATION_MISSING,
  SUGGESTION_PO_LOW_TITLE, SUGGESTION_PO_LOW_IMPACT, SUGGESTION_PO_LOW_DESCRIPTION,
  SUGGESTION_PO_SHARED_TITLE, SUGGESTION_PO_SHARED_DESCRIPTION, SUGGESTION_PO_SHARED_IMPACT,
  SUGGESTION_PO_MULTI_LEAD, SUGGESTION_PO_MULTI_CONC, SUGGESTION_PO_MULTI_CONC_APY, SUGGESTION_PO_MULTI_REVIEW,
  SUGGESTION_PO_MULTI_YIELD_MISSING, SUGGESTION_PO_MULTI_YIELD_LOW,
} from "../state/approvedCopy";

/** Stable suggestion ID (unchanged; IDs must not change across runs/copy updates). */
export const POSITION_OPTIMIZATION_SUGGESTION_ID = "position_optimization_review";

const round1Pct = (fraction: number): number => Math.round(fraction * 1000) / 10;

/** Canonical wrapped-SOL mint — the closest read-only token page for a native SOL staking position (no SPL mint). */
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

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

  // The SHARE denominator: wallet gross + measurement-only external holdings —
  // shares, the concentration reason, scores, and the dismissal signature all use
  // this one value so the copy and the trigger can never disagree.
  const gross = assessment.measuredGrossAssetValueUsd;
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

  // The HELD asset symbol behind a position, resolved from its primary exposure mint via the approved token
  // registry (never a symbol guess). Native stake → "SOL"; unresolvable → undefined (callers fall back).
  const heldAssetSymbol = (p: PositionOptimizationPosition): string | undefined => {
    const m = p.exposures.find((e) => e.mint)?.mint ?? null;
    return (m ? lookupMint(m)?.symbol : undefined) ?? (p.positionType === "native_stake" ? "SOL" : undefined);
  };

  const involvedPositions: ReviewPosition[] = assessment.flaggedPositions.map((p) => {
    const { reasons, sharedLabel } = positionReasons(p);
    const share = gross > 0 && p.recognizedValueUsd !== null ? round1Pct(p.recognizedValueUsd / gross) : undefined;
    // Held asset for the "Position details" table — resolved from the position's primary exposure mint via the
    // approved token registry (never a symbol guess). Native stake resolves to SOL; a mint-less/unresolvable
    // exposure falls back to the protocol name with no Solscan link. Read-only identity only.
    const exposureMint = p.exposures.find((e) => e.mint)?.mint ?? null;
    const assetInfo = exposureMint ? lookupMint(exposureMint) : undefined;
    // Read-only protocol identity + review link. Fail closed: only a known registry entry with an approved manage
    // URL — never an invented link, never a transaction/signature. Registry ids are lowercase; a position's
    // protocolId may be the display name ("Kamino"), and an LST's staking protocol comes from its mint (mSOL →
    // Marinade), so resolve from protocolId ?? the LST's registered protocol, case-normalized.
    const protocolLookupId = (p.protocolId ?? (p.positionType === "lst" ? assetInfo?.protocol : undefined))?.toLowerCase();
    const registryEntry = protocolLookupId ? getProtocolCandidateById(protocolLookupId) : undefined;
    // Manage → the approved protocol page (registry) or, for a native stake position, its detection-time validator
    // page (public vote account). Never a token/mint page (that's the Asset link) and never a user stake account.
    const reviewLink = registryEntry?.manageUrl
      ? { label: registryEntry.name, url: registryEntry.manageUrl, opensInNewTab: true }
      : p.manageUrl
        ? { label: p.protocolId ?? "your validator", url: p.manageUrl, opensInNewTab: true }
        : undefined;
    const assetSymbol = heldAssetSymbol(p) ?? registryEntry?.name;
    const assetIconPath = assetInfo?.icon ?? (p.positionType === "native_stake" ? "assets/icons/token/sol.svg" : undefined);
    // The ASSET name links to the token's read-only Solscan page (a canonical, PUBLIC token mint — never wallet /
    // account / obligation / stake-account identity), exactly like the Trim / Staking involved-asset tables. Native
    // SOL staking has no SPL mint, so it links to the canonical wrapped-SOL token page. Manage (below) stays on the
    // protocol page. Positions with no resolvable token mint show the asset name unlinked.
    const assetMint = exposureMint ?? (p.positionType === "native_stake" ? WRAPPED_SOL_MINT : null);
    const assetUrl = assetMint ? `https://solscan.io/token/${assetMint}` : undefined;
    return {
      protocol: p.protocolId ?? undefined,
      ...(p.protocolId ? { iconPath: `assets/icons/protocol/${p.protocolId}.svg` } : {}),
      ...(reviewLink ? { reviewLink } : {}),
      ...(assetSymbol ? { assetSymbol } : {}),
      ...(assetIconPath ? { assetIconPath } : {}),
      ...(assetUrl ? { assetUrl } : {}),
      ...(p.venueLabel ? { assetVenue: p.venueLabel } : {}),
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

  // Position-specific card copy: when exactly ONE position is flagged and its protocol has a known display
  // name, name it directly (e.g. "Review Your Jito Position" / "Your Jito position represents 60%…" / "Review
  // $1,500 in Jito"). Otherwise fall back to the generic title/description with a clearer "across N positions"
  // action line. All values (protocol name, share, amount, count) come from the assessment — never invented.
  const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  const singlePosition = assessment.flaggedPositions.length === 1 ? assessment.flaggedPositions[0] : null;
  const singleName = singlePosition
    ? (singlePosition.protocolId ? getProtocolCandidateById(singlePosition.protocolId)?.name : undefined)
      ?? (singlePosition.positionType === "native_stake" ? "SOL staking" : undefined)
    : undefined;

  let titleOverride: string | undefined;
  let descriptionOverride: string | undefined;
  let impactTextOverride: string | undefined;
  // The modal body (reason) shows the full numbers behind the flag; the card body (descriptionOverride) stays short.
  let modalReason: string | undefined;
  if (singlePosition && singleName) {
    const sharePct = gross > 0 && singlePosition.recognizedValueUsd !== null ? round1Pct(singlePosition.recognizedValueUsd / gross) : null;
    // The action line names the HELD ASSET (e.g. "Review $1,500 in JitoSOL"), falling back to the protocol name;
    // the title/body keep the position/protocol name ("Review Your Jito Position").
    const singleAssetName = heldAssetSymbol(singlePosition) ?? singleName;
    const apyValue = typeof singlePosition.apy.apyValuePct === "number" ? singlePosition.apy.apyValuePct : null;
    if (hasLow && !hasConcentration && !hasShared && !hasMissing && apyValue !== null) {
      // Pure low-yield → a "Compare" treatment naming the held asset + its actual sourced APY.
      const apyStr = String(Math.round(apyValue * 10) / 10);
      const kind = singlePosition.positionType === "lst" || singlePosition.positionType === "native_stake" ? "staking " : "";
      titleOverride = SUGGESTION_PO_LOW_TITLE.replace(/\{asset\}/g, singleAssetName);
      impactTextOverride = SUGGESTION_PO_LOW_IMPACT.replace("{amount}", usd0(total)).replace("{asset}", singleAssetName);
      descriptionOverride = SUGGESTION_PO_LOW_DESCRIPTION.replace(/\{asset\}/g, singleAssetName).replace("{apy}", apyStr).replace("{kind}", kind);
      modalReason = descriptionOverride;
    } else {
      titleOverride = SUGGESTION_PO_NAMED_TITLE.replace("{protocol}", singleName);
      impactTextOverride = SUGGESTION_PO_NAMED_IMPACT.replace("{amount}", usd0(total)).replace("{protocol}", singleAssetName);
      if (hasConcentration && hasMissing && sharePct !== null) {
        // One position flagged for BOTH concentration AND missing APY → combined body (card + modal mirror).
        descriptionOverride = SUGGESTION_PO_CONCENTRATION_MISSING.replace(/\{asset\}/g, singleAssetName).replace("{share}", String(sharePct));
        modalReason = descriptionOverride;
      } else {
        const tmpl = hasConcentration && sharePct !== null ? SUGGESTION_PO_NAMED_CONCENTRATION
          : hasShared ? SUGGESTION_PO_NAMED_SHARED
          : hasLow ? SUGGESTION_PO_NAMED_LOW_YIELD
          : SUGGESTION_PO_NAMED_MISSING_APY;
        descriptionOverride = tmpl.replace("{protocol}", singleName).replace("{share}", sharePct !== null ? String(sharePct) : "");
        // Detailed modal body: for a single concentrated position, spell out value / gross / share / threshold / pp-above.
        if (hasConcentration && sharePct !== null && singlePosition.recognizedValueUsd !== null) {
          const thresholdPct = round1Pct(POSITION_CONCENTRATION_THRESHOLD);
          const ppAbove = Math.round((sharePct - thresholdPct) * 10) / 10;
          modalReason = SUGGESTION_PO_NAMED_CONCENTRATION_DETAIL
            .replace("{protocol}", singleName)
            .replace("{value}", usd0(singlePosition.recognizedValueUsd))
            .replace("{gross}", usd0(gross))
            .replace("{share}", String(sharePct))
            .replace("{threshold}", String(thresholdPct))
            .replace("{pp}", String(ppAbove));
        } else {
          modalReason = descriptionOverride;
        }
      }
    }
  } else if (
    // Shared underlying exposure: exactly ONE exposure group and every flagged position belongs to it (a clean
    // single-underlying case, e.g. JitoSOL + mSOL → SOL). Two-or-more distinct groups fall through to generic.
    hasShared && assessment.sharedExposureGroups.length === 1 &&
    assessment.flaggedPositions.length >= 2 &&
    assessment.flaggedPositions.every((p) => assessment.sharedExposureGroups[0].memberPositionIds.includes(p.positionId))
  ) {
    const group = assessment.sharedExposureGroups[0];
    const assetName = group.label.replace(/\s*exposure$/i, "");
    // Distinct member token symbols (two positions of the SAME token collapse to one label, so we never say
    // "USDC and USDC"). "both"/"all" reflect the POSITION count, not the symbol count.
    const memberSymbols = [...new Set(assessment.flaggedPositions.map((p) => heldAssetSymbol(p)).filter((s): s is string => !!s))];
    const members = memberSymbols.length === 2 ? `${memberSymbols[0]} and ${memberSymbols[1]}`
      : memberSymbols.length > 2 ? `${memberSymbols.slice(0, -1).join(", ")}, and ${memberSymbols[memberSymbols.length - 1]}`
      : (memberSymbols[0] ?? assetName);
    const both = assessment.flaggedPositions.length === 2 ? "both" : "all";
    const linkword = both;
    const sharePct = group.portfolioShare !== null ? round1Pct(group.portfolioShare) : gross > 0 ? round1Pct(group.combinedValueUsd / gross) : 0;
    impactTextOverride = SUGGESTION_PO_SHARED_IMPACT
      .replace("{amount}", usd0(total)).replace("{count}", String(assessment.flaggedPositions.length)).replace("{asset}", assetName);
    if (!hasConcentration && !hasLow && !hasMissing) {
      // Shared exposure is the ONLY issue → name the exposure directly.
      titleOverride = SUGGESTION_PO_SHARED_TITLE.replace(/\{asset\}/g, assetName);
      descriptionOverride = SUGGESTION_PO_SHARED_DESCRIPTION
        .replace(/\{members\}/g, members).replace(/\{linkword\}/g, linkword).replace(/\{share\}/g, String(sharePct)).replace(/\{asset\}/g, assetName);
    } else {
      // Shared exposure PLUS other issues (concentration / missing APY / low yield) → keep the generic heading and
      // assemble a combined body that names the shared %, the concentrated position (+ its APY gap), and the yield ask.
      const concentrated = assessment.flaggedPositions
        .filter((p) => positionReasons(p).reasons.includes(SUGGESTION_PO_POS_CONCENTRATION))
        .sort((a, b) => (b.recognizedValueUsd ?? 0) - (a.recognizedValueUsd ?? 0))[0];
      const concShare = concentrated && concentrated.recognizedValueUsd !== null && gross > 0 ? round1Pct(concentrated.recognizedValueUsd / gross) : null;
      const yieldClause = hasMissing ? SUGGESTION_PO_MULTI_YIELD_MISSING : hasLow ? SUGGESTION_PO_MULTI_YIELD_LOW : "";
      const lead = SUGGESTION_PO_MULTI_LEAD.replace("{members}", members).replace("{share}", String(sharePct));
      const conc = concentrated && concShare !== null
        ? SUGGESTION_PO_MULTI_CONC.replace("{asset}", heldAssetSymbol(concentrated) ?? assetName).replace("{share}", String(concShare))
          + (hasMissing && concentrated.missingDataEligible ? SUGGESTION_PO_MULTI_CONC_APY : "") + "."
        : "";
      const review = SUGGESTION_PO_MULTI_REVIEW.replace("{both}", both).replace("{asset}", assetName) + yieldClause + ".";
      // titleOverride stays undefined → the card/modal use the generic "Review Yield Positions".
      descriptionOverride = lead + conc + review;
    }
    // The modal headline + body mirror the card for this case.
    modalReason = descriptionOverride;
  } else {
    impactTextOverride = SUGGESTION_PO_MULTI_IMPACT.replace("{amount}", usd0(total)).replace("{count}", String(assessment.flaggedPositions.length));
  }

  // Modal-body review reason. A named single position uses the detailed (or short) position-specific copy; multiple
  // positions use the generic trigger wording. Precedence: concentration → shared → low-yield → missing.
  const reason = modalReason ?? (hasConcentration ? SUGGESTION_PO_REASON_CONCENTRATION
    : hasShared ? SUGGESTION_PO_REASON_SHARED
    : hasLow ? SUGGESTION_PO_REASON_LOW_YIELD
    : SUGGESTION_PO_REASON_MISSING_APY);

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

  // current/target are USD (value ÷ gross); the resulting share difference + threshold are percentages ("%").
  const calculations: ReviewCalculation[] = [
    { label: "Flagged positions vs gross assets", formula: "flagged value ÷ gross asset value", currentValue: total, targetValue: gross, difference: gross > 0 ? round1Pct(total / gross) : 0, unit: "USD", differenceUnit: "%" },
    ...assessment.flaggedPositions.filter((p) => positionReasons(p).reasons.includes(SUGGESTION_PO_POS_CONCENTRATION)).map((p) => ({ label: "Single-position concentration", formula: "position value ÷ gross asset value", currentValue: p.recognizedValueUsd ?? 0, targetValue: gross, threshold: round1Pct(POSITION_CONCENTRATION_THRESHOLD), difference: gross > 0 ? round1Pct((p.recognizedValueUsd ?? 0) / gross) : 0, unit: "USD", differenceUnit: "%", thresholdUnit: "%" })),
    ...assessment.sharedExposureGroups.map((g) => ({ label: `Shared underlying exposure — ${g.label}`, formula: "combined value ÷ gross asset value", currentValue: g.combinedValueUsd, targetValue: gross, threshold: round1Pct(DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD), difference: g.portfolioShare !== null ? round1Pct(g.portfolioShare) : 0, unit: "USD", differenceUnit: "%", thresholdUnit: "%" })),
  ];

  const additionalLimitations: ReviewLimitation[] = [];
  if (freshnessUnverifiedCount > 0) additionalLimitations.push({ kind: "apy_freshness_unverified", text: SUGGESTION_PO_LIMIT_FRESHNESS });
  if (unsupportedCount > 0) additionalLimitations.push({ kind: "yield_comparison_unavailable", text: SUGGESTION_PO_LIMIT_NO_COMPARISON });
  if (assessment.warnings.includes("exposure_group_unresolved")) additionalLimitations.push({ kind: "exposure_grouping_unresolved", text: SUGGESTION_PO_LIMIT_EXPOSURE });

  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "position_optimization",
    actionKind: "review_only",
    // Name the position in the modal header too (matches the card title), like Staking's "Stake SOL on Jito".
    ...(titleOverride ? { title: titleOverride } : {}),
    guardrails,
    protocolSelection,
    reason,
    metrics,
    involvedPositions,
    calculations,
    additionalLimitations,
    positionReview: true,
  });

  return {
    id: POSITION_OPTIMIZATION_SUGGESTION_ID,
    category: "position_optimization",
    reason_codes,
    title_key: "suggestion.position_optimization.title",
    description_key: "suggestion.position_optimization.description",
    action_kind: "review_only",
    is_actionable: true,
    // An OBSERVATION: there is no next step to take here — reviewing is the
    // action — so it gets the quieter rail treatment and can be acknowledged.
    observationOnly: true,
    // Keyed to the flagged positions and their concentration / yield / reasons,
    // so "I've reviewed this" hides THIS situation and the card returns by itself
    // once any of it materially changes.
    dismissalSignature: buildDismissalSignature(
      "position_optimization",
      assessment.flaggedPositions.map((p) => ({
        positionId: p.positionId,
        portfolioSharePct: gross > 0 && p.recognizedValueUsd !== null ? round1Pct(p.recognizedValueUsd / gross) : null,
        apyPct: p.apy.apyValuePct,
        reasons: positionReasons(p).reasons,
      }))
    ),
    is_top_pick: false, // set only by selectTopPick
    amount: { valueUsd: total, label: "Positions to review" },
    ...(titleOverride ? { titleOverride } : {}),
    ...(descriptionOverride ? { descriptionOverride } : {}),
    ...(impactTextOverride ? { impactTextOverride } : {}),
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
