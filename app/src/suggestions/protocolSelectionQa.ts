/**
 * protocolSelectionQa — QA-ONLY protocol selection pipeline for ONE narrow case:
 * SOL liquid staking.
 *
 * PROVES: given complete mock/mainnet-SIMULATED data, WealthSmith can
 * deterministically identify one selected candidate. It does NOT enable live
 * selection or recommendations. `qaOnly` is always true, this result is never
 * consumed by any live suggestion/card/modal/Top Pick, and
 * `PROTOCOL_SELECTION_IMPLEMENTED` stays false. No transactions, no signatures,
 * no swaps. All mock values below are FIXTURE-ONLY — not live, not advice.
 */
import type { ProtocolStrategyType } from "./engineTypes";
import type { ProtocolMarketData, ProtocolRiskData, ProtocolSelectionInput } from "./protocolMarketData";
import { evaluateProtocolSelectionEligibility } from "./protocolEligibility";
import type { ProtocolEligibilityResult, ProtocolEligibilityContext } from "./protocolEligibility";
import { rankProtocolCandidates } from "./protocolScoring";
import type { ProtocolCandidateScore, ProtocolScoringContext } from "./protocolScoring";

/** The single supported 12H QA case. */
export const QA_SUPPORTED_STRATEGY: ProtocolStrategyType = "liquid_staking";
export const QA_SUPPORTED_ASSET = "SOL";
export const SOL_LIQUID_STAKING_QA_CANDIDATES = ["jupiter", "marinade", "jito", "blazestake", "sanctum"] as const;

export type ProtocolSelectionQaStatus = "selected" | "no_eligible_candidates" | "insufficient_data" | "disabled";

export type ProtocolSelectionQaReason =
  | "selection_disabled"
  | "no_candidates"
  | "no_eligible_candidates"
  | "incomplete_market_data"
  | "incomplete_risk_data"
  | "incomplete_route_data"
  | "scoring_unavailable"
  | "deterministic_winner_found"
  | "tie_resolved_deterministically"
  | "unsupported_strategy"
  | "unsupported_asset";

export interface ProtocolSelectionQaResult {
  status: ProtocolSelectionQaStatus;
  strategyType: ProtocolStrategyType;
  assetSymbol: string;
  /** Present ONLY in this QA result when a deterministic winner is found. */
  selectedProtocolId?: string;
  rankedProtocolIds: string[];
  candidateScores: ProtocolCandidateScore[];
  eligibilityResults: ProtocolEligibilityResult[];
  reasons: ProtocolSelectionQaReason[];
  selectionMade: boolean;
  /** Always true — this result must never be used by live suggestions/UI. */
  qaOnly: true;
  checkedAt: string;
}

/* ------------------------------------------------------------------ *
 * Fixture-only QA data. Not live market data. Not a recommendation.
 * Realistic-LOOKING but simulated values for the five SOL LST candidates.
 * ------------------------------------------------------------------ */
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const QA_UPDATED_AT = "2026-01-01T00:00:00Z";

function qaMarket(id: string, apy: number, tvlUsd: number, withdrawalTimeHours: number, liquidityUsd: number, priceImpactPct: number): ProtocolMarketData {
  return {
    protocolId: id,
    strategyType: "liquid_staking",
    assetSymbol: "SOL",
    assetMint: WSOL_MINT,
    apy,
    tvlUsd,
    liquidityUsd,
    withdrawalTimeHours,
    fees: { depositBps: 0, withdrawBps: 0 },
    route: { quoteAvailable: true, priceImpactPct, source: "jupiter" },
    dataSources: ["qa_fixture"], // FIXTURE-ONLY — not live
    updatedAt: QA_UPDATED_AT,
    confidence: "available",
    missingFields: [],
  };
}
function qaRisk(id: string, riskScore: number, auditStatus: "audited" | "partially_audited", withdrawalClass: "instant" | "same_day" | "delayed"): ProtocolRiskData {
  return {
    protocolId: id,
    riskScore,
    auditStatus,
    safetyBufferEligible: false,
    withdrawalClass,
    notes: ["Fixture-only QA data. Not live market data. Not a recommendation."],
    sources: ["qa_fixture"],
    lastReviewedAt: "2026-01-01",
    confidence: "available",
    missingFields: [],
  };
}

/** Complete simulated market data (fixture-only). */
export const SOL_LIQUID_STAKING_QA_MARKET: Record<string, ProtocolMarketData> = {
  jupiter: qaMarket("jupiter", 8.2, 1_500_000_000, 2, 10_000_000, 0.05),
  marinade: qaMarket("marinade", 7.5, 1_200_000_000, 2, 8_000_000, 0.06),
  jito: qaMarket("jito", 8.8, 1_800_000_000, 2, 12_000_000, 0.04),
  blazestake: qaMarket("blazestake", 7.0, 400_000_000, 2, 5_000_000, 0.08),
  sanctum: qaMarket("sanctum", 9.5, 900_000_000, 2, 6_000_000, 0.05),
};

/** Complete simulated risk data (fixture-only). Marinade carries the highest
 *  curated riskScore, so risk-weighted scoring makes it the deterministic winner. */
