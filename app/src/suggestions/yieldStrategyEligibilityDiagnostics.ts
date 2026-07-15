/**
 * yieldStrategyEligibilityDiagnostics — Step 16D. Deterministic, read-only diagnostics over a Stable
 * Yield eligibility set: set status, approved/empty-approved counts, per-lane evaluated + eligible ids,
 * per-status + per-blocker counts, and a per-strategy readiness breakdown. Plus a plain-language
 * `explain` helper. It reports facts only — it COMPARES nothing, ranks nothing, and uses NO
 * recommendation language (no best/safest/winner/recommended/use-this).
 */
import type {
  YieldStrategyEligibilityBlocker,
  YieldStrategyEligibilitySet,
  YieldStrategyLaneEligibilityResult,
  YieldStrategyLaneEligibilityStatus,
  YieldStrategyRiskReview,
} from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyMarketSnapshot } from "./yieldStrategyMarketDataTypes";

export interface YieldStrategyEligibilityPerStrategyDiagnostics {
  strategyId: string;
  lane: "buffer" | "excess";
  registryApproved: boolean;
  marketDataReady: boolean;
  riskReviewReady: boolean;
  apyReady: boolean;
  tvlReady: boolean;
  liquidityReady: boolean;
  withdrawalReady: boolean;
  auditReady: boolean;
  custodyReady: boolean;
  leverageReady: boolean;
  exposureReady: boolean;
  operationalReady: boolean;
  userRiskCompatible: boolean;
  status: YieldStrategyLaneEligibilityStatus;
  eligibleForComparison: boolean;
  blockers: YieldStrategyEligibilityBlocker[];
}

export interface YieldStrategyEligibilityDiagnostics {
  schemaVersion: string;
  policyId: string;
  policyVersion: string;

  setStatus: string;
  emptyApprovedSet: boolean;

  bufferEvaluatedCount: number;
  excessEvaluatedCount: number;

  bufferEligibleStrategyIds: string[];
  excessEligibleStrategyIds: string[];
  blockedStrategyIds: string[];
  unsupportedStrategyIds: string[];

  bufferStatusCounts: Record<YieldStrategyLaneEligibilityStatus, number>;
  excessStatusCounts: Record<YieldStrategyLaneEligibilityStatus, number>;
  blockerCounts: Record<string, number>;

  perStrategy: YieldStrategyEligibilityPerStrategyDiagnostics[];

  comparisonPerformed: false;
  rankingPerformed: false;
  leaderSelected: false;
  userCapitalEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

const zeroStatusCounts = (): Record<YieldStrategyLaneEligibilityStatus, number> => ({ eligible_for_comparison: 0, ineligible: 0, blocked_missing_data: 0, blocked_stale_data: 0, unsupported: 0, invalid: 0 });

function perStrategy(r: YieldStrategyLaneEligibilityResult): YieldStrategyEligibilityPerStrategyDiagnostics {
  return {
    strategyId: r.strategyId,
    lane: r.lane,
    registryApproved: r.registryApproved,
    marketDataReady: r.marketDataReady,
    riskReviewReady: r.riskReviewReady,
    apyReady: r.apyDefinitionReady,
    tvlReady: r.tvlRequirementPassed,
    liquidityReady: r.liquidityRequirementPassed,
    withdrawalReady: r.withdrawalRequirementPassed,
    auditReady: r.auditRequirementPassed,
    custodyReady: r.custodyRequirementPassed,
    leverageReady: r.leverageRequirementPassed,
    exposureReady: r.exposureRequirementPassed,
    operationalReady: r.operationalRequirementPassed,
    userRiskCompatible: r.userRiskCompatible,
    status: r.status,
    eligibleForComparison: r.eligibleForComparison,
    blockers: r.blockers,
  };
}

/** Deterministic diagnostics. No comparison, no ranking, no recommendation. */
export function getYieldStrategyEligibilityDiagnostics(set: YieldStrategyEligibilitySet): YieldStrategyEligibilityDiagnostics {
  const bufferStatusCounts = zeroStatusCounts();
  const excessStatusCounts = zeroStatusCounts();
  const blockerCounts: Record<string, number> = {};
  const bump = (b: string) => { blockerCounts[b] = (blockerCounts[b] ?? 0) + 1; };

  for (const r of set.bufferResults) { bufferStatusCounts[r.status] += 1; for (const b of r.blockers) bump(b); }
  for (const r of set.excessResults) { excessStatusCounts[r.status] += 1; for (const b of r.blockers) bump(b); }

  const perStrategyList = [...set.bufferResults.map(perStrategy), ...set.excessResults.map(perStrategy)];

  return {
    schemaVersion: set.schemaVersion,
    policyId: set.policyId,
    policyVersion: set.policyVersion,
    setStatus: set.status,
    emptyApprovedSet: set.emptyApprovedSet,
    bufferEvaluatedCount: set.bufferResults.length,
    excessEvaluatedCount: set.excessResults.length,
    bufferEligibleStrategyIds: [...set.bufferEligibleStrategyIds],
    excessEligibleStrategyIds: [...set.excessEligibleStrategyIds],
    blockedStrategyIds: [...set.blockedStrategyIds],
    unsupportedStrategyIds: [...set.unsupportedStrategyIds],
    bufferStatusCounts,
    excessStatusCounts,
    blockerCounts,
    perStrategy: perStrategyList,
    comparisonPerformed: false,
    rankingPerformed: false,
    leaderSelected: false,
    userCapitalEvaluated: false,
    amountCalculated: false,
    planGenerated: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Human-readable, recommendation-free explanation for one lane result. */
export function explainYieldStrategyLaneEligibility(result: YieldStrategyLaneEligibilityResult): string {
  const laneLabel = result.lane === "buffer" ? "the Safety Buffer lane" : "the Excess-USDC lane";
  if (result.eligibleForComparison) {
    return `Strategy ${result.strategyId} is approved for exact-product evaluation and satisfies every deterministic requirement for ${laneLabel}, so it may enter a later comparison. This is not a recommendation and implies no ranking.`;
  }
  const reason = result.blockers[0] ?? "eligibility_inconsistent";
  return `Strategy ${result.strategyId} is not eligible for ${laneLabel} because: ${reason}${result.blockers.length > 1 ? ` (and ${result.blockers.length - 1} more)` : ""}. This states a requirement gap only — no comparison or recommendation is made.`;
}

/**
 * Optional identity cross-reference for diagnostics: confirms a result's identity matches its market
 * snapshot + risk review (reporting only — the evaluator already enforces this).
 */
export function describeYieldStrategyEligibilityIdentity(result: YieldStrategyLaneEligibilityResult, snapshot?: YieldStrategyMarketSnapshot, review?: YieldStrategyRiskReview): string {
  const parts = [`strategy=${result.strategyId}`, `protocol=${result.protocolId}`, `address=${result.address ?? "undocumented"}`];
  if (snapshot) parts.push(`market=${snapshot.status}`);
  if (review) parts.push(`review=${review.reviewStatus}/${review.operationalStatus}`);
  return parts.join(" · ");
}
