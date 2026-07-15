/**
 * yieldStrategyComparisonDiagnostics — Step 16E. Deterministic, read-only diagnostics + explanation for
 * a lane comparison / comparison set. It reports facts only — no recommendation language (never best /
 * safest / winner / guaranteed / risk-free / recommended / "you should use"). Approved phrasing:
 * "currently leads WealthSmith's comparison", "comparison leader", "only currently eligible strategy",
 * "leader withheld".
 */
import type {
  YieldStrategyComparisonCandidate,
  YieldStrategyComparisonDimensionKey,
  YieldStrategyLaneComparison,
} from "./yieldStrategyComparisonTypes";

export interface YieldStrategyComparisonCandidateDiagnostics {
  strategyId: string;
  protocolId: string;
  status: string;
  totalScore: number;
  dimensionScores: Record<string, number>;
  weights: Record<string, number>;
  weightedContributions: Record<string, number>;
  apyBasis: string;
  canonicalNetApyPct: number | null;
  reportedGrossApyPct: number | null;
  riskScore: number | null;
  tvlUsd: number | null;
  withdrawalStatus: string | null;
  withdrawalDelayHours: number | null;
  availableLiquidityUsd: number | null;
  incrementalUserCostBps: number | null;
  provenanceKind: string | null;
  freshnessRemaining: number | null;
}

export interface YieldStrategyComparisonDiagnostics {
  lane: string;
  status: string;
  eligibleCandidateCount: number;
  scoredCandidateCount: number;
  candidateOrder: string[];
  candidates: YieldStrategyComparisonCandidateDiagnostics[];
  topTwoScoreDifference: number | null;
  materialTie: boolean;
  sensitivityStatus: string;
  comparisonLeaderStrategyId: string | null;
  leaderSelectionReason: string;
  walletPositionsEvaluated: false;
  userCapitalEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

const dimVal = (c: YieldStrategyComparisonCandidate, dim: YieldStrategyComparisonDimensionKey, key: string): number | null => {
  const d = c.dimensions.find((x) => x.dimension === dim);
  const v = d?.rawValues?.[key];
  return typeof v === "number" ? v : null;
};

function candidateDiag(c: YieldStrategyComparisonCandidate): YieldStrategyComparisonCandidateDiagnostics {
  const dimensionScores: Record<string, number> = {};
  const weights: Record<string, number> = {};
  const weightedContributions: Record<string, number> = {};
  for (const d of c.dimensions) { dimensionScores[d.dimension] = d.normalizedScore; weights[d.dimension] = d.weight; weightedContributions[d.dimension] = d.weightedContribution; }
  return {
    strategyId: c.strategyId,
    protocolId: c.protocolId,
    status: c.status,
    totalScore: c.totalScore,
    dimensionScores,
    weights,
    weightedContributions,
    apyBasis: c.apyBasis,
    canonicalNetApyPct: c.canonicalNetApyPct ?? null,
    reportedGrossApyPct: c.reportedGrossApyPct ?? null,
    riskScore: dimVal(c, "risk_quality", "riskScore"),
    tvlUsd: dimVal(c, "market_depth", "tvlUsd"),
    withdrawalStatus: (() => { const d = c.dimensions.find((x) => x.dimension === "withdrawal_liquidity"); const v = d?.rawValues?.withdrawalStatus; return typeof v === "string" ? v : null; })(),
    withdrawalDelayHours: dimVal(c, "withdrawal_liquidity", "withdrawalDelayHours"),
    availableLiquidityUsd: dimVal(c, "withdrawal_liquidity", "availableLiquidityUsd"),
    incrementalUserCostBps: c.incrementalUserCostBps ?? null,
    provenanceKind: (() => { const d = c.dimensions.find((x) => x.dimension === "data_quality"); const v = d?.rawValues?.provenanceKind; return typeof v === "string" ? v : null; })(),
    freshnessRemaining: dimVal(c, "data_quality", "freshnessRemaining"),
  };
}

/** Deterministic diagnostics for one lane comparison. No comparison beyond what the result carries; no recommendation. */
export function getYieldStrategyComparisonDiagnostics(comparison: YieldStrategyLaneComparison): YieldStrategyComparisonDiagnostics {
  return {
    lane: comparison.lane,
    status: comparison.status,
    eligibleCandidateCount: comparison.candidateScorecards.length,
    scoredCandidateCount: comparison.candidateScorecards.filter((c) => c.status === "scored").length,
    candidateOrder: [...comparison.orderedStrategyIds],
    candidates: comparison.candidateScorecards.map(candidateDiag),
    topTwoScoreDifference: comparison.tieAnalysis.scoreDifference ?? null,
    materialTie: comparison.tieAnalysis.materialTie,
    sensitivityStatus: comparison.sensitivityAnalysis.status,
    comparisonLeaderStrategyId: comparison.comparisonLeaderStrategyId ?? null,
    leaderSelectionReason: comparison.leaderSelectionReason,
    walletPositionsEvaluated: false,
    userCapitalEvaluated: false,
    amountCalculated: false,
    planGenerated: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Recommendation-free explanation for one lane comparison. */
export function explainYieldStrategyComparison(comparison: YieldStrategyLaneComparison): string {
  const laneLabel = comparison.lane === "buffer" ? "the Safety Buffer" : "the excess-USDC";
  switch (comparison.status) {
    case "empty_eligible_set":
      return `No strategies are currently eligible for ${laneLabel} comparison.`;
    case "single_eligible_candidate":
      return `The only eligible strategy for ${laneLabel} comparison is ${comparison.comparisonLeaderStrategyId}. No multi-candidate comparison was possible.`;
    case "leader_withheld_tie":
      return `The ${laneLabel} comparison leader is withheld because the top two strategies are within the material-tie threshold (${comparison.tieAnalysis.tieThreshold} point).`;
    case "leader_withheld_sensitivity":
      return `The ${laneLabel} comparison leader is withheld because the result changes under the approved weight-sensitivity scenarios.`;
    case "leader_withheld_incomparable_data":
      return `The ${laneLabel} comparison leader is withheld because the APY basis is not comparable across all candidates.`;
    case "complete": {
      const leader = comparison.candidateScorecards.find((c) => c.strategyId === comparison.comparisonLeaderStrategyId);
      const strong = leader ? leader.dimensions.filter((d) => d.normalizedScore >= 60).map((d) => d.dimension).slice(0, 3).join(", ") : "";
      return `${comparison.comparisonLeaderStrategyId} currently leads WealthSmith's ${laneLabel} comparison${strong ? ` on ${strong}` : ""}, and remains the comparison leader under the approved weight-sensitivity scenarios.`;
    }
    default:
      return `The ${laneLabel} comparison could not produce a leader.`;
  }
}