export const SOL_LIQUID_STAKING_QA_RISK: Record<string, ProtocolRiskData> = {
  jupiter: qaRisk("jupiter", 8, "audited", "same_day"),
  marinade: qaRisk("marinade", 9, "audited", "same_day"),
  jito: qaRisk("jito", 8, "audited", "same_day"),
  blazestake: qaRisk("blazestake", 7, "partially_audited", "same_day"),
  sanctum: qaRisk("sanctum", 7, "audited", "same_day"),
};

/** Build the QA ProtocolSelectionInput (defaults to complete fixture data). */
export function buildSolLiquidStakingQaInput(
  marketDataByProtocolId: Record<string, ProtocolMarketData> = SOL_LIQUID_STAKING_QA_MARKET,
  riskDataByProtocolId: Record<string, ProtocolRiskData> = SOL_LIQUID_STAKING_QA_RISK
): ProtocolSelectionInput {
  return {
    candidateProtocolIds: [...SOL_LIQUID_STAKING_QA_CANDIDATES],
    assetSymbol: "SOL",
    strategyType: "liquid_staking",
    marketDataByProtocolId,
    riskDataByProtocolId,
  };
}

function collectInsufficientReasons(scores: ProtocolCandidateScore[]): ProtocolSelectionQaReason[] {
  const out = new Set<ProtocolSelectionQaReason>();
  for (const s of scores) {
    for (const r of s.reasons) {
      if (r === "missing_apy" || r === "missing_tvl" || r === "missing_market_data") out.add("incomplete_market_data");
      if (r === "missing_risk_score" || r === "missing_risk_data") out.add("incomplete_risk_data");
      if (r === "missing_route_data" || r === "missing_liquidity_data") out.add("incomplete_route_data");
    }
  }
  return [...out];
}

/**
 * QA-ONLY selection pipeline. Runs eligibility → scoring/ranking and picks the
 * top-ranked candidate ONLY inside this QA result. Deterministic. Never touches
 * ProtocolSelection, guardrails, the engine, or the UI.
 */
export function runProtocolSelectionQa(args: {
  input: ProtocolSelectionInput;
  context?: ProtocolScoringContext & ProtocolEligibilityContext;
  checkedAt?: string;
}): ProtocolSelectionQaResult {
  const { input } = args;
  const context = args.context ?? { countsTowardSafetyBuffer: false, requiresRoute: false };
  const checkedAt = args.checkedAt ?? new Date().toISOString();

  const shell = (
    status: ProtocolSelectionQaStatus,
    reasons: ProtocolSelectionQaReason[],
    extra: Partial<ProtocolSelectionQaResult> = {}
  ): ProtocolSelectionQaResult => ({
    status,
    strategyType: input.strategyType,
    assetSymbol: input.assetSymbol,
    rankedProtocolIds: [],
    candidateScores: [],
    eligibilityResults: [],
    reasons,
    selectionMade: false,
    qaOnly: true,
    checkedAt,
    ...extra,
  });

  // 1–2. Narrow-case gate: only SOL liquid staking is supported for QA.
  if (input.strategyType !== QA_SUPPORTED_STRATEGY) return shell("disabled", ["selection_disabled", "unsupported_strategy"]);
  if (input.assetSymbol.toUpperCase() !== QA_SUPPORTED_ASSET) return shell("disabled", ["selection_disabled", "unsupported_asset"]);
  if (input.candidateProtocolIds.length === 0) return shell("no_eligible_candidates", ["no_candidates"]);

  // 3. Eligibility, then 4. score/rank.
  const eligibilityResults = evaluateProtocolSelectionEligibility(input, context);
  const ranking = rankProtocolCandidates({ input, eligibilityResults, context, checkedAt });
  const scored = ranking.scores.filter((s) => s.status === "scored");
  const eligibleCount = eligibilityResults.filter((e) => e.status === "eligible").length;

  // 5. Nothing scorable.
  if (scored.length === 0) {
    const anyInsufficient =
      eligibilityResults.some((e) => e.status === "insufficient_data") || ranking.scores.some((s) => s.status === "insufficient_data");
    const status: ProtocolSelectionQaStatus = eligibleCount === 0 && !anyInsufficient ? "no_eligible_candidates" : "insufficient_data";
    const reasons = collectInsufficientReasons(ranking.scores);
    return shell(status, reasons.length > 0 ? reasons : [status === "no_eligible_candidates" ? "no_eligible_candidates" : "scoring_unavailable"], {
      rankedProtocolIds: ranking.rankedProtocolIds,
      candidateScores: ranking.scores,
      eligibilityResults,
    });
  }

  // 6–8. Deterministic winner = first ranked (QA-only selection).
  const winner = ranking.rankedProtocolIds[0];
  const tie = scored.length >= 2 && scored[0].breakdown?.totalScore === scored[1].breakdown?.totalScore;
  const reasons: ProtocolSelectionQaReason[] = tie
    ? ["deterministic_winner_found", "tie_resolved_deterministically"]
    : ["deterministic_winner_found"];
  return shell("selected", reasons, {
    selectedProtocolId: winner,
    rankedProtocolIds: ranking.rankedProtocolIds,
    candidateScores: ranking.scores,
    eligibilityResults,
    selectionMade: true,
  });
}
