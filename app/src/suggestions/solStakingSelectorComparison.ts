/**
 * solStakingSelectorComparison — Step 14W. The deterministic, READ-ONLY SOL staking selector
 * comparison. Given the Step 14V selector-ready normalized candidates and fresh comparable
 * data, it answers: "which candidate LEADS under WealthSmith's explicit safety-first comparison
 * policy, and exactly why?" — with a transparent per-dimension breakdown and a deterministic
 * ranking.
 *
 * It is COMPARISON ONLY. It scores only selector-ready candidates (never INF, never
 * stale/partial/invalid/missing candidates), uses only genuinely cross-candidate comparable
 * metrics (reviewed risk score, 30-day APY, current APY, transparent APY stability), keeps
 * adoption/fees/exit/token model as zero-weight descriptive context, identifies a "comparison
 * leader" (rank 1) — and NEVER activates it. It does not change `selectedProtocolId`, does not
 * set any product `currentWinner`/`selectedByProtocolLogic`, does not enable multi-protocol
 * selection, does not touch UI / Top Pick / engine ordering, and adds no transaction/signature
 * path.
 */
import {
  SOL_STAKING_SELECTOR_POLICY,
  SOL_STAKING_SELECTOR_POLICY_ID,
  SOL_STAKING_SELECTOR_POLICY_VERSION,
  validateSolStakingSelectorPolicy,
  type SolStakingSelectorPolicy,
} from "./solStakingSelectorPolicy";
import type {
  SolStakingSelectorCandidateResult,
  SolStakingSelectorComparisonResult,
  SolStakingSelectorContextMetric,
  SolStakingSelectorDimensionScore,
} from "./solStakingSelectorTypes";
import {
  validateNormalizedSolStakingCandidateSet,
  listSelectorReadyNormalizedCandidates,
} from "./solStakingCandidateNormalization";
import type { NormalizedSolStakingCandidate, NormalizedSolStakingCandidateSet } from "./solStakingCandidateNormalizationTypes";
import { JITOSOL_BETA_PROTOCOL_ID } from "./jitoSolBetaActivation";

/* ------------------------------------------------------------------ *
 * No-activation flags.
 * ------------------------------------------------------------------ */
export const SOL_STAKING_SELECTOR_COMPARISON_EXISTS = true;
export const SOL_STAKING_SELECTOR_ACTIVATION_ENABLED = false;
export const SOL_STAKING_SELECTOR_UPDATES_SELECTED_PROTOCOL = false;
export const SOL_STAKING_SELECTOR_UPDATES_TOP_PICK = false;
export const SOL_STAKING_SELECTOR_UPDATES_ENGINE_ORDERING = false;
export const SOL_STAKING_SELECTOR_UPDATES_PRODUCT_UI = false;
export const SOL_STAKING_SELECTOR_ENABLES_TRANSACTIONS = false;
export const SOL_STAKING_SELECTOR_REQUIRES_SIGNATURE = false;

/* ------------------------------------------------------------------ *
 * Deterministic math helpers.
 * ------------------------------------------------------------------ */
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
function roundTo(n: number, precision: number): number {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}

export interface CohortNormalizeOptions {
  minimumRange: number;
  precision: number;
}

/**
 * Higher value → higher score. midpoint-centred, range-limited so a narrow cohort is not
 * stretched to a full 0–10 spread. Equal values all score 5. Deterministic.
 */
export function normalizeHigherIsBetter(values: number[], options: CohortNormalizeOptions): number[] {
  if (values.length === 0) return [];
  const cohortMin = Math.min(...values);
  const cohortMax = Math.max(...values);
  const midpoint = (cohortMin + cohortMax) / 2;
  const actualRange = cohortMax - cohortMin;
  const normalizationRange = Math.max(actualRange, options.minimumRange);
  return values.map((v) => roundTo(clamp(5 + ((v - midpoint) / normalizationRange) * 10, 0, 10), options.precision));
}

/**
 * Lower value → higher score (used for absolute APY delta as a transparent consistency signal —
 * NOT a risk score, NOT a stability guarantee). Equal values all score 5. Deterministic.
 */
export function normalizeLowerIsBetter(values: number[], options: CohortNormalizeOptions): number[] {
  if (values.length === 0) return [];
  const cohortMin = Math.min(...values);
  const cohortMax = Math.max(...values);
  const midpoint = (cohortMin + cohortMax) / 2;
  const actualRange = cohortMax - cohortMin;
  const normalizationRange = Math.max(actualRange, options.minimumRange);
  return values.map((v) => roundTo(clamp(5 - ((v - midpoint) / normalizationRange) * 10, 0, 10), options.precision));
}

