/**
 * yieldStrategyComparison — Step 16E. The deterministic Stable Yield comparison engine: per-candidate
 * scorecards (six dimensions), per-lane comparison (ordering, material-tie, sensitivity, leader or
 * withheld-leader), the full comparison set, and fail-closed validators. It consumes ONLY 16D-eligible
 * strategies + their 16C snapshots + 16D risk reviews. It NEVER overrides 16D, never compares across
 * lanes, never inspects wallet/positions/capital, never calculates an amount, and never suggests,
 * updates product output, or executes. A zero-eligible production set yields an empty comparison.
 */
import {
  YIELD_STRATEGY_COMPARISON_DIMENSIONS,
  YIELD_STRATEGY_COMPARISON_POLICY_ID,
  YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION,
  type YieldStrategyApyBasis,
  type YieldStrategyComparisonCandidate,
  type YieldStrategyComparisonDimension,
  type YieldStrategyComparisonDimensionKey,
  type YieldStrategyComparisonLane,
  type YieldStrategyComparisonSet,
  type YieldStrategyComparisonValidationResult,
  type YieldStrategyLaneComparison,
  type YieldStrategyLaneComparisonStatus,
  type YieldStrategyLeaderSelectionReason,
  type YieldStrategyTieAnalysis,
} from "./yieldStrategyComparisonTypes";
import {
  YIELD_DATA_QUALITY_SUBWEIGHTS,
  YIELD_SOURCE_QUALITY_SCORES,
  YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD,
  YIELD_STRATEGY_COMPARISON_SCORE_PRECISION,
  YIELD_WITHDRAWAL_STATUS_SCORES,
  YIELD_WITHDRAWAL_SUBWEIGHTS,
  clamp,
  getYieldStrategyLaneWeights,
  laneFreshnessMaxAgeMs,
  laneMaxWithdrawalHours,
  minMaxNormalize,
  roundScore,
  MIN_LIQUIDITY_USD,
} from "./yieldStrategyComparisonPolicy";
import { runYieldStrategyComparisonSensitivity } from "./yieldStrategyComparisonSensitivity";
import { buildProductionYieldStrategyEligibilitySet } from "./yieldStrategyEligibility";
import type { YieldStrategyEligibilitySet, YieldStrategyLaneEligibilityResult, YieldStrategyRiskReview } from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyMarketDataSet, YieldStrategyMarketSnapshot } from "./yieldStrategyMarketDataTypes";

export const YIELD_STRATEGY_COMPARISON_EXISTS = true;
export const YIELD_STRATEGY_SCORING_EXISTS = true;

const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/* ------------------------------------------------------------------ *
 * Canonical net-APY basis (never compare gross directly against net).
 * ------------------------------------------------------------------ */
interface NetApyResult { basis: YieldStrategyApyBasis; netApyPct?: number; grossApyPct?: number; }
function canonicalNetApy(snap: YieldStrategyMarketSnapshot): NetApyResult {
  const apy = snap.apy;
  if (apy.apyDefinition === "net") {
    const v = isFiniteNum(apy.netApyPct) ? apy.netApyPct : apy.currentApyPct;
    return isFiniteNum(v) ? { basis: "net", netApyPct: v } : { basis: "incomparable" };
  }
  if (apy.apyDefinition === "gross") {
    const gross = isFiniteNum(apy.grossApyPct) ? apy.grossApyPct : apy.currentApyPct;
    const mgmt = snap.fees?.managementFeePct;
    const perf = snap.fees?.performanceFeePct;
    // v1 deterministic conversion: net = gross − management − performance (APY percentage-point
    // deductions). Requires at least one recurring fee input; otherwise the gross basis is incomparable.
    if (isFiniteNum(gross) && (isFiniteNum(mgmt) || isFiniteNum(perf))) {
      return { basis: "gross_converted", netApyPct: roundScore(gross - (mgmt ?? 0) - (perf ?? 0)), grossApyPct: gross };
    }
    return { basis: "incomparable", ...(isFiniteNum(gross) ? { grossApyPct: gross } : {}) };
  }
  return { basis: "incomparable" };
}

/** Incremental user cost (bps) NOT already reflected in canonical net APY: the explicit exit fee only. */
function incrementalUserCostBps(snap: YieldStrategyMarketSnapshot): number {
  const exit = isFiniteNum(snap.fees?.withdrawalFeePct) ? (snap.fees.withdrawalFeePct as number) : 0;
  return roundScore(exit * 100);
}

interface CandidateFacts {
  result: YieldStrategyLaneEligibilityResult;
  snapshot?: YieldStrategyMarketSnapshot;
  review?: YieldStrategyRiskReview;
  netApy: NetApyResult;
  tvlUsd?: number;
  incrementalCostBps: number;
  identityOk: boolean;
}

