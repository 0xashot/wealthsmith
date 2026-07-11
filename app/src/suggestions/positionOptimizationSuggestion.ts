/**
 * positionOptimizationSuggestion — the deterministic "Review Existing Yield
 * Positions" rule (category `position_optimization`;
 * rules/suggestion-engine-rules.md). Pure over SuggestionEngineInputs: no
 * fetching, no pricing, no AI, no protocol choice, no invented APY.
 *
 * It reviews only EXISTING DEPLOYED positions (LSTs, native stake, protocol/
 * yield) that meet a deterministic review condition — missing sourced APY, low
 * sourced APY, or over-concentration. It NEVER claims a position is bad or a
 * protocol is unsafe, and NEVER names a replacement — it only flags that a
 * position "may need review". One AGGREGATED suggestion is returned, not one
 * card per position.
 *
 * SAFETY BUFFER COMES FIRST (engine-enforced); this rule is the lowest-priority
 * actionable candidate and may coexist with Rebalance/Staking/Stable Yield.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SuggestionEngineInputs } from "./engineInputs";
import type {
  EngineSuggestion,
  SuggestionGuardrail,
  SuggestionReasonCode,
  ReviewPosition,
  ReviewPositionRole,
} from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_POSITION_REVIEW_USD,
  MIN_REVIEW_APY,
  MIN_CONCENTRATION_REVIEW_USD,
  POSITION_CONCENTRATION_THRESHOLD,
  DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, metric } from "./suggestionReviewDetails";
import { findDuplicateExposureGroups } from "./duplicateExposure";
import type { ReviewCalculation } from "./engineTypes";

/** Stable suggestion ID. */
export const POSITION_OPTIMIZATION_SUGGESTION_ID = "position_optimization_review";

/** Detected source → display protocol label (display only, never invented). */
const SOURCE_LABELS: Record<string, string> = {
  jupiter: "Jupiter",
  kamino: "Kamino",
  jito: "Jito",
  sanctum: "Sanctum",
  ondo: "Ondo",
  orca: "Orca",
  raydium: "Raydium",
  meteora: "Meteora",
  hubble: "Hubble",
};

/** Best available protocol label from DETECTED data only (never invented). */
function positionProtocolLabel(p: WalletPosition): string | undefined {
  return p.protocol ?? (p.source !== "wallet" ? SOURCE_LABELS[p.source] : undefined);
}

/** An existing DEPLOYED position (LST / native stake / protocol), priced. */
function isDeployedPosition(p: WalletPosition): boolean {
  return (
    (p.type === "lst" || p.type === "stake" || p.type === "protocol") &&
    typeof p.valueUsd === "number"
  );
}

/**
 * Trigger: fully funded buffer ∧ pricing ∧ a priced total ∧ at least one priced
 * deployed position that meets a review condition, with total flagged value at
 * least the minimum. Anything missing → null; liquid wallet tokens, unpriced
 * positions, and healthy positions are never flagged.
 */