/* ------------------------------------------------------------------ *
 * Comparable-metric extraction.
 * ------------------------------------------------------------------ */
interface ScorableInput {
  candidate: NormalizedSolStakingCandidate;
  canonicalOrderIndex: number;
  reviewedRiskScore: number;
  apy30d: number;
  currentApy: number;
  absApyDelta: number;
}

const numOf = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function toScorable(candidate: NormalizedSolStakingCandidate, canonicalOrderIndex: number): ScorableInput | undefined {
  const reviewedRiskScore = numOf(candidate.risk.reviewedRiskScore.value);
  const apy30d = candidate.yield.apy30dPct.status === "available" ? numOf(candidate.yield.apy30dPct.value) : undefined;
  const currentApy = candidate.yield.currentApyPct.status === "available" ? numOf(candidate.yield.currentApyPct.value) : undefined;
  const absApyDelta = candidate.yield.absoluteApyDeltaPctPoints.status === "available" ? numOf(candidate.yield.absoluteApyDeltaPctPoints.value) : undefined;
  if (reviewedRiskScore == null || reviewedRiskScore < 0 || reviewedRiskScore > 10) return undefined;
  if (apy30d == null || currentApy == null || absApyDelta == null) return undefined;
  return { candidate, canonicalOrderIndex, reviewedRiskScore, apy30d, currentApy, absApyDelta };
}

/* ------------------------------------------------------------------ *
 * Context metrics (zero weight, never scored).
 * ------------------------------------------------------------------ */
function ctx(key: string, value: number | string | boolean | undefined, unit: string | undefined, scope: SolStakingSelectorContextMetric["comparisonScope"], note: string): SolStakingSelectorContextMetric {
  return { key, ...(value !== undefined ? { value } : {}), ...(unit ? { unit } : {}), comparisonScope: scope, usedInScore: false, notes: [note] };
}

function buildContext(c: NormalizedSolStakingCandidate): SolStakingSelectorCandidateResult["context"] {
  return {
    adoption: ctx(c.adoption.metricKind, c.adoption.metric.value, c.adoption.metric.unit, c.adoption.metric.comparisonScope as SolStakingSelectorContextMetric["comparisonScope"], "Adoption is not cross-type comparable; zero weight."),
    annualManagementFee: ctx("annual_management_fee_pct", c.fees.annualManagementFeePct.value, "pct", "candidate_type_specific", "Fee preserved separately; zero weight."),
    validatorCommission: ctx("validator_commission_pct", c.fees.validatorCommissionPct.value, "pct", "candidate_type_specific", "Validator commission preserved separately; zero weight."),
    directUnstakeFee: ctx("direct_unstake_fee_pct", c.fees.directUnstakeFeePct.value, "pct", "candidate_type_specific", "Direct-unstake fee preserved separately; zero weight."),
    exitModel: ctx("exit_delay_model", c.exit.delayModel, undefined, "descriptive_only", "Exit mechanics are descriptive; zero weight."),
    tokenModel: ctx("token_model", c.tokenModel, undefined, "descriptive_only", "Token model is descriptive; zero weight."),
  };
}

/* ------------------------------------------------------------------ *
 * Tie-break comparison.
 * ------------------------------------------------------------------ */
interface Scored extends ScorableInput {
  reviewedNormalized: number;
  apy30dNormalized: number;
  currentApyNormalized: number;
  apyStabilityNormalized: number;
  totalScore: number;
}

/** The minimal fields the deterministic rank chain compares. Exported for testability. */
export interface SelectorRankable {
  totalScore: number;
  reviewedRiskScore: number;
  apy30d: number;
  absApyDelta: number;
  currentApy: number;
  canonicalOrderIndex: number;
}

/** The deciding tie-break dimension between two candidates whose totals are within epsilon. */
export function decidingTieBreak(a: SelectorRankable, b: SelectorRankable): string | null {
  if (a.reviewedRiskScore !== b.reviewedRiskScore) return "reviewed_risk_score";
  if (a.apy30d !== b.apy30d) return "apy_30d";
  if (a.absApyDelta !== b.absApyDelta) return "apy_stability";
  if (a.currentApy !== b.currentApy) return "current_apy";
  if (a.canonicalOrderIndex !== b.canonicalOrderIndex) return "canonical_order";
  return null;
}