interface CohortContext {
  lane: YieldStrategyComparisonLane;
  weights: Record<YieldStrategyComparisonDimensionKey, number>;
  precision: number;
  netApyMin: number; netApyMax: number;
  logTvlMin: number; logTvlMax: number;
  costMinBps: number; costMaxBps: number;
}

function resolveFacts(result: YieldStrategyLaneEligibilityResult, marketDataSet: YieldStrategyMarketDataSet, reviewById: Map<string, YieldStrategyRiskReview>): CandidateFacts {
  const snapshot = marketDataSet.snapshots[result.strategyId];
  const review = reviewById.get(result.strategyId);
  const identityOk = !!snapshot && !!review && snapshot.strategyId === result.strategyId && review.strategyId === result.strategyId
    && snapshot.protocolId === result.protocolId && review.protocolId === result.protocolId
    && (result.address === undefined || (snapshot.address === result.address && review.address === result.address));
  return {
    result, snapshot, review,
    netApy: snapshot ? canonicalNetApy(snapshot) : { basis: "incomparable" },
    tvlUsd: isFiniteNum(snapshot?.tvl?.tvlUsd) ? snapshot!.tvl.tvlUsd : undefined,
    incrementalCostBps: snapshot ? incrementalUserCostBps(snapshot) : 0,
    identityOk,
  };
}

function mkDim(dimension: YieldStrategyComparisonDimensionKey, status: YieldStrategyComparisonDimension["status"], normalizedScore: number, weight: number, rawValues: YieldStrategyComparisonDimension["rawValues"], facts: string[], precision: number, warnings: string[] = [], blockers: string[] = []): YieldStrategyComparisonDimension {
  const s = clamp(roundScore(normalizedScore, precision), 0, 100);
  return { dimension, status, rawValues, normalizedScore: s, weight, weightedContribution: roundScore(s * weight / 100, precision), warnings, blockers, explanationFacts: facts };
}

export interface BuildComparisonCandidateInput {
  lane: YieldStrategyComparisonLane;
  eligibilityResult: YieldStrategyLaneEligibilityResult;
  marketSnapshot?: YieldStrategyMarketSnapshot;
  riskReview?: YieldStrategyRiskReview;
  facts: CandidateFacts;
  context: CohortContext;
}

