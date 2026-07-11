/**
 * protocolEligibility — deterministic "is this protocol ELIGIBLE TO EVALUATE?"
 * gates for future protocol selection.
 *
 * This answers "when is a protocol eligible to be considered?" — it NEVER answers
 * "which protocol should the user use?". No ranking, no score, no selection, no
 * recommendation. HONESTY: missing data NEVER passes — it yields
 * `insufficient_data` (never `eligible`). Present data that fails a gate yields
 * `ineligible`. See protocolRiskMethodology.md.
 *
 * Pure helper only — NOT wired into any suggestion, card, modal, or Top Pick.
 */
import type { ProtocolStrategyType } from "./engineTypes";
import type { ProtocolMarketData, ProtocolRiskData, ProtocolSelectionInput } from "./protocolMarketData";
import type { ProtocolRegistryEntry } from "./protocolRegistry";
import { getProtocolCandidateById } from "./protocolRegistry";
import {
  MIN_PROTOCOL_TVL_USD,
  MIN_PROTOCOL_RISK_SCORE,
  MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER,
  MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD,
  MIN_LIQUIDITY_USD,
} from "./engineThresholds";

/** Explicit marker: an eligibility result is NOT a recommendation or selection. */
export const ELIGIBILITY_IMPLIES_RECOMMENDATION = false;

export type ProtocolEligibilityStatus = "eligible" | "ineligible" | "insufficient_data";

export type ProtocolEligibilityReason =
  | "missing_market_data"
  | "missing_risk_data"
  | "missing_tvl"
  | "missing_apy"
  | "missing_withdrawal_behavior"
  | "missing_audit_status"
  | "missing_safety_buffer_eligibility"
  | "missing_liquidity_data"
  | "missing_quote_route"
  | "unsupported_asset"
  | "unsupported_strategy"
  | "protocol_not_candidate"
  | "risk_score_missing"
  | "risk_score_below_minimum"
  | "tvl_below_minimum"
  | "withdrawal_too_long"
  | "audit_status_unknown"
  | "safety_buffer_not_eligible"
  | "fees_unknown"
  | "liquidity_below_minimum"
  | "route_unavailable";

export interface ProtocolEligibilityResult {
  protocolId: string;
  strategyType: ProtocolStrategyType;
  assetSymbol: string;
  status: ProtocolEligibilityStatus;
  reasons: ProtocolEligibilityReason[];
  checkedAt: string;
}

export interface ProtocolEligibilityContext {
  /** The suggestion wants this deployment to count toward the Safety Buffer. */
  countsTowardSafetyBuffer?: boolean;
  /** Execution needs a swap/route (liquidity + quote required). */
  requiresRoute?: boolean;
}

/**
 * Reasons that mean the protocol DEFINITIVELY fails (present data violates a
 * gate). Any of these → `ineligible`. Everything else is a "missing/unknown"
 * reason → `insufficient_data` (never eligible).
 */
const HARD_INELIGIBLE: ReadonlySet<ProtocolEligibilityReason> = new Set([
  "protocol_not_candidate",
  "unsupported_strategy",
  "unsupported_asset",
  "tvl_below_minimum",
  "risk_score_below_minimum",
  "withdrawal_too_long",
  "safety_buffer_not_eligible",
  "liquidity_below_minimum",
  "route_unavailable",
]);

/** Deterministic reason order for stable output. */
const REASON_ORDER: ProtocolEligibilityReason[] = [
  "protocol_not_candidate",
  "unsupported_strategy",
  "unsupported_asset",
  "missing_market_data",
  "missing_risk_data",
  "missing_apy",
  "missing_tvl",
  "tvl_below_minimum",
  "missing_withdrawal_behavior",
  "withdrawal_too_long",
  "risk_score_missing",
  "risk_score_below_minimum",
  "missing_audit_status",
  "audit_status_unknown",
  "missing_safety_buffer_eligibility",
  "safety_buffer_not_eligible",
  "fees_unknown",
  "missing_liquidity_data",
  "liquidity_below_minimum",
  "missing_quote_route",
  "route_unavailable",
];

/**
 * Evaluate a single candidate's eligibility. Deterministic and pure. Never
 * ranks, scores, or selects. See protocolRiskMethodology.md for the rules.
 */