/** The full deterministic rank comparator: total → risk → 30d APY → lower abs delta → current APY → canonical order. */
export function compareForRank(a: SelectorRankable, b: SelectorRankable, epsilon: number): number {
  if (Math.abs(a.totalScore - b.totalScore) > epsilon) return b.totalScore - a.totalScore; // higher total first
  if (a.reviewedRiskScore !== b.reviewedRiskScore) return b.reviewedRiskScore - a.reviewedRiskScore; // higher risk score
  if (a.apy30d !== b.apy30d) return b.apy30d - a.apy30d; // higher 30d APY
  if (a.absApyDelta !== b.absApyDelta) return a.absApyDelta - b.absApyDelta; // lower abs delta
  if (a.currentApy !== b.currentApy) return b.currentApy - a.currentApy; // higher current APY
  return a.canonicalOrderIndex - b.canonicalOrderIndex; // earlier canonical order
}

/* ------------------------------------------------------------------ *
 * Build.
 * ------------------------------------------------------------------ */
export interface BuildSelectorComparisonOptions {
  checkedAt: string;
  generatedAt?: string;
  policy?: SolStakingSelectorPolicy;
}

function dimension(
  key: SolStakingSelectorDimensionScore["dimension"],
  rawValue: number,
  rawUnit: SolStakingSelectorDimensionScore["rawUnit"],
  normalizedScore: number,
  weight: number,
  precision: number,
  methodology: string,
  sourceNotes: string[],
): SolStakingSelectorDimensionScore {
  return { dimension: key, rawValue, rawUnit, normalizedScore, weight, weightedContribution: roundTo(normalizedScore * weight, precision), methodology, sourceNotes };
}

/**
 * Build the deterministic read-only selector comparison from a Step 14V normalized set.
 * Validates the set, takes only selector-ready candidates (>= 2), scores the four comparable
 * dimensions, ranks with the policy tie-break chain, and identifies a comparison leader — never
 * activating it.
 */