/** Build one candidate scorecard. All six dimensions are always represented. */
export function buildYieldStrategyComparisonCandidate(input: BuildComparisonCandidateInput): YieldStrategyComparisonCandidate {
  const { lane, eligibilityResult: r, facts, context } = input;
  const snap = input.marketSnapshot ?? facts.snapshot;
  const review = input.riskReview ?? facts.review;
  const w = context.weights;
  const precision = context.precision;
  const warnings: string[] = [];
  const blockers: string[] = [];
  const notes: string[] = [];

  const base = {
    schemaVersion: "1.0.0" as const,
    policyId: YIELD_STRATEGY_COMPARISON_POLICY_ID,
    policyVersion: "1.0.0" as const,
    lane,
    strategyId: r.strategyId,
    displayName: snap?.displayName ?? r.strategyId,
    protocolId: r.protocolId,
    protocolDisplayName: snap?.protocolDisplayName ?? r.protocolId,
    ...(r.address ? { address: r.address } : {}),
    strategyType: snap?.strategyType ?? "",
    principalAsset: snap?.principalAsset ?? "USDC",
    scorePrecision: precision,
    eligibleForComparison: true as const,
    comparisonPerformed: true as const,
    rankAssigned: false as const,
    leaderSelected: false as const,
    walletPositionsEvaluated: false as const,
    userCapitalEvaluated: false as const,
    amountCalculated: false as const,
    planGenerated: false as const,
    suggestionGenerated: false as const,
    updatesProductOutput: false as const,
    transactionsEnabled: false as const,
    walletSignatureRequired: false as const,
  };

  // Guard: only eligible + identity-consistent candidates are scored.
  if (r.eligibleForComparison !== true) {
    return { ...base, status: "excluded_not_eligible", dimensions: [], rawTotalScore: 0, totalScore: 0, apyBasis: "incomparable", warnings, blockers: ["not_eligible_in_16d"], notes };
  }
  if (!snap || !review || !facts.identityOk) {
    return { ...base, status: "invalid", dimensions: [], rawTotalScore: 0, totalScore: 0, apyBasis: "incomparable", warnings, blockers: ["identity_or_input_mismatch"], notes };
  }

  const dims: YieldStrategyComparisonDimension[] = [];

  // ---- risk_quality (absolute: reviewed risk score × 10) ----
  const riskScore = review.riskScore;
  if (isFiniteNum(riskScore)) {
    dims.push(mkDim("risk_quality", "scored", clamp(riskScore * 10, 0, 100), w.risk_quality, { riskScore }, [`Reviewed risk score ${riskScore}/10 → ${clamp(riskScore * 10, 0, 100)}. Product-quality only; user risk tolerance never raises it.`], precision));
  } else {
    dims.push(mkDim("risk_quality", "invalid", 0, w.risk_quality, { riskScore: null }, ["No reviewed risk score."], precision, [], ["risk_score_missing"]));
  }

  // ---- withdrawal_liquidity (absolute composite: status 40% / delay 30% / liquidity 30%) ----
  {
    const liq = snap.liquidity;
    const status = liq?.withdrawalStatus;
    const statusScore = status && status !== "unknown" ? YIELD_WITHDRAWAL_STATUS_SCORES[status] : null;
    const maxHours = laneMaxWithdrawalHours(lane);
    const delayHours = isFiniteNum(liq?.withdrawalDelayHours) ? (liq!.withdrawalDelayHours as number) : (status === "instant_currently_available" ? 0 : undefined);
    const delayScore = delayHours === undefined ? 50 : clamp(100 * (1 - delayHours / maxHours), 0, 100);
    let liqScore: number;
    if (isFiniteNum(liq?.availableLiquidityRatio)) liqScore = clamp((liq!.availableLiquidityRatio as number) * 100, 0, 100);
    else if (isFiniteNum(liq?.availableLiquidityUsd)) liqScore = clamp(50 + (((liq!.availableLiquidityUsd as number) - MIN_LIQUIDITY_USD) / MIN_LIQUIDITY_USD) * 50, 0, 100);
    else { liqScore = 50; warnings.push("no_explicit_available_liquidity"); }
    if (statusScore === null) {
      dims.push(mkDim("withdrawal_liquidity", "invalid", 0, w.withdrawal_liquidity, { withdrawalStatus: status ?? null }, ["Unknown withdrawal status."], precision, [], ["withdrawal_status_unknown"]));
    } else {
      const composite = statusScore * YIELD_WITHDRAWAL_SUBWEIGHTS.status + delayScore * YIELD_WITHDRAWAL_SUBWEIGHTS.delay + liqScore * YIELD_WITHDRAWAL_SUBWEIGHTS.liquidity;
      dims.push(mkDim("withdrawal_liquidity", "scored", composite, w.withdrawal_liquidity, { withdrawalStatus: status ?? null, withdrawalDelayHours: delayHours ?? null, availableLiquidityUsd: isFiniteNum(liq?.availableLiquidityUsd) ? liq!.availableLiquidityUsd! : null, availableLiquidityRatio: isFiniteNum(liq?.availableLiquidityRatio) ? liq!.availableLiquidityRatio! : null, withdrawalQueueActive: liq?.withdrawalQueueActive ?? null }, [`Status ${status} (${statusScore}), delay ${delayHours ?? "n/a"}h (${roundScore(delayScore, 2)}), liquidity (${roundScore(liqScore, 2)}). Liquidity + withdrawal are separate source facts, never inferred from TVL/APY.`], precision, warnings.includes("no_explicit_available_liquidity") ? ["no_explicit_available_liquidity"] : []));
    }
  }

  // ---- net_yield (relative min-max over the lane cohort's comparable net APYs) ----
  if (facts.netApy.basis === "incomparable" || !isFiniteNum(facts.netApy.netApyPct)) {
    dims.push(mkDim("net_yield", "invalid", 0, w.net_yield, { apyBasis: facts.netApy.basis, grossApyPct: facts.netApy.grossApyPct ?? null }, ["APY basis is not comparable (gross without deterministic fee inputs, or unknown)."], precision, [], ["apy_basis_incomparable"]));
  } else {
    const degenerate = !(context.netApyMax > context.netApyMin);
    const score = degenerate ? 50 : minMaxNormalize(facts.netApy.netApyPct, context.netApyMin, context.netApyMax);
    dims.push(mkDim("net_yield", degenerate ? "neutral" : "scored", score, w.net_yield, { canonicalNetApyPct: facts.netApy.netApyPct, apyBasis: facts.netApy.basis, reportedGrossApyPct: facts.netApy.grossApyPct ?? null }, [degenerate ? "Equal/single comparable net APY → neutral 50 (no relative distinction)." : `Net APY ${facts.netApy.netApyPct}% relative to cohort [${context.netApyMin}, ${context.netApyMax}].`], precision));
  }

  // ---- market_depth (relative log10 TVL over the lane cohort) ----
  if (isFiniteNum(facts.tvlUsd) && facts.tvlUsd > 0) {
    const logTvl = Math.log10(facts.tvlUsd);
    const degenerate = !(context.logTvlMax > context.logTvlMin);
    const score = degenerate ? 50 : minMaxNormalize(logTvl, context.logTvlMin, context.logTvlMax);
    dims.push(mkDim("market_depth", degenerate ? "neutral" : "scored", score, w.market_depth, { tvlUsd: facts.tvlUsd, logTvl: roundScore(logTvl, 6) }, [degenerate ? "Equal/single TVL → neutral 50." : `log10(TVL)=${roundScore(logTvl, 4)}; log-normalized so one huge product cannot linearly dominate.`], precision));
  } else {
    dims.push(mkDim("market_depth", "invalid", 0, w.market_depth, { tvlUsd: facts.tvlUsd ?? null }, ["No valid exact-product TVL."], precision, [], ["tvl_missing"]));
  }

  // ---- user_cost (relative: lower incremental exit cost scores higher; equal → neutral 50) ----
  {
    const degenerate = !(context.costMaxBps > context.costMinBps);
    const score = degenerate ? 50 : 100 - minMaxNormalize(facts.incrementalCostBps, context.costMinBps, context.costMaxBps);
    dims.push(mkDim("user_cost", degenerate ? "neutral" : "scored", score, w.user_cost, { incrementalUserCostBps: facts.incrementalCostBps }, [degenerate ? "Equal incremental cost across cohort → neutral 50." : `Incremental exit cost ${facts.incrementalCostBps} bps (recurring fees already in net APY are not counted again).`], precision));
  }

  // ---- data_quality (absolute: provenance 60% / freshness-remaining 40%) ----
  {
    const kind = snap.provenance?.kind;
    const prov = kind && kind !== "none" && snap.provenance.browserFetched === false ? YIELD_SOURCE_QUALITY_SCORES[kind] : null;
    const maxAge = laneFreshnessMaxAgeMs(lane);
    const ageMs = isFiniteNum(snap.ageMs) ? (snap.ageMs as number) : (snap.fetchedAt ? Math.max(0, Date.parse(snap.checkedAt) - Date.parse(snap.fetchedAt)) : undefined);
    if (prov === null || ageMs === undefined) {
      dims.push(mkDim("data_quality", "invalid", 0, w.data_quality, { provenanceKind: kind ?? null, ageMs: ageMs ?? null }, ["Invalid provenance or unknown age."], precision, [], ["provenance_or_age_invalid"]));
    } else {
      const freshnessRemaining = clamp(100 * (1 - ageMs / maxAge), 0, 100);
      const composite = prov * YIELD_DATA_QUALITY_SUBWEIGHTS.provenance + freshnessRemaining * YIELD_DATA_QUALITY_SUBWEIGHTS.freshness;
      dims.push(mkDim("data_quality", "scored", composite, w.data_quality, { provenanceKind: kind, provenanceScore: prov, freshnessRemaining: roundScore(freshnessRemaining, 2) }, [`Provenance ${kind} (${prov}), freshness remaining ${roundScore(freshnessRemaining, 2)}%.`], precision));
    }
  }

  // ---- Total ----
  const rawTotalScore = roundScore(dims.reduce((s, d) => s + d.normalizedScore * d.weight / 100, 0), precision);
  const totalScore = roundScore(dims.reduce((s, d) => s + d.weightedContribution, 0), precision);
  const hasNetYieldInvalid = dims.find((d) => d.dimension === "net_yield")!.status === "invalid";
  const otherInvalid = dims.some((d) => d.dimension !== "net_yield" && d.status === "invalid");
  const status: YieldStrategyComparisonCandidate["status"] = otherInvalid ? "invalid" : hasNetYieldInvalid ? "blocked_missing_comparable_data" : "scored";
  if (hasNetYieldInvalid) blockers.push("apy_basis_incomparable");

  return {
    ...base,
    status,
    dimensions: dims,
    rawTotalScore,
    totalScore,
    apyBasis: facts.netApy.basis,
    ...(isFiniteNum(facts.netApy.netApyPct) ? { canonicalNetApyPct: facts.netApy.netApyPct } : {}),
    ...(isFiniteNum(facts.netApy.grossApyPct) ? { reportedGrossApyPct: facts.netApy.grossApyPct } : {}),
    incrementalUserCostBps: facts.incrementalCostBps,
    warnings,
    blockers,
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * Lane comparison.
 * ------------------------------------------------------------------ */
export interface CompareLaneInput {
  lane: YieldStrategyComparisonLane;
  eligibilitySet: YieldStrategyEligibilitySet;
  marketDataSet: YieldStrategyMarketDataSet;
  riskReviews?: YieldStrategyRiskReview[];
  checkedAt: string;
}

function emptyTie(threshold: number): YieldStrategyTieAnalysis {
  return { materialTie: false, tieThreshold: threshold, tiedStrategyIds: [] };
}

/** Compare all 16D-eligible strategies for ONE lane. Deterministic; no cross-lane comparison. */
export function compareYieldStrategiesForLane(input: CompareLaneInput): YieldStrategyLaneComparison {
  const { lane, eligibilitySet, marketDataSet, checkedAt } = input;
  const reviews = input.riskReviews ?? [];
  const reviewById = new Map(reviews.map((r) => [r.strategyId, r] as const));
  const threshold = YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD;
  const precision = YIELD_STRATEGY_COMPARISON_SCORE_PRECISION;
  const weights = getYieldStrategyLaneWeights(lane);

  const laneResults = lane === "buffer" ? eligibilitySet.bufferResults : eligibilitySet.excessResults;
  const eligible = laneResults.filter((r) => r.eligibleForComparison === true); // canonical registry order preserved

  const baseResult = {
    schemaVersion: "1.0.0" as const,
    policyId: YIELD_STRATEGY_COMPARISON_POLICY_ID,
    policyVersion: "1.0.0" as const,
    lane,
    checkedAt,
    walletPositionsEvaluated: false as const,
    userCapitalEvaluated: false as const,
    amountCalculated: false as const,
    planGenerated: false as const,
    suggestionGenerated: false as const,
    updatesProductOutput: false as const,
    transactionsEnabled: false as const,
    walletSignatureRequired: false as const,
    warnings: [] as string[],
    blockers: [] as string[],
  };

  // Empty eligible set.
  if (eligible.length === 0) {
    return {
      ...baseResult, status: "empty_eligible_set", candidateScorecards: [], orderedStrategyIds: [],
      leaderSelectionReason: "none_empty_set", tieAnalysis: emptyTie(threshold),
      sensitivityAnalysis: runYieldStrategyComparisonSensitivity({ candidates: [], baselineWeights: weights }),
      notes: ["No strategies are currently eligible for this lane (valid empty state)."],
    };
  }

  // Resolve facts + cohort ranges.
  const facts = eligible.map((r) => resolveFacts(r, marketDataSet, reviewById));
  const comparableNetApys = facts.filter((f) => f.netApy.basis !== "incomparable" && isFiniteNum(f.netApy.netApyPct)).map((f) => f.netApy.netApyPct as number);
  const logTvls = facts.filter((f) => isFiniteNum(f.tvlUsd) && (f.tvlUsd as number) > 0).map((f) => Math.log10(f.tvlUsd as number));
  const costs = facts.map((f) => f.incrementalCostBps);
  const context: CohortContext = {
    lane, weights, precision,
    netApyMin: comparableNetApys.length ? Math.min(...comparableNetApys) : 0,
    netApyMax: comparableNetApys.length ? Math.max(...comparableNetApys) : 0,
    logTvlMin: logTvls.length ? Math.min(...logTvls) : 0,
    logTvlMax: logTvls.length ? Math.max(...logTvls) : 0,
    costMinBps: costs.length ? Math.min(...costs) : 0,
    costMaxBps: costs.length ? Math.max(...costs) : 0,
  };

  const scorecards = facts.map((f) => buildYieldStrategyComparisonCandidate({ lane, eligibilityResult: f.result, marketSnapshot: f.snapshot, riskReview: f.review, facts: f, context }));
  const scored = scorecards.filter((c) => c.status === "scored");
  const incomparable = scorecards.some((c) => c.status === "blocked_missing_comparable_data");
  const anyInvalid = scorecards.some((c) => c.status === "invalid");

  // Ordering: scored by total desc (stable → canonical order for equal scores), then the rest in canonical order.
  const orderedScored = [...scored].sort((a, b) => b.totalScore - a.totalScore);
  const rest = scorecards.filter((c) => c.status !== "scored");
  const orderedStrategyIds = [...orderedScored, ...rest].map((c) => c.strategyId);

  // Tie analysis (over scored candidates).
  const tie: YieldStrategyTieAnalysis = emptyTie(threshold);
  if (orderedScored.length >= 1) tie.topStrategyId = orderedScored[0].strategyId;
  if (orderedScored.length >= 2) {
    tie.secondStrategyId = orderedScored[1].strategyId;
    tie.scoreDifference = roundScore(orderedScored[0].totalScore - orderedScored[1].totalScore, precision);
    tie.materialTie = tie.scoreDifference <= threshold;
    tie.tiedStrategyIds = orderedScored.filter((c) => roundScore(orderedScored[0].totalScore - c.totalScore, precision) <= threshold).map((c) => c.strategyId);
  } else if (orderedScored.length === 1) {
    tie.tiedStrategyIds = [orderedScored[0].strategyId];
  }

  const mk = (status: YieldStrategyLaneComparisonStatus, reason: YieldStrategyLeaderSelectionReason, leaderId: string | undefined, leaderScore: number | undefined, sensitivity: YieldStrategyLaneComparison["sensitivityAnalysis"], note: string): YieldStrategyLaneComparison => ({
    ...baseResult, status, candidateScorecards: scorecards, orderedStrategyIds,
    ...(leaderId ? { comparisonLeaderStrategyId: leaderId } : {}),
    ...(leaderScore !== undefined ? { comparisonLeaderScore: leaderScore } : {}),
    leaderSelectionReason: reason, tieAnalysis: tie, sensitivityAnalysis: sensitivity, notes: [note],
  });

  const naSensitivity = (single: boolean) => runYieldStrategyComparisonSensitivity({ candidates: single ? [{ strategyId: eligible[0].strategyId, dimensionScores: {} as Record<YieldStrategyComparisonDimensionKey, number> }] : [], baselineWeights: weights });

  // Single eligible candidate.
  if (eligible.length === 1) {
    const only = scorecards[0];
    if (only.status !== "scored") return mk("invalid", "none_invalid", undefined, undefined, naSensitivity(true), "The only eligible candidate could not be scored.");
    return mk("single_eligible_candidate", "only_eligible_candidate", only.strategyId, only.totalScore, naSensitivity(true), "This is the only strategy currently eligible for this lane. No multi-candidate comparison was possible.");
  }

  // Incomparable / invalid data withholds the leader.
  if (anyInvalid) return mk("invalid", "none_invalid", undefined, undefined, naSensitivity(false), "A candidate scorecard is invalid; leader withheld.");
  if (incomparable) return mk("leader_withheld_incomparable_data", "none_incomparable_data", undefined, undefined, naSensitivity(false), "The APY basis is not comparable across all candidates (gross vs net / unknown); leader withheld.");

  // Material tie withholds the leader.
  if (tie.materialTie) {
    const sensitivity = runYieldStrategyComparisonSensitivity({ candidates: orderedScored.map((c) => ({ strategyId: c.strategyId, dimensionScores: dimScoreMap(c) })), baselineWeights: weights, baselineLeaderStrategyId: orderedScored[0].strategyId });
    return mk("leader_withheld_tie", "none_material_tie", undefined, undefined, sensitivity, "The top two strategies are within the material-tie threshold; the comparison leader is withheld.");
  }

  // Sensitivity gate.
  const sensitivity = runYieldStrategyComparisonSensitivity({ candidates: orderedScored.map((c) => ({ strategyId: c.strategyId, dimensionScores: dimScoreMap(c) })), baselineWeights: weights, baselineLeaderStrategyId: orderedScored[0].strategyId });
  if (sensitivity.status === "unstable") return mk("leader_withheld_sensitivity", "none_sensitivity_failed", undefined, undefined, sensitivity, "The comparison leader changes under an approved weight-sensitivity scenario; leader withheld.");

  return mk("complete", "highest_stable_score", orderedScored[0].strategyId, orderedScored[0].totalScore, sensitivity, `${orderedScored[0].strategyId} currently leads WealthSmith's ${lane} comparison with a stable highest score.`);
}

function dimScoreMap(c: YieldStrategyComparisonCandidate): Record<YieldStrategyComparisonDimensionKey, number> {
  const out = {} as Record<YieldStrategyComparisonDimensionKey, number>;
  for (const d of c.dimensions) out[d.dimension] = d.normalizedScore;
  for (const k of YIELD_STRATEGY_COMPARISON_DIMENSIONS) if (!(k in out)) out[k] = 0;
  return out;
}

/* ------------------------------------------------------------------ *
 * Comparison set (both lanes).
 * ------------------------------------------------------------------ */
export interface BuildComparisonSetInput {
  eligibilitySet: YieldStrategyEligibilitySet;
  marketDataSet: YieldStrategyMarketDataSet;
  riskReviews?: YieldStrategyRiskReview[];
  checkedAt: string;
}

export function buildYieldStrategyComparisonSet(input: BuildComparisonSetInput): YieldStrategyComparisonSet {
  const { eligibilitySet, marketDataSet, riskReviews, checkedAt } = input;
  const bufferComparison = compareYieldStrategiesForLane({ lane: "buffer", eligibilitySet, marketDataSet, riskReviews, checkedAt });
  const excessComparison = compareYieldStrategiesForLane({ lane: "excess", eligibilitySet, marketDataSet, riskReviews, checkedAt });
  return {
    schemaVersion: "1.0.0" as const,
    policyId: YIELD_STRATEGY_COMPARISON_POLICY_ID,
    policyVersion: "1.0.0" as const,
    checkedAt,
    bufferComparison,
    excessComparison,
    ...(bufferComparison.comparisonLeaderStrategyId ? { bufferComparisonLeaderStrategyId: bufferComparison.comparisonLeaderStrategyId } : {}),
    ...(excessComparison.comparisonLeaderStrategyId ? { excessComparisonLeaderStrategyId: excessComparison.comparisonLeaderStrategyId } : {}),
    emptyApprovedSet: eligibilitySet.emptyApprovedSet,
    emptyBufferEligibleSet: bufferComparison.candidateScorecards.length === 0,
    emptyExcessEligibleSet: excessComparison.candidateScorecards.length === 0,
    comparisonPerformed: true,
    rankingPerformed: true,
    walletPositionsEvaluated: false,
    userCapitalEvaluated: false,
    amountCalculated: false,
    planGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    warnings: [],
    blockers: [],
    notes: [eligibilitySet.emptyApprovedSet ? "No approved products; both lane comparisons are empty (valid)." : "Buffer and excess compared separately; no cross-lane ranking."],
  };
}

/** The canonical production comparison set: production eligibility (empty) + no reviews. */
export function buildProductionYieldStrategyComparisonSet(marketDataSet: YieldStrategyMarketDataSet, checkedAt: string): YieldStrategyComparisonSet {
  const eligibilitySet = buildProductionYieldStrategyEligibilitySet(marketDataSet, checkedAt);
  return buildYieldStrategyComparisonSet({ eligibilitySet, marketDataSet, riskReviews: [], checkedAt });
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export function validateYieldStrategyComparisonCandidate(candidate: unknown): YieldStrategyComparisonValidationResult {
  const errors: string[] = [];
  if (!candidate || typeof candidate !== "object") return { valid: false, errors: ["candidate_not_an_object"] };
  const c = candidate as YieldStrategyComparisonCandidate;
  if (c.schemaVersion !== YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (c.policyId !== YIELD_STRATEGY_COMPARISON_POLICY_ID) errors.push("wrong_policy_id");
  if (c.lane !== "buffer" && c.lane !== "excess") errors.push("unsupported_lane");
  const flagsOff = c.rankAssigned === false && c.leaderSelected === false && c.walletPositionsEvaluated === false && c.userCapitalEvaluated === false && c.amountCalculated === false && c.planGenerated === false && c.suggestionGenerated === false && c.updatesProductOutput === false && c.transactionsEnabled === false && c.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");
  if (c.status === "scored") {
    if (c.dimensions.length !== YIELD_STRATEGY_COMPARISON_DIMENSIONS.length) errors.push("wrong_dimension_count");
    const keys = c.dimensions.map((d) => d.dimension);
    if (new Set(keys).size !== keys.length) errors.push("duplicate_dimension");
    for (const d of YIELD_STRATEGY_COMPARISON_DIMENSIONS) if (!keys.includes(d)) errors.push(`missing_dimension_${d}`);
    for (const d of c.dimensions) {
      if (!(YIELD_STRATEGY_COMPARISON_DIMENSIONS as readonly string[]).includes(d.dimension)) errors.push(`unknown_dimension_${d.dimension}`);
      if (!(isFiniteNum(d.normalizedScore) && d.normalizedScore >= 0 && d.normalizedScore <= 100)) errors.push(`invalid_score_${d.dimension}`);
      if (!(isFiniteNum(d.weight) && d.weight >= 0)) errors.push(`invalid_weight_${d.dimension}`);
      if (roundScore(d.normalizedScore * d.weight / 100, c.scorePrecision) !== d.weightedContribution) errors.push(`invalid_contribution_${d.dimension}`);
    }
    const sum = roundScore(c.dimensions.reduce((s, d) => s + d.weightedContribution, 0), c.scorePrecision);
    if (sum !== c.totalScore) errors.push("total_score_mismatch");
    if (!(c.totalScore >= 0 && c.totalScore <= 100)) errors.push("total_out_of_range");
  }
  return { valid: errors.length === 0, errors };
}

export function validateYieldStrategyLaneComparison(comparison: unknown): YieldStrategyComparisonValidationResult {
  const errors: string[] = [];
  if (!comparison || typeof comparison !== "object") return { valid: false, errors: ["comparison_not_an_object"] };
  const cmp = comparison as YieldStrategyLaneComparison;
  if (cmp.schemaVersion !== YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (cmp.policyId !== YIELD_STRATEGY_COMPARISON_POLICY_ID) errors.push("wrong_policy_id");
  if (cmp.lane !== "buffer" && cmp.lane !== "excess") errors.push("unsupported_lane");
  const flagsOff = cmp.walletPositionsEvaluated === false && cmp.userCapitalEvaluated === false && cmp.amountCalculated === false && cmp.planGenerated === false && cmp.suggestionGenerated === false && cmp.updatesProductOutput === false && cmp.transactionsEnabled === false && cmp.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");

  const leader = cmp.comparisonLeaderStrategyId;
  const hasLeader = leader !== undefined;
  // Leader-status consistency.
  if (cmp.status === "empty_eligible_set" && (hasLeader || cmp.candidateScorecards.length > 0)) errors.push("empty_with_leader");
  if (cmp.status === "leader_withheld_tie" && (hasLeader || !cmp.tieAnalysis.materialTie)) errors.push("tie_leader_inconsistent");
  if (cmp.status === "leader_withheld_sensitivity" && (hasLeader || cmp.sensitivityAnalysis.status !== "unstable")) errors.push("sensitivity_leader_inconsistent");
  if (cmp.status === "leader_withheld_incomparable_data" && hasLeader) errors.push("incomparable_with_leader");
  if (cmp.status === "single_eligible_candidate") {
    const scored = cmp.candidateScorecards.filter((c) => c.status === "scored");
    if (!hasLeader || scored.length !== 1 || cmp.candidateScorecards[0]?.strategyId !== leader) errors.push("single_candidate_inconsistent");
    if (cmp.leaderSelectionReason !== "only_eligible_candidate") errors.push("single_wrong_reason");
  }
  if (cmp.status === "complete") {
    if (!hasLeader) errors.push("complete_without_leader");
    if (cmp.tieAnalysis.materialTie) errors.push("complete_with_material_tie");
    if (cmp.sensitivityAnalysis.status !== "stable") errors.push("complete_without_stable_sensitivity");
    if (cmp.leaderSelectionReason !== "highest_stable_score") errors.push("complete_wrong_reason");
  }
  // Ordering: scored candidates must be non-increasing by totalScore.
  const scored = cmp.orderedStrategyIds.map((id) => cmp.candidateScorecards.find((c) => c.strategyId === id)).filter((c): c is YieldStrategyComparisonCandidate => !!c && c.status === "scored");
  for (let i = 1; i < scored.length; i++) if (scored[i - 1].totalScore < scored[i].totalScore - 1e-9) errors.push("order_not_by_score");
  // Only eligible candidates appear; each scorecard validates.
  for (const c of cmp.candidateScorecards) {
    if (c.eligibleForComparison !== true) errors.push(`ineligible_candidate_${c.strategyId}`);
    const v = validateYieldStrategyComparisonCandidate(c);
    if (!v.valid) errors.push(`candidate_${c.strategyId}:${v.errors.join("/")}`);
    if (c.lane !== cmp.lane) errors.push(`candidate_lane_mismatch_${c.strategyId}`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateYieldStrategyComparisonSet(set: unknown): YieldStrategyComparisonValidationResult {
  const errors: string[] = [];
  if (!set || typeof set !== "object") return { valid: false, errors: ["set_not_an_object"] };
  const s = set as YieldStrategyComparisonSet;
  if (s.schemaVersion !== YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (s.policyId !== YIELD_STRATEGY_COMPARISON_POLICY_ID) errors.push("wrong_policy_id");
  const flagsOff = s.walletPositionsEvaluated === false && s.userCapitalEvaluated === false && s.amountCalculated === false && s.planGenerated === false && s.suggestionGenerated === false && s.updatesProductOutput === false && s.transactionsEnabled === false && s.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");
  if (s.bufferComparison.lane !== "buffer") errors.push("buffer_lane_wrong");
  if (s.excessComparison.lane !== "excess") errors.push("excess_lane_wrong");
  // No cross-lane candidate leakage.
  const bufferIds = new Set(s.bufferComparison.candidateScorecards.map((c) => c.strategyId));
  for (const c of s.excessComparison.candidateScorecards) if (c.lane !== "excess") errors.push(`excess_has_buffer_${c.strategyId}`);
  void bufferIds;
  const vb = validateYieldStrategyLaneComparison(s.bufferComparison);
  if (!vb.valid) errors.push(...vb.errors.map((e) => `buffer:${e}`));
  const ve = validateYieldStrategyLaneComparison(s.excessComparison);
  if (!ve.valid) errors.push(...ve.errors.map((e) => `excess:${e}`));
  if (s.emptyApprovedSet === true && (s.bufferComparison.status !== "empty_eligible_set" || s.excessComparison.status !== "empty_eligible_set")) errors.push("empty_approved_but_nonempty_comparison");
  return { valid: errors.length === 0, errors };
}