export function evaluateProtocolEligibility(args: {
  candidate: ProtocolRegistryEntry | undefined;
  marketData?: ProtocolMarketData;
  riskData?: ProtocolRiskData;
  assetSymbol: string;
  strategyType: ProtocolStrategyType;
  context?: ProtocolEligibilityContext;
  checkedAt?: string;
}): ProtocolEligibilityResult {
  const { candidate, marketData, riskData, assetSymbol, strategyType } = args;
  const ctx = args.context ?? {};
  const checkedAt = args.checkedAt ?? new Date().toISOString();
  const reasons = new Set<ProtocolEligibilityReason>();
  const asset = assetSymbol.toUpperCase();

  const finalize = (): ProtocolEligibilityResult => {
    const ordered = REASON_ORDER.filter((r) => reasons.has(r));
    const status: ProtocolEligibilityStatus = ordered.some((r) => HARD_INELIGIBLE.has(r))
      ? "ineligible"
      : ordered.length > 0
        ? "insufficient_data"
        : "eligible";
    return { protocolId: candidate?.id ?? "", strategyType, assetSymbol, status, reasons: ordered, checkedAt };
  };

  // Common: candidate + strategy support.
  if (!candidate) {
    reasons.add("protocol_not_candidate");
    return finalize();
  }
  if (!candidate.strategyTypes.includes(strategyType)) {
    reasons.add("unsupported_strategy");
    return finalize();
  }

  // LP / vault: impermanent-loss exposure is not modeled yet → never eligible
  // (insufficient_data) until a later step models IL. See methodology doc.
  if (strategyType === "lp" || strategyType === "vault") {
    reasons.add("missing_market_data");
    reasons.add("missing_liquidity_data");
    reasons.add("missing_quote_route");
    return finalize();
  }

  // Asset support (exact symbol or known mint).
  const assetSupported =
    candidate.supportedAssets.map((a) => a.toUpperCase()).includes(asset) ||
    (marketData?.assetMint != null && (candidate.supportedMints?.includes(marketData.assetMint) ?? false));
  if (!assetSupported) {
    reasons.add("unsupported_asset");
    return finalize();
  }

  // Data presence.
  if (!marketData) reasons.add("missing_market_data");
  if (!riskData) reasons.add("missing_risk_data");

  // Market-data gates.
  if (marketData) {
    if (marketData.apy == null) reasons.add("missing_apy");
    if (marketData.tvlUsd == null) reasons.add("missing_tvl");
    else if (marketData.tvlUsd < MIN_PROTOCOL_TVL_USD) reasons.add("tvl_below_minimum");
    if (marketData.fees == null) reasons.add("fees_unknown"); // net-yield comparison
    if (ctx.requiresRoute) {
      if (marketData.liquidityUsd == null) reasons.add("missing_liquidity_data");
      else if (marketData.liquidityUsd < MIN_LIQUIDITY_USD) reasons.add("liquidity_below_minimum");
      if (!marketData.route || marketData.route.quoteAvailable !== true) reasons.add("missing_quote_route");
    }
  }

  // Withdrawal behavior must be known (hours OR a non-unknown class).
  const withdrawalHours = marketData?.withdrawalTimeHours;
  const withdrawalClassKnown = riskData?.withdrawalClass != null && riskData.withdrawalClass !== "unknown";
  if (withdrawalHours == null && !withdrawalClassKnown) reasons.add("missing_withdrawal_behavior");

  const maxHours = ctx.countsTowardSafetyBuffer
    ? MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER
    : MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD;
  if (withdrawalHours != null && withdrawalHours > maxHours) reasons.add("withdrawal_too_long");

  // Risk-data gates.
  if (riskData) {
    if (riskData.riskScore == null) reasons.add("risk_score_missing");
    else if (riskData.riskScore < MIN_PROTOCOL_RISK_SCORE) reasons.add("risk_score_below_minimum");
    if (riskData.auditStatus == null) reasons.add("missing_audit_status");
    else if (riskData.auditStatus === "unknown") reasons.add("audit_status_unknown");
  }

  // Safety-Buffer context adds stricter gates.
  if (ctx.countsTowardSafetyBuffer && riskData) {
    if (riskData.safetyBufferEligible == null) reasons.add("missing_safety_buffer_eligibility");
    else if (riskData.safetyBufferEligible === false) reasons.add("safety_buffer_not_eligible");
    // audit must be audited/partially_audited — unknown/missing already flagged above.
  }

  return finalize();
}

/**
 * Evaluate every candidate in a ProtocolSelectionInput. Returns eligibility
 * results ONLY, in candidate order — never sorts, ranks, scores, selects, or
 * mutates anything.
 */
export function evaluateProtocolSelectionEligibility(
  input: ProtocolSelectionInput,
  context?: ProtocolEligibilityContext
): ProtocolEligibilityResult[] {
  return input.candidateProtocolIds.map((id) =>
    evaluateProtocolEligibility({
      candidate: getProtocolCandidateById(id),
      marketData: input.marketDataByProtocolId[id],
      riskData: input.riskDataByProtocolId[id],
      assetSymbol: input.assetSymbol,
      strategyType: input.strategyType,
      context,
    })
  );
}