export function buildSolStakingSelectorComparison(
  normalizedSet: NormalizedSolStakingCandidateSet,
  options: BuildSelectorComparisonOptions,
): SolStakingSelectorComparisonResult {
  const policy = options.policy ?? SOL_STAKING_SELECTOR_POLICY;
  const precision = policy.scorePrecision;
  const checkedAt = options.checkedAt;
  const generatedAt = options.generatedAt ?? checkedAt;
  const currentSelectedCandidateId = JITOSOL_BETA_PROTOCOL_ID;

  const base = (status: SolStakingSelectorComparisonResult["status"], extra: Partial<SolStakingSelectorComparisonResult> = {}): SolStakingSelectorComparisonResult => ({
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    generatedAt,
    checkedAt,
    sourceNormalizationSchemaVersion: normalizedSet?.schemaVersion ?? "unknown",
    sourceMarketCacheGeneratedAt: normalizedSet?.sourceMarketCacheGeneratedAt ?? "unknown",
    status,
    activationStatus: "comparison_only_not_activated",
    eligibleCandidateIds: [],
    excludedCandidateIds: [],
    exclusions: {},
    rankedCandidateIds: [],
    candidateResults: {},
    currentSelectedCandidateId,
    leaderDiffersFromCurrentSelection: false,
    scoreCalculated: false,
    rankingCalculated: false,
    comparisonLeaderIdentified: false,
    selectedProtocolIdChanged: false,
    winnerActivated: false,
    multiProtocolSelectionEnabled: false,
    topPickChanged: false,
    engineOrderingChanged: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    notes: ["Comparison only — the comparison leader is NOT an activated product winner. selectedProtocolId is unchanged."],
    ...extra,
  });

  // Validate the normalized set first — fail closed.
  const setValidation = validateNormalizedSolStakingCandidateSet(normalizedSet);
  if (!setValidation.valid) {
    return base("invalid_input", { notes: [`Normalized set failed validation: ${setValidation.errors.join(", ")}. Fail closed.`] });
  }
  const policyValidation = validateSolStakingSelectorPolicy(policy);
  if (!policyValidation.valid) {
    return base("invalid_input", { notes: [`Selector policy invalid: ${policyValidation.errors.join(", ")}. Fail closed.`] });
  }

  // Preserve canonical order; take only selector-ready candidates.
  const ready = listSelectorReadyNormalizedCandidates(normalizedSet);
  const excludedCandidateIds = [...normalizedSet.excludedCandidateIds];
  const exclusions: Record<string, string[]> = { ...normalizedSet.exclusions };

  const scorable: ScorableInput[] = [];
  for (const c of ready) {
    const idx = normalizedSet.canonicalCandidateOrder.indexOf(c.candidateId);
    const s = toScorable(c, idx);
    if (s) scorable.push(s);
    else {
      excludedCandidateIds.push(c.candidateId);
      exclusions[c.candidateId] = [...(exclusions[c.candidateId] ?? []), "missing_comparable_metric"];
    }
  }
  const eligibleCandidateIds = scorable.map((s) => s.candidate.candidateId); // canonical order

  if (scorable.length === 0) return base("no_ready_candidates", { eligibleCandidateIds: [], excludedCandidateIds, exclusions });
  if (scorable.length === 1) return base("insufficient_candidates", { eligibleCandidateIds, excludedCandidateIds, exclusions, notes: ["Only one selector-ready candidate — a comparison needs at least two. No scores/ranking/leader calculated."] });

  // Cohort normalization for the two APY dimensions + the stability dimension.
  const apy30dScores = normalizeHigherIsBetter(scorable.map((s) => s.apy30d), { minimumRange: policy.minApyRangePctPoints, precision });
  const currentApyScores = normalizeHigherIsBetter(scorable.map((s) => s.currentApy), { minimumRange: policy.minApyRangePctPoints, precision });
  const stabilityScores = normalizeLowerIsBetter(scorable.map((s) => s.absApyDelta), { minimumRange: policy.minStabilityRangePctPoints, precision });

  const scored: Scored[] = scorable.map((s, i) => {
    const reviewedNormalized = roundTo(s.reviewedRiskScore, precision); // used exactly, not cohort-normalized
    const apy30dNormalized = apy30dScores[i];
    const currentApyNormalized = currentApyScores[i];
    const apyStabilityNormalized = stabilityScores[i];
    const w = policy.weights;
    const total = roundTo(
      roundTo(reviewedNormalized * w.reviewed_risk_score, precision) +
        roundTo(apy30dNormalized * w.apy_30d, precision) +
        roundTo(currentApyNormalized * w.current_apy, precision) +
        roundTo(apyStabilityNormalized * w.apy_stability, precision),
      precision,
    );
    return { ...s, reviewedNormalized, apy30dNormalized, currentApyNormalized, apyStabilityNormalized, totalScore: total };
  });

  // Deterministic ranking.
  const ranked = [...scored].sort((a, b) => compareForRank(a, b, policy.tieEpsilon));

  const candidateResults: Record<string, SolStakingSelectorCandidateResult> = {};
  const rankedCandidateIds: string[] = [];
  ranked.forEach((s, i) => {
    const rank = i + 1;
    const tieBreakersApplied: string[] = [];
    if (i > 0 && Math.abs(ranked[i - 1].totalScore - s.totalScore) <= policy.tieEpsilon) {
      const tb = decidingTieBreak(ranked[i - 1], s);
      if (tb) tieBreakersApplied.push(tb);
    }
    const c = s.candidate;
    const w = policy.weights;
    const riskNotes = c.risk.reviewedRiskScore.notes ?? [];
    const result: SolStakingSelectorCandidateResult = {
      candidateId: c.candidateId,
      protocolName: c.protocolName,
      assetSymbol: c.assetSymbol,
      candidateType: c.candidateType,
      canonicalOrderIndex: s.canonicalOrderIndex,
      dimensions: {
        reviewedRiskScore: dimension("reviewed_risk_score", s.reviewedRiskScore, "score_0_10", s.reviewedNormalized, w.reviewed_risk_score, precision, "Reviewed risk score used EXACTLY (0–10); not cohort-normalized, not recalculated.", riskNotes),
        apy30d: dimension("apy_30d", s.apy30d, "pct", s.apy30dNormalized, w.apy_30d, precision, `Cohort higher-is-better, min range ${policy.minApyRangePctPoints} pct pts.`, c.yield.apy30dPct.notes ?? []),
        currentApy: dimension("current_apy", s.currentApy, "pct", s.currentApyNormalized, w.current_apy, precision, `Cohort higher-is-better, min range ${policy.minApyRangePctPoints} pct pts.`, c.yield.currentApyPct.notes ?? []),
        apyStability: dimension("apy_stability", s.absApyDelta, "pct_points", s.apyStabilityNormalized, w.apy_stability, precision, `Cohort lower-is-better on absolute APY delta, min range ${policy.minStabilityRangePctPoints} pct pts. Transparent consistency signal only — not a risk score or stability guarantee.`, c.yield.absoluteApyDeltaPctPoints.notes ?? []),
      },
      totalScore: s.totalScore,
      rank,
      context: buildContext(c),
      tieBreakersApplied,
      scoreCalculated: true,
      selectedByProtocolLogic: false,
      currentWinner: false,
      activated: false,
      updatesLiveRecommendations: false,
      transactionsEnabled: false,
      walletSignatureRequired: false,
      notes: [],
    };
    candidateResults[c.candidateId] = result;
    rankedCandidateIds.push(c.candidateId);
  });

  const comparisonLeaderCandidateId = rankedCandidateIds[0];
  return base("complete", {
    eligibleCandidateIds,
    excludedCandidateIds,
    exclusions,
    rankedCandidateIds,
    candidateResults,
    comparisonLeaderCandidateId,
    leaderDiffersFromCurrentSelection: comparisonLeaderCandidateId !== currentSelectedCandidateId,
    scoreCalculated: true,
    rankingCalculated: true,
    comparisonLeaderIdentified: true,
  });
}

