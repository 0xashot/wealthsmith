/**
 * solStakingSelectorDisplayGate — Step 14Y. Decides whether the current Step 14W comparison may
 * be shown to users as a DYNAMIC "Top protocol to review right now". This is a DISPLAY gate,
 * deliberately separate from the Step 14X ACTIVATION gate: display requires only a fresh, complete,
 * valid comparison with >= 2 selector-ready candidates — it does NOT require historical coverage,
 * sensitivity pass, operational readiness, or human approval (those gate automatic activation of
 * `selectedProtocolId` only). The gate never changes selection or activates anything.
 */
import type { SolStakingMarketCache } from "./solStakingMarketDataTypes";
import { validateSolStakingMarketCache, getSolStakingMarketSnapshot } from "./solStakingMarketDataCache";
import type { NormalizedSolStakingCandidateSet } from "./solStakingCandidateNormalizationTypes";
import { validateNormalizedSolStakingCandidateSet } from "./solStakingCandidateNormalization";
import type { SolStakingSelectorComparisonResult } from "./solStakingSelectorTypes";
import { validateSolStakingSelectorComparisonResult } from "./solStakingSelectorComparison";
import { SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS } from "./solStakingMarketDataSources";
import type { SolStakingSelectorDisplayGateDecision } from "./solStakingSelectorPresentationTypes";

export const SOL_STAKING_SELECTOR_DISPLAY_GATE_EXISTS = true;

export interface EvaluateDisplayGateInput {
  marketCache?: SolStakingMarketCache;
  normalizedSet?: NormalizedSolStakingCandidateSet;
  comparisonResult?: SolStakingSelectorComparisonResult;
  checkedAt: string;
}

function baseDecision(status: SolStakingSelectorDisplayGateDecision["status"], extra: Partial<SolStakingSelectorDisplayGateDecision> = {}): SolStakingSelectorDisplayGateDecision {
  return {
    status,
    canShowCurrentLeader: status === "available",
    canShowRanking: status === "available",
    eligibleCandidateCount: 0,
    blockers: [],
    warnings: [],
    activationRequiredForDisplay: false,
    historicalCoverageRequiredForDisplay: false,
    sensitivityPassRequiredForDisplay: false,
    humanApprovalRequiredForDisplay: false,
    selectedProtocolIdChanged: false,
    winnerActivated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    ...extra,
  };
}

/**
 * Evaluate the display gate. Available only when the cache/normalized-set/comparison all validate,
 * the comparison is complete with >= 2 selector-ready scored candidates, the leader is approved +
 * eligible, the comparison was generated from this exact cache, and every ranked candidate's
 * required market fields are still fresh (cache <= 24h). Fails closed otherwise.
 */
export function evaluateSolStakingSelectorDisplayGate(input: EvaluateDisplayGateInput): SolStakingSelectorDisplayGateDecision {
  const { marketCache, normalizedSet, comparisonResult, checkedAt } = input;

  // Unavailable — runtime artifact / cache missing.
  if (!marketCache || !normalizedSet || !comparisonResult) {
    return baseDecision("unavailable", { blockers: ["runtime_artifact_unavailable"] });
  }

  // Invalid — any validation fails closed.
  const cacheV = validateSolStakingMarketCache(marketCache);
  if (!cacheV.valid) return baseDecision("invalid", { blockers: ["market_cache_invalid", ...cacheV.errors] });
  const setV = validateNormalizedSolStakingCandidateSet(normalizedSet);
  if (!setV.valid) return baseDecision("invalid", { blockers: ["normalized_set_invalid", ...setV.errors] });
  const cmpV = validateSolStakingSelectorComparisonResult(comparisonResult);
  if (!cmpV.valid || comparisonResult.status === "invalid_input") return baseDecision("invalid", { blockers: ["comparison_invalid", ...cmpV.errors] });

  const marketCacheGeneratedAt = marketCache.generatedAt;
  const comparisonGeneratedAt = comparisonResult.generatedAt;

  // Comparison must have been generated from THIS cache version/timestamp.
  if (comparisonResult.sourceMarketCacheGeneratedAt !== marketCacheGeneratedAt) {
    return baseDecision("invalid", { comparisonGeneratedAt, marketCacheGeneratedAt, blockers: ["comparison_cache_timestamp_mismatch"] });
  }

  const eligibleCandidateCount = comparisonResult.eligibleCandidateIds.length;

  // Insufficient — need >= 2 scored candidates + a leader + rank 1.
  const leaderId = comparisonResult.comparisonLeaderCandidateId;
  const rank1 = comparisonResult.rankedCandidateIds[0];
  if (comparisonResult.status !== "complete" || eligibleCandidateCount < 2 || !leaderId || !rank1) {
    return baseDecision("insufficient_candidates", { comparisonGeneratedAt, marketCacheGeneratedAt, eligibleCandidateCount, blockers: ["insufficient_candidates"] });
  }

  // Every scored candidate must have been selector-ready; the leader must remain approved + eligible.
  const readySet = new Set(normalizedSet.selectorReadyCandidateIds);
  for (const id of comparisonResult.rankedCandidateIds) {
    if (!readySet.has(id)) return baseDecision("invalid", { comparisonGeneratedAt, marketCacheGeneratedAt, eligibleCandidateCount, blockers: [`scored_candidate_not_ready:${id}`] });
  }
  const leaderNorm = normalizedSet.candidates[leaderId];
  if (!leaderNorm || !leaderNorm.approval.approvedForReadOnlyReview || leaderNorm.approval.blockedByRiskApproval || !leaderNorm.readiness.eligibleForFutureSelectorInput) {
    return baseDecision("invalid", { comparisonGeneratedAt, marketCacheGeneratedAt, eligibleCandidateCount, blockers: ["leader_not_approved_or_eligible"] });
  }

  // Freshness — cache <= 24h AND every ranked candidate's required fields still fresh at checkedAt.
  const cacheAgeMs = Date.parse(checkedAt) - Date.parse(marketCacheGeneratedAt);
  const cacheStale = Number.isNaN(cacheAgeMs) || cacheAgeMs < 0 || cacheAgeMs > SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS * 3_600_000;
  let oldestFetchedMs = Number.POSITIVE_INFINITY;
  let anySnapshotStale = false;
  for (const id of comparisonResult.rankedCandidateIds) {
    const snap = getSolStakingMarketSnapshot(marketCache, id, checkedAt);
    if (!snap || snap.status !== "complete") { anySnapshotStale = true; continue; }
    for (const f of Object.values(snap.fields)) {
      if (f && !Number.isNaN(Date.parse(f.fetchedAt))) oldestFetchedMs = Math.min(oldestFetchedMs, Date.parse(f.fetchedAt));
    }
  }
  const oldestRequiredFieldFetchedAt = Number.isFinite(oldestFetchedMs) ? new Date(oldestFetchedMs).toISOString() : undefined;
  const expiresAt = Number.isFinite(oldestFetchedMs) ? new Date(oldestFetchedMs + SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS * 3_600_000).toISOString() : undefined;

  if (cacheStale || anySnapshotStale) {
    return baseDecision("stale", { comparisonGeneratedAt, marketCacheGeneratedAt, eligibleCandidateCount, ...(oldestRequiredFieldFetchedAt ? { oldestRequiredFieldFetchedAt } : {}), ...(expiresAt ? { expiresAt } : {}), blockers: ["comparison_stale"] });
  }

  return baseDecision("available", {
    comparisonGeneratedAt,
    marketCacheGeneratedAt,
    ...(oldestRequiredFieldFetchedAt ? { oldestRequiredFieldFetchedAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    eligibleCandidateCount,
  });
}
