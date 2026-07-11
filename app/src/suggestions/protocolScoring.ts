/**
 * protocolScoring — deterministic scoring + ranking of ELIGIBLE protocol
 * candidates.
 *
 * SCORING UTILITY ONLY (Step 12G). Answers "if candidates are fully eligible and
 * have complete real data, how would we rank them deterministically?" — NEVER
 * "which protocol should the user use now?". Scoring is not a recommendation and
 * ranking is not selection: `selectionMade` is always `false`, no
 * `selectedProtocolId/Name` is ever produced, and nothing is exposed in the UI.
 *
 * HONESTY: eligibility runs BEFORE scoring; missing data NEVER scores (→
 * `insufficient_data`), never gets a default/0, and never comes from a name.
 * safety > risk > liquidity > yield: APY is capped and risk is weighted heavily.
 * LP scoring is disabled until impermanent-loss risk is modeled.
 *
 * Pure helpers only — NOT wired into any suggestion/card/modal/Top Pick.
 */
import type { ProtocolStrategyType } from "./engineTypes";
import type { ProtocolMarketData, ProtocolRiskData, ProtocolSelectionInput } from "./protocolMarketData";
import type { ProtocolRegistryEntry } from "./protocolRegistry";
import { getProtocolCandidateById } from "./protocolRegistry";
import type { ProtocolEligibilityResult } from "./protocolEligibility";
import {
  MAX_APY_FOR_SCORE,
  MIN_PROTOCOL_TVL_USD,
  TARGET_TVL_FOR_FULL_SCORE_USD,
  MIN_LIQUIDITY_USD,
  TARGET_LIQUIDITY_FOR_FULL_SCORE_USD,
  MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER,
  MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD,
  MAX_PRICE_IMPACT_PCT,
} from "./engineThresholds";

/** Explicit markers: scoring is not a recommendation; ranking is not selection. */
export const SCORING_IS_RECOMMENDATION = false;
export const RANKING_IS_SELECTION = false;

export type ProtocolScoringStrategy =
  | "stable_yield"
  | "liquid_staking"
  | "staking"
  | "lending"
  | "vault"
  | "lp";

export type ProtocolScoreStatus = "scored" | "not_scored" | "insufficient_data" | "ineligible";

export type ProtocolScoreReason =
  | "candidate_ineligible"
  | "missing_market_data"
  | "missing_risk_data"
  | "missing_apy"
  | "missing_tvl"
  | "missing_risk_score"
  | "missing_withdrawal_data"
  | "missing_fee_data"
  | "missing_liquidity_data"
  | "missing_route_data"
  | "lp_risk_not_modeled"
  | "incomplete_score_inputs"
  | "scoring_disabled_for_strategy";

export interface ProtocolScoreBreakdown {
  yieldScore: number;
  riskScore: number;
  tvlScore: number;
  withdrawalScore: number;
  liquidityScore: number;
  costScore: number;
  totalScore: number;
}

export interface ProtocolCandidateScore {
  protocolId: string;
  strategyType: ProtocolStrategyType;
  assetSymbol: string;
  status: ProtocolScoreStatus;
  reasons: ProtocolScoreReason[];
  breakdown?: ProtocolScoreBreakdown;
  scoredAt: string;
}

export interface ProtocolRankingResult {
  strategyType: ProtocolStrategyType;
  assetSymbol: string;
  scores: ProtocolCandidateScore[];
  rankedProtocolIds: string[];
  selectionMade: false;
  checkedAt: string;
}

export interface ProtocolScoringContext {
  countsTowardSafetyBuffer?: boolean;
  requiresRoute?: boolean;
  strategyType?: ProtocolStrategyType;
}

interface StrategyWeights {
  risk: number;
  tvl: number;
  withdrawal: number;
  yield: number;
  liquidity: number;
  cost: number;
}

/**
 * Deterministic weights per scoring strategy (each totals 100 — validated in
 * fixtures). Never tuned toward a desired outcome; risk always outweighs yield.
 * LP is disabled until impermanent-loss modeling exists.
 */