/* ------------------------------------------------------------------ *
 * Validation.
 * ------------------------------------------------------------------ */
export interface SelectorValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate one candidate result. Fails closed. */
export function validateSolStakingSelectorCandidateResult(result: unknown, precision = SOL_STAKING_SELECTOR_POLICY.scorePrecision): SelectorValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as SolStakingSelectorCandidateResult;
  const tol = 5 * 10 ** -precision;
  const flagsFalse = r.scoreCalculated === true && r.selectedByProtocolLogic === false && r.currentWinner === false && r.activated === false && r.transactionsEnabled === false && r.walletSignatureRequired === false && r.updatesLiveRecommendations === false;
  if (!flagsFalse) errors.push("capability_flag_invalid");
  const dims = r.dimensions ? [r.dimensions.reviewedRiskScore, r.dimensions.apy30d, r.dimensions.currentApy, r.dimensions.apyStability] : [];
  if (dims.length !== 4) errors.push("missing_dimensions");
  let sum = 0;
  for (const d of dims) {
    if (!Number.isFinite(d.normalizedScore) || d.normalizedScore < 0 || d.normalizedScore > 10) errors.push(`normalized_out_of_range:${d.dimension}`);
    if (Math.abs(d.weightedContribution - d.normalizedScore * d.weight) > tol) errors.push(`contribution_mismatch:${d.dimension}`);
    sum += d.weightedContribution;
  }
  if (Math.abs(sum - r.totalScore) > tol) errors.push("total_mismatch");
  if (!(r.totalScore >= 0 && r.totalScore <= 10)) errors.push("total_out_of_range");
  const context = r.context ? Object.values(r.context) : [];
  if (context.length === 0 || !context.every((m) => m.usedInScore === false)) errors.push("context_used_in_score");
  return { valid: errors.length === 0, errors };
}

