/**
 * yieldStrategyMarketDataDiagnostics — Step 16C. Deterministic, read-only COVERAGE counts over a
 * Stable Yield market-data set: registry / approved / documentation_required candidate counts, snapshot
 * status distribution, and coverage of APY / TVL / liquidity / withdrawal / provenance / freshness. It
 * is inventory + coverage only — it COMPARES no strategies, ranks nothing, and recommends nothing.
 */
import type { YieldMarketSnapshotStatus, YieldStrategyMarketDataSet, YieldStrategyMarketSnapshot } from "./yieldStrategyMarketDataTypes";
import { listYieldStrategyMarketSnapshots } from "./yieldStrategyMarketData";

export interface YieldStrategyMarketDataDiagnostics {
  schemaVersion: string;
  policyId: string;
  policyVersion: string;

  registeredCandidates: number;
  approvedCandidates: number;
  documentationRequiredCandidates: number;

  byStatus: Record<YieldMarketSnapshotStatus, number>;

  apyCoverage: number;
  apyDefinitionSufficientCoverage: number;
  sevenDayApyCoverage: number;
  thirtyDayApyCoverage: number;
  tvlCoverage: number;
  liquidityCoverage: number;
  definedWithdrawalCoverage: number;
  provenanceCoverage: number;
  freshnessCompliant: number;

  marketReadyCandidates: number;
  emptyApprovedSet: boolean;

  approvedCandidateIds: string[];
  marketReadyCandidateIds: string[];

  comparisonEvaluated: false;
  rankingCalculated: false;
  leaderSelected: false;
  suggestionGenerated: false;
}

const has = (v: unknown) => v !== undefined && v !== null;

/** Deterministic coverage diagnostics. No comparison, no ranking, no recommendation. */
export function getYieldStrategyMarketDataDiagnostics(set: YieldStrategyMarketDataSet): YieldStrategyMarketDataDiagnostics {
  const snapshots = listYieldStrategyMarketSnapshots(set);
  const byStatus: Record<YieldMarketSnapshotStatus, number> = { complete: 0, partial: 0, stale: 0, invalid: 0, unavailable: 0 };
  for (const s of snapshots) byStatus[s.status] += 1;

  const count = (pred: (s: YieldStrategyMarketSnapshot) => boolean) => snapshots.filter(pred).length;

  return {
    schemaVersion: set.schemaVersion,
    policyId: set.policyId,
    policyVersion: set.policyVersion,

    registeredCandidates: snapshots.length,
    approvedCandidates: set.approvedCandidateIds.length,
    documentationRequiredCandidates: set.documentationRequiredCandidateIds.length,

    byStatus,

    apyCoverage: count((s) => has(s.apy.currentApyPct) || has(s.apy.grossApyPct) || has(s.apy.netApyPct)),
    apyDefinitionSufficientCoverage: count((s) => s.apy.definitionSufficientForComparison),
    sevenDayApyCoverage: count((s) => has(s.apy.sevenDayApyPct)),
    thirtyDayApyCoverage: count((s) => has(s.apy.thirtyDayApyPct)),
    tvlCoverage: count((s) => has(s.tvl.tvlUsd)),
    liquidityCoverage: count((s) => has(s.liquidity.availableLiquidityUsd) || has(s.liquidity.availableLiquidityRatio)),
    definedWithdrawalCoverage: count((s) => s.liquidity.withdrawalStatus !== "unknown"),
    provenanceCoverage: count((s) => s.provenance.present),
    freshnessCompliant: count((s) => s.marketDataFresh),

    marketReadyCandidates: set.marketReadyCandidateIds.length,
    emptyApprovedSet: set.emptyApprovedSet,

    approvedCandidateIds: [...set.approvedCandidateIds],
    marketReadyCandidateIds: [...set.marketReadyCandidateIds],

    comparisonEvaluated: false,
    rankingCalculated: false,
    leaderSelected: false,
    suggestionGenerated: false,
  };
}