export function derivePositionOptimizationSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const reasons = new Set<SuggestionReasonCode>();

  // Flagged positions keyed by a STABLE per-position key so a position touched by
  // several review reasons is counted ONCE (value + roles/reasons merged).
  interface FlaggedEntry {
    p: WalletPosition;
    v: number;
    role: ReviewPositionRole;
    reasons: string[];
  }
  const flaggedMap = new Map<string, FlaggedEntry>();
  const posKey = (p: WalletPosition) =>
    p.id || [p.source, p.protocol ?? "", p.symbol ?? "", p.mint ?? ""].join("|");
  const addFlag = (
    p: WalletPosition,
    v: number,
    role: ReviewPositionRole,
    reasonText: string
  ) => {
    const key = posKey(p);
    const existing = flaggedMap.get(key);
    if (existing) {
      if (!existing.reasons.includes(reasonText)) existing.reasons.push(reasonText);
    } else {
      flaggedMap.set(key, { p, v, role, reasons: [reasonText] });
    }
  };

  for (const p of inputs.positions) {
    if (!isDeployedPosition(p)) continue;
    const v = p.valueUsd as number;
    // A. Missing sourced APY on a meaningful deployed position.
    if (v >= MIN_POSITION_REVIEW_USD && p.apy == null) {
      reasons.add("missing_apy_data");
      addFlag(p, v, "missing_apy_position", "missing APY data");
    }
    // B. Low sourced APY.
    if (v >= MIN_POSITION_REVIEW_USD && typeof p.apy === "number" && p.apy < MIN_REVIEW_APY) {
      reasons.add("low_yield_position");
      addFlag(p, v, "low_yield_position", "low reported APY");
    }
    // C. Over-concentration of a single deployed position.
    if (v >= MIN_CONCENTRATION_REVIEW_USD && v / totalPricedUsd >= POSITION_CONCENTRATION_THRESHOLD) {
      reasons.add("concentration_risk");
      addFlag(p, v, "concentrated_position", `position concentration (${Math.round((v / totalPricedUsd) * 100)}% of portfolio)`);
    }
  }

  // D. Duplicate exposure — multiple deployed positions sharing an underlying
  // group (SOL / stablecoin / same token). Positions already flagged above are
  // de-duplicated by the map (value never double-counted).
  const duplicateGroups = findDuplicateExposureGroups(inputs.positions, totalPricedUsd);
  for (const g of duplicateGroups) {
    reasons.add("duplicate_exposure");
    for (const p of g.positions) {
      addFlag(p, p.valueUsd as number, "duplicate_exposure_position", `similar underlying exposure (${g.label})`);
    }
  }

  if (reasons.size === 0) return null;

  const flagged = [...flaggedMap.values()];
  const totalFlaggedValueUsd = flagged.reduce((s, e) => s + e.v, 0);
  if (totalFlaggedValueUsd < MIN_POSITION_REVIEW_USD) return null;

  const flaggedPositions: ReviewPosition[] = flagged.map((e) => ({
    // Detected position data only — never an invented protocol/APY.
    protocol: positionProtocolLabel(e.p),
    name: e.p.name,
    symbol: e.p.symbol,
    valueUsd: e.v,
    apy: e.p.apy ?? null,
    role: e.role,
    reason: e.reasons.join(", "),
  }));

  // Deterministic reason-code order.
  const reasonOrder: SuggestionReasonCode[] = [
    "missing_apy_data",
    "low_yield_position",
    "concentration_risk",
    "duplicate_exposure",
  ];
  const reason_codes = reasonOrder.filter((c) => reasons.has(c));

  const hasApyReview = reasons.has("missing_apy_data") || reasons.has("low_yield_position");
  const hasConcentration = reasons.has("concentration_risk");
  const hasDuplicate = reasons.has("duplicate_exposure");

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "position_value_threshold", status: "passed" },
    { code: "apy_data_review", status: hasApyReview ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "concentration_review", status: hasConcentration ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    // Passed only when positions were deterministically grouped (duplicate fired).
    { code: "exposure_grouping", status: hasDuplicate ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    // protocol_selection guardrail is derived centrally from protocolSelection.
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  const triggers: string[] = [];
  if (reasons.has("missing_apy_data")) triggers.push("missing APY data");
  if (reasons.has("low_yield_position")) triggers.push("low reported APY");
  if (hasConcentration) triggers.push("position concentration");
  if (hasDuplicate) triggers.push("similar underlying exposure");

  // Duplicate-exposure metrics + per-group calculations (only when it fired).
  const duplicatePositionCount = duplicateGroups.reduce((s, g) => s + g.positions.length, 0);
  const duplicateCombinedUsd = duplicateGroups.reduce((s, g) => s + g.combinedUsd, 0);
  const metrics = [
    usdMetric("Positions to review", totalFlaggedValueUsd),
    metric("Flagged position count", flaggedPositions.length, "count"),
    ...(hasDuplicate
      ? [
          metric("Positions with similar exposure", duplicatePositionCount, "count"),
          usdMetric("Similar-exposure value", duplicateCombinedUsd),
        ]
      : []),
  ];
  const calculations: ReviewCalculation[] = [
    {
      label: "Flagged positions vs portfolio",
      formula: "flagged value ÷ portfolio value",
      currentValue: totalFlaggedValueUsd,
      targetValue: totalPricedUsd,
      threshold: Math.round(POSITION_CONCENTRATION_THRESHOLD * 1000) / 10,
      unit: "USD",
    },
    ...duplicateGroups.map((g) => ({
      label: `${g.label} — ${g.positions.length} positions`,
      formula: "combined value ÷ portfolio value",
      currentValue: g.combinedUsd,
      targetValue: totalPricedUsd,
      threshold: Math.round(DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD * 1000) / 10,
      unit: "USD",
    })),
  ];

  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "position_optimization",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    reason: hasDuplicate
      ? `Flagged for review: ${triggers.join(", ")}. These positions appear to share similar underlying exposure, so they may be worth reviewing together.`
      : `Flagged for review: ${triggers.join(", ")}.`,
    metrics,
    involvedPositions: flaggedPositions,
    calculations,
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

    amount: {
      valueUsd: totalFlaggedValueUsd,
      label: "Positions to review",
    },

    // This card only REVIEWS existing positions — it proposes no new protocol,
    // so protocol selection does not apply. (If it ever proposes an alternative
    // protocol, switch to not_evaluated/selected with real data.)
    protocolSelection,
    reviewDetails,

    scores: {
      impact: Math.min(totalFlaggedValueUsd / totalPricedUsd, 1),
      urgency: hasConcentration ? 0.45 : 0.35,
      efficiency: reasons.has("low_yield_position") ? 0.6 : 0.5,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