export const SCORING_WEIGHTS: Record<ProtocolScoringStrategy, StrategyWeights | null> = {
  stable_yield: { risk: 35, withdrawal: 20, tvl: 20, yield: 15, liquidity: 5, cost: 5 },
  lending: { risk: 35, withdrawal: 20, tvl: 20, yield: 15, liquidity: 5, cost: 5 },
  liquid_staking: { risk: 30, tvl: 25, withdrawal: 20, yield: 15, liquidity: 5, cost: 5 },
  staking: { risk: 30, tvl: 25, withdrawal: 20, yield: 15, liquidity: 5, cost: 5 },
  vault: { risk: 35, tvl: 20, withdrawal: 15, yield: 15, liquidity: 10, cost: 5 },
  lp: null, // scoring disabled until impermanent-loss risk is modeled
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** ProtocolStrategyType → scoring strategy (null when scoring is not applicable). */
function scoringStrategyFor(strategyType: ProtocolStrategyType): ProtocolScoringStrategy | null {
  switch (strategyType) {
    case "staking":
      return "staking";
    case "liquid_staking":
      return "liquid_staking";
    case "lending":
      return "lending";
    case "vault":
      return "vault";
    case "lp":
      return "lp";
    default:
      return null; // e.g. "review"
  }
}

/* --- Component scores (0–100). `undefined` means the required input is missing. --- */

function yieldScore(apy?: number): number | undefined {
  if (apy == null) return undefined;
  return clamp((apy / MAX_APY_FOR_SCORE) * 100, 0, 100);
}
function riskComponentScore(riskScore?: number): number | undefined {
  if (riskScore == null) return undefined;
  return clamp((riskScore / 10) * 100, 0, 100);
}
function tvlScore(tvlUsd?: number): number | undefined {
  if (tvlUsd == null) return undefined;
  return clamp(((tvlUsd - MIN_PROTOCOL_TVL_USD) / (TARGET_TVL_FOR_FULL_SCORE_USD - MIN_PROTOCOL_TVL_USD)) * 100, 0, 100);
}
function withdrawalScore(hours: number | undefined, buffer: boolean): number | undefined {
  if (hours == null) return undefined;
  const fullAt = buffer ? 1 : MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER; // buffer: ≤1h; general: ≤24h
  const zeroAt = buffer ? MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER : MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD;
  return clamp(((zeroAt - hours) / (zeroAt - fullAt)) * 100, 0, 100);
}
function liquidityScore(liquidityUsd?: number): number | undefined {
  if (liquidityUsd == null) return undefined;
  return clamp(((liquidityUsd - MIN_LIQUIDITY_USD) / (TARGET_LIQUIDITY_FOR_FULL_SCORE_USD - MIN_LIQUIDITY_USD)) * 100, 0, 100);
}
function costScoreFromImpact(priceImpactPct?: number): number | undefined {
  if (priceImpactPct == null) return undefined;
  return clamp(((MAX_PRICE_IMPACT_PCT - priceImpactPct) / MAX_PRICE_IMPACT_PCT) * 100, 0, 100);
}

/**
 * Score ONE candidate. Eligibility must be `eligible` first; anything else is
 * `ineligible` / `insufficient_data` and is not scored. Any missing required
 * input → `insufficient_data` (never a default score).
 */
export function scoreProtocolCandidate(args: {
  candidate: ProtocolRegistryEntry | undefined;
  marketData?: ProtocolMarketData;
  riskData?: ProtocolRiskData;
  eligibilityResult: ProtocolEligibilityResult;
  strategyType: ProtocolStrategyType;
  assetSymbol: string;
  context?: ProtocolScoringContext;
  scoredAt?: string;
}): ProtocolCandidateScore {
  const { candidate, marketData, riskData, eligibilityResult, strategyType, assetSymbol } = args;
  const ctx = args.context ?? {};
  const scoredAt = args.scoredAt ?? new Date().toISOString();
  const base = (status: ProtocolScoreStatus, reasons: ProtocolScoreReason[], breakdown?: ProtocolScoreBreakdown): ProtocolCandidateScore => ({
    protocolId: candidate?.id ?? "",
    strategyType,
    assetSymbol,
    status,
    reasons,
    ...(breakdown ? { breakdown } : {}),
    scoredAt,
  });

  // Only score eligible candidates.
  if (eligibilityResult.status === "ineligible") return base("ineligible", ["candidate_ineligible"]);
  if (eligibilityResult.status !== "eligible") return base("insufficient_data", ["incomplete_score_inputs"]);

  const scoringStrategy = scoringStrategyFor(strategyType);
  if (!scoringStrategy) return base("not_scored", ["scoring_disabled_for_strategy"]);
  const weights = SCORING_WEIGHTS[scoringStrategy];
  if (scoringStrategy === "lp" || !weights) return base("insufficient_data", ["lp_risk_not_modeled"]);

  const reasons: ProtocolScoreReason[] = [];
  const y = yieldScore(marketData?.apy);
  if (y == null) reasons.push("missing_apy");
  const r = riskComponentScore(riskData?.riskScore);
  if (r == null) reasons.push("missing_risk_score");
  const t = tvlScore(marketData?.tvlUsd);
  if (t == null) reasons.push("missing_tvl");
  const w = withdrawalScore(marketData?.withdrawalTimeHours, ctx.countsTowardSafetyBuffer === true);
  if (w == null) reasons.push("missing_withdrawal_data");

  // Liquidity + cost: gated only when a route is required; otherwise neutral (but
  // cost still needs KNOWN fees — missing fees never assumed zero).
  let liq: number | undefined;
  let cost: number | undefined;
  if (ctx.requiresRoute) {
    liq = liquidityScore(marketData?.liquidityUsd);
    if (liq == null) reasons.push("missing_liquidity_data");
    cost = costScoreFromImpact(marketData?.route?.priceImpactPct);
    if (cost == null) reasons.push("missing_route_data");
  } else {
    liq = 100; // not applicable → neutral
    if (marketData?.fees == null) {
      cost = undefined;
      reasons.push("missing_fee_data");
    } else {
      cost = 100; // fees known and not a route cost → neutral
    }
  }

  if (reasons.length > 0 || y == null || r == null || t == null || w == null || liq == null || cost == null) {
    return base("insufficient_data", reasons.length > 0 ? reasons : ["incomplete_score_inputs"]);
  }

  const totalScore =
    (weights.risk * r + weights.tvl * t + weights.withdrawal * w + weights.yield * y + weights.liquidity * liq + weights.cost * cost) / 100;

  return base("scored", [], {
    yieldScore: y,
    riskScore: r,
    tvlScore: t,
    withdrawalScore: w,
    liquidityScore: liq,
    costScore: cost,
    totalScore,
  });
}

/**
 * Deterministic ranking comparator for two SCORED candidates:
 * totalScore desc → riskScore desc → tvlScore desc → withdrawalScore desc →
 * protocolId asc. Exported so the ordering can be tested directly.
 */
export function compareCandidateScores(a: ProtocolCandidateScore, b: ProtocolCandidateScore): number {
  const ab = a.breakdown;
  const bb = b.breakdown;
  if (ab && bb) {
    if (bb.totalScore !== ab.totalScore) return bb.totalScore - ab.totalScore;
    if (bb.riskScore !== ab.riskScore) return bb.riskScore - ab.riskScore;
    if (bb.tvlScore !== ab.tvlScore) return bb.tvlScore - ab.tvlScore;
    if (bb.withdrawalScore !== ab.withdrawalScore) return bb.withdrawalScore - ab.withdrawalScore;
  }
  return a.protocolId < b.protocolId ? -1 : a.protocolId > b.protocolId ? 1 : 0;
}

/**
 * Rank the candidates in a ProtocolSelectionInput using their eligibility
 * results. Scores only eligible candidates and orders them deterministically.
 * This is RANKING, not selection: `selectionMade` is always false and no
 * protocol is chosen, named, or written back to ProtocolSelection.
 */
export function rankProtocolCandidates(args: {
  input: ProtocolSelectionInput;
  eligibilityResults: ProtocolEligibilityResult[];
  context?: ProtocolScoringContext;
  checkedAt?: string;
}): ProtocolRankingResult {
  const { input } = args;
  const checkedAt = args.checkedAt ?? new Date().toISOString();
  const eligById = new Map(args.eligibilityResults.map((e) => [e.protocolId, e]));

  const scores: ProtocolCandidateScore[] = input.candidateProtocolIds.map((id) => {
    const eligibilityResult =
      eligById.get(id) ?? {
        protocolId: id,
        strategyType: input.strategyType,
        assetSymbol: input.assetSymbol,
        status: "insufficient_data" as const,
        reasons: [],
        checkedAt,
      };
    return scoreProtocolCandidate({
      candidate: getProtocolCandidateById(id),
      marketData: input.marketDataByProtocolId[id],
      riskData: input.riskDataByProtocolId[id],
      eligibilityResult,
      strategyType: input.strategyType,
      assetSymbol: input.assetSymbol,
      context: args.context,
      scoredAt: checkedAt,
    });
  });

  const rankedProtocolIds = scores
    .filter((s) => s.status === "scored")
    .slice()
    .sort(compareCandidateScores)
    .map((s) => s.protocolId);

  return {
    strategyType: input.strategyType,
    assetSymbol: input.assetSymbol,
    scores,
    rankedProtocolIds,
    selectionMade: false,
    checkedAt,
  };
}