/** Validate the full comparison result. Fails closed on any inconsistency. */
export function validateSolStakingSelectorComparisonResult(result: unknown): SelectorValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as SolStakingSelectorComparisonResult;
  if (r.policyId !== SOL_STAKING_SELECTOR_POLICY_ID) errors.push("policy_id_mismatch");
  if (r.policyVersion !== SOL_STAKING_SELECTOR_POLICY_VERSION) errors.push("policy_version_mismatch");
  // Activation flags must stay false regardless of status.
  if (r.selectedProtocolIdChanged !== false || r.winnerActivated !== false || r.multiProtocolSelectionEnabled !== false || r.topPickChanged !== false || r.engineOrderingChanged !== false || r.transactionsEnabled !== false || r.walletSignatureRequired !== false || r.updatesLiveRecommendations !== false) {
    errors.push("activation_flag_enabled");
  }
  if (r.activationStatus !== "comparison_only_not_activated") errors.push("activation_status_invalid");

  if (r.status === "complete") {
    const ids = Object.keys(r.candidateResults);
    if (r.rankedCandidateIds.length !== ids.length) errors.push("ranked_length_mismatch");
    const ranks = ids.map((id) => r.candidateResults[id].rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) errors.push("ranks_not_contiguous");
    // rankedCandidateIds must be ordered by rank.
    for (let i = 0; i < r.rankedCandidateIds.length; i++) {
      if (r.candidateResults[r.rankedCandidateIds[i]]?.rank !== i + 1) errors.push(`ranked_order_mismatch:${i}`);
    }
    if (r.comparisonLeaderCandidateId !== r.rankedCandidateIds[0]) errors.push("leader_not_rank_1");
    for (const id of ids) {
      if (!r.eligibleCandidateIds.includes(id)) errors.push(`scored_not_eligible:${id}`);
      if (r.excludedCandidateIds.includes(id)) errors.push(`scored_but_excluded:${id}`);
      if (id === "sanctum") errors.push("inf_scored");
      const cv = validateSolStakingSelectorCandidateResult(r.candidateResults[id]);
      if (!cv.valid) errors.push(`candidate_${id}_invalid:${cv.errors.join("/")}`);
    }
  } else {
    // No scores/ranking/leader when not complete.
    if (Object.keys(r.candidateResults).length > 0) errors.push("scored_when_not_complete");
    if (r.rankedCandidateIds.length > 0) errors.push("ranked_when_not_complete");
    if (r.comparisonLeaderIdentified !== false) errors.push("leader_when_not_complete");
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ *
 * Diagnostics.
 * ------------------------------------------------------------------ */
/** Candidate results in rank order. */
export function listRankedSolStakingSelectorResults(result: SolStakingSelectorComparisonResult): SolStakingSelectorCandidateResult[] {
  return result.rankedCandidateIds.map((id) => result.candidateResults[id]).filter((c): c is SolStakingSelectorCandidateResult => c != null);
}

export interface SelectorCandidateDiagnostics {
  candidateId: string;
  rank: number;
  totalScore: number;
  raw: { reviewedRiskScore: number; apy30d: number; currentApy: number; absApyDelta: number };
  normalized: { reviewedRiskScore: number; apy30d: number; currentApy: number; apyStability: number };
  weights: { reviewedRiskScore: number; apy30d: number; currentApy: number; apyStability: number };
  weightedContributions: { reviewedRiskScore: number; apy30d: number; currentApy: number; apyStability: number };
  tieBreakersApplied: string[];
  nonScoredContextKeys: string[];
  isCurrentSelected: boolean;
  isComparisonLeader: boolean;
  activationStatus: string;
}

/** Full per-candidate diagnostics (no product-recommendation copy). */
export function getSolStakingSelectorComparisonDiagnostics(result: SolStakingSelectorComparisonResult): SelectorCandidateDiagnostics[] {
  return listRankedSolStakingSelectorResults(result).map((c) => ({
    candidateId: c.candidateId,
    rank: c.rank,
    totalScore: c.totalScore,
    raw: { reviewedRiskScore: c.dimensions.reviewedRiskScore.rawValue, apy30d: c.dimensions.apy30d.rawValue, currentApy: c.dimensions.currentApy.rawValue, absApyDelta: c.dimensions.apyStability.rawValue },
    normalized: { reviewedRiskScore: c.dimensions.reviewedRiskScore.normalizedScore, apy30d: c.dimensions.apy30d.normalizedScore, currentApy: c.dimensions.currentApy.normalizedScore, apyStability: c.dimensions.apyStability.normalizedScore },
    weights: { reviewedRiskScore: c.dimensions.reviewedRiskScore.weight, apy30d: c.dimensions.apy30d.weight, currentApy: c.dimensions.currentApy.weight, apyStability: c.dimensions.apyStability.weight },
    weightedContributions: { reviewedRiskScore: c.dimensions.reviewedRiskScore.weightedContribution, apy30d: c.dimensions.apy30d.weightedContribution, currentApy: c.dimensions.currentApy.weightedContribution, apyStability: c.dimensions.apyStability.weightedContribution },
    tieBreakersApplied: c.tieBreakersApplied,
    nonScoredContextKeys: Object.values(c.context).map((m) => m.key),
    isCurrentSelected: c.candidateId === result.currentSelectedCandidateId,
    isComparisonLeader: c.candidateId === result.comparisonLeaderCandidateId,
    activationStatus: result.activationStatus,
  }));
}

/** A structured explanation for one candidate (no product-facing copy). */
export function explainSolStakingSelectorCandidate(result: SolStakingSelectorComparisonResult, candidateId: string): SelectorCandidateDiagnostics | undefined {
  return getSolStakingSelectorComparisonDiagnostics(result).find((d) => d.candidateId === candidateId);
}
