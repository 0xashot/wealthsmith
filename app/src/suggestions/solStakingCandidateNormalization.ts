/**
 * solStakingCandidateNormalization — Step 14V. Turns the Step 14U live market cache + the
 * reviewed static facts into one shared, deterministic comparison model for Step 14W — WITHOUT
 * scoring, weighting, ranking, sorting, or selecting anything.
 *
 * Semantics are preserved via per-metric `comparisonScope`: APY (current / 30-day / transparent
 * delta) and reviewed risk score are genuinely `all_candidates`; LST TVL is `lst_only`; native
 * delegated stake is `native_only`; fees are `candidate_type_specific`; exit + token model are
 * `descriptive_only`. LST TVL (USD) and native delegated stake (SOL) are NEVER marked directly
 * comparable, no fee total is synthesized, reviewed risk scores are carried (not recalculated),
 * and no fixed hours are invented for epoch-based exits.
 *
 * `eligibleForFutureSelectorInput` is DATA-READINESS ONLY — it neither runs nor enables the
 * selector. Every capability flag stays `false`.
 */
import {
  SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER,
  SOL_STAKING_NORMALIZATION_SCHEMA_VERSION,
  type NormalizedSolStakingCandidate,
  type NormalizedSolStakingCandidateSet,
  type NormalizedSolStakingComparisonScope,
  type NormalizedSolStakingDataClass,
  type NormalizedSolStakingMetric,
  type NormalizedSolStakingMetricStatus,
  type NormalizedSolStakingMetricUnit,
} from "./solStakingCandidateNormalizationTypes";
import type { SolStakingMarketField, SolStakingMarketSnapshot } from "./solStakingMarketDataTypes";
import { validateSolStakingMarketCache, getSolStakingMarketSnapshot } from "./solStakingMarketDataCache";
import {
  SOL_STAKING_REVIEW_THRESHOLD,
  getSolStakingCandidateStaticFacts,
  type SolStakingCandidateStaticFacts,
} from "./solStakingCandidateStaticFacts";

export const SOL_STAKING_NORMALIZATION_EXISTS = true;
export const SOL_STAKING_NORMALIZATION_ENABLES_SELECTOR = false;

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/* ------------------------------------------------------------------ *
 * Metric helpers.
 * ------------------------------------------------------------------ */
interface MetricArgs<T> {
  key: string;
  unit: NormalizedSolStakingMetricUnit;
  dataClass: NormalizedSolStakingDataClass;
  comparisonScope: NormalizedSolStakingComparisonScope;
  status: NormalizedSolStakingMetricStatus;
  value?: T;
  sourceName?: string;
  sourceUrl?: string;
  sourceFetchedAt?: string;
  sourceAsOf?: string;
  sourceEpoch?: number;
  methodology?: string;
  notes?: string[];
}
function metric<T>(a: MetricArgs<T>): NormalizedSolStakingMetric<T> {
  return {
    key: a.key,
    ...(a.value !== undefined ? { value: a.value } : {}),
    unit: a.unit,
    dataClass: a.dataClass,
    comparisonScope: a.comparisonScope,
    status: a.status,
    ...(a.sourceName ? { sourceName: a.sourceName } : {}),
    ...(a.sourceUrl ? { sourceUrl: a.sourceUrl } : {}),
    ...(a.sourceFetchedAt ? { sourceFetchedAt: a.sourceFetchedAt } : {}),
    ...(a.sourceAsOf ? { sourceAsOf: a.sourceAsOf } : {}),
    ...(a.sourceEpoch != null ? { sourceEpoch: a.sourceEpoch } : {}),
    ...(a.methodology ? { methodology: a.methodology } : {}),
    notes: a.notes ?? [],
  };
}

/** Map a live market field's status to a normalized metric status. */
function liveStatus(field: SolStakingMarketField<unknown> | undefined): NormalizedSolStakingMetricStatus {
  if (!field) return "missing";
  switch (field.status) {
    case "fresh": return "available";
    case "stale": return "stale";
    case "invalid": return "invalid";
    default: return "missing";
  }
}

/** Build a live-market number metric from a snapshot field. */
function liveNumberMetric(
  key: string,
  field: SolStakingMarketField<number> | undefined,
  scope: NormalizedSolStakingComparisonScope,
  unit: NormalizedSolStakingMetricUnit,
): NormalizedSolStakingMetric<number> {
  const status = liveStatus(field);
  return metric<number>({
    key,
    unit,
    dataClass: "live_market",
    comparisonScope: scope,
    status,
    ...(field && status === "available" ? { value: field.value } : {}),
    sourceName: field?.sourceName,
    sourceUrl: field?.sourceUrl,
    sourceFetchedAt: field?.fetchedAt,
    sourceAsOf: field?.sourceAsOf,
    sourceEpoch: field?.sourceEpoch,
    methodology: field?.notes?.[0],
    notes: field?.notes ?? [],
  });
}

/* ------------------------------------------------------------------ *
 * Per-candidate normalization.
 * ------------------------------------------------------------------ */
export interface NormalizeCandidateOptions {
  checkedAt: string;
  sourceCacheGeneratedAt: string;
}

/**
 * Normalize ONE candidate from its live snapshot + reviewed static facts. Pure + deterministic.
 * Never recalculates the reviewed risk score, never scores/ranks, never mutates inputs.
 */
export function normalizeSolStakingCandidate(
  snapshot: SolStakingMarketSnapshot,
  staticFacts: SolStakingCandidateStaticFacts,
  options: NormalizeCandidateOptions,
): NormalizedSolStakingCandidate {
  const isLst = staticFacts.candidateType === "liquid_staking_token";

  // ---- Yield (APY) ----
  const currentApyPct = liveNumberMetric("current_apy_pct", snapshot.fields.currentApyPct, "all_candidates", "pct");
  const apy30dPct = liveNumberMetric("apy_30d_pct", snapshot.fields.apy30dPct, "all_candidates", "pct");

  // Transparent APY delta = current − 30-day (pct points). Never a stability score; never ranked.
  // Do not compute from stale/invalid/missing inputs.
  const bothAvailable = currentApyPct.status === "available" && apy30dPct.status === "available";
  const eitherInvalid = currentApyPct.status === "invalid" || apy30dPct.status === "invalid";
  const eitherStale = currentApyPct.status === "stale" || apy30dPct.status === "stale";
  const deltaStatus: NormalizedSolStakingMetricStatus = bothAvailable ? "available" : eitherInvalid ? "invalid" : eitherStale ? "stale" : "missing";
  const deltaValue = bothAvailable ? round4((currentApyPct.value as number) - (apy30dPct.value as number)) : undefined;
  const apyDeltaPctPoints = metric<number>({
    key: "apy_delta_pct_points",
    unit: "pct_points",
    dataClass: "derived_transparent",
    comparisonScope: "all_candidates",
    status: deltaStatus,
    ...(deltaValue !== undefined ? { value: deltaValue } : {}),
    methodology: "current_apy_pct − apy_30d_pct (transparent arithmetic; NOT a stability score, not ranked, not weighted)",
    notes: ["Transparent difference of two same-unit APYs. Sign/magnitude are not interpreted as better/worse in this step."],
  });
  const absoluteApyDeltaPctPoints = metric<number>({
    key: "absolute_apy_delta_pct_points",
    unit: "pct_points",
    dataClass: "derived_transparent",
    comparisonScope: "all_candidates",
    status: deltaStatus,
    ...(deltaValue !== undefined ? { value: Math.abs(deltaValue) } : {}),
    methodology: "abs(current_apy_pct − apy_30d_pct) (transparent arithmetic; lower/higher not interpreted here)",
    notes: ["Absolute transparent APY delta. Not interpreted, not ranked."],
  });

  // ---- Adoption (unlike units preserved) ----
  const adoptionMetricKind = isLst ? "tvl_usd" : "delegated_stake_sol";
  const adoptionField = isLst ? snapshot.fields.tvlUsd : snapshot.fields.delegatedStakeSol;
  const adoptionMetric = liveNumberMetric(adoptionMetricKind, adoptionField, isLst ? "lst_only" : "native_only", isLst ? "usd" : "sol");

  // ---- Fees (each preserved separately; never summed) ----
  const naMetric = <T,>(key: string, unit: NormalizedSolStakingMetricUnit, scope: NormalizedSolStakingComparisonScope, note: string) =>
    metric<T>({ key, unit, dataClass: "reviewed_evidence", comparisonScope: scope, status: "not_applicable", notes: [note] });
  const reviewedNumber = (key: string, value: number | undefined, scope: NormalizedSolStakingComparisonScope, notApplicableNote: string): NormalizedSolStakingMetric<number> =>
    value != null
      ? metric<number>({ key, unit: "pct", dataClass: "reviewed_evidence", comparisonScope: scope, status: "available", value, notes: [] })
      : naMetric<number>(key, "pct", scope, notApplicableNote);

  const annualManagementFeePct = reviewedNumber("annual_management_fee_pct", staticFacts.annualManagementFeePct, "candidate_type_specific", "No reviewed management fee recorded.");
  const validatorCommissionPct = isLst
    ? naMetric<number>("validator_commission_pct", "pct", "candidate_type_specific", "Not a user-facing fee for an LST — validator commission applies to native staking only.")
    : reviewedNumber("validator_commission_pct", staticFacts.validatorCommissionPct, "candidate_type_specific", "No reviewed validator commission recorded.");
  const directUnstakeFeePct = reviewedNumber("direct_unstake_fee_pct", staticFacts.directUnstakeFeePct, "candidate_type_specific", "No reviewed direct-unstake fee recorded.");

  // ---- Exit (descriptive; unlike liquidity concepts preserved) ----
  const boolMetric = (key: string, value: boolean | undefined): NormalizedSolStakingMetric<boolean> =>
    value != null
      ? metric<boolean>({ key, unit: "boolean", dataClass: "reviewed_evidence", comparisonScope: "descriptive_only", status: "available", value, notes: [] })
      : metric<boolean>({ key, unit: "boolean", dataClass: "reviewed_evidence", comparisonScope: "descriptive_only", status: "missing", notes: [] });
  const immediateExitAvailable = boolMetric("immediate_exit_available", staticFacts.immediateExitAvailable);
  const delayedExitAvailable = boolMetric("delayed_exit_available", staticFacts.delayedExitAvailable);
  const delayDescription = metric<string>({
    key: "exit_delay_description",
    unit: "text",
    dataClass: "descriptive_static",
    comparisonScope: "descriptive_only",
    status: staticFacts.delayDescription ? "available" : "missing",
    ...(staticFacts.delayDescription ? { value: staticFacts.delayDescription } : {}),
    notes: ["Descriptive reviewed exit timing. Epoch-based/variable timing keeps its text — no fixed hours are invented."],
  });

  // ---- Risk (carried, never recalculated) ----
  const reviewedRiskScore = metric<number>({
    key: "reviewed_risk_score",
    unit: "pct", // 0–10 reviewed score; unit label kept simple, comparisonScope makes it comparable
    dataClass: "reviewed_evidence",
    comparisonScope: "all_candidates",
    status: staticFacts.reviewedRiskScore != null ? "available" : "missing",
    ...(staticFacts.reviewedRiskScore != null ? { value: staticFacts.reviewedRiskScore } : {}),
    methodology: "Reviewed risk score carried from the existing per-candidate score module (NOT recalculated by normalization).",
    notes: [`Source modules: ${staticFacts.sourceModules.join(", ")}.`],
  });
  const operationalRiskSummary = metric<string>({
    key: "operational_risk_summary",
    unit: "text",
    dataClass: "reviewed_evidence",
    comparisonScope: "descriptive_only",
    status: staticFacts.operationalRiskSummary ? "available" : "not_applicable",
    ...(staticFacts.operationalRiskSummary ? { value: staticFacts.operationalRiskSummary } : {}),
    notes: [],
  });
  const incidentSummary = metric<string>({
    key: "incident_summary",
    unit: "text",
    dataClass: "reviewed_evidence",
    comparisonScope: "descriptive_only",
    status: staticFacts.incidentSummary ? "available" : "not_applicable",
    ...(staticFacts.incidentSummary ? { value: staticFacts.incidentSummary } : {}),
    notes: [],
  });

  // ---- Readiness ----
  const approved = staticFacts.approvedForReadOnlyReview && !staticFacts.blockedByRiskApproval;
  const liveMarketComplete = snapshot.status === "complete";
  const liveMarketFresh = snapshot.status === "complete"; // "complete" requires all required fields fresh
  const staticFactsComplete =
    staticFacts.reviewedRiskScore != null &&
    staticFacts.immediateExitAvailable != null &&
    staticFacts.delayedExitAvailable != null &&
    (isLst ? staticFacts.annualManagementFeePct != null : staticFacts.validatorCommissionPct != null);

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!staticFacts.approvedForReadOnlyReview) blockers.push("not_approved_for_read_only_review");
  if (staticFacts.blockedByRiskApproval) blockers.push("blocked_by_risk_approval");
  if (snapshot.status === "stale") blockers.push("stale_live_market_data");
  if (snapshot.status === "partial") blockers.push("incomplete_live_market_data");
  if (snapshot.status === "missing" || snapshot.status === "source_error") blockers.push("missing_live_market_data");
  if (snapshot.status === "invalid") blockers.push("invalid_live_market_data");
  if (staticFacts.reviewedRiskScore == null) blockers.push("missing_reviewed_risk_score");
  if (!staticFactsComplete) blockers.push("missing_required_static_mechanics");
  if (snapshot.blockers.includes("validator_delinquent")) blockers.push("validator_delinquent");
  for (const b of snapshot.blockers) if (!blockers.includes(b)) warnings.push(`live_market:${b}`);

  const normalized = true; // a canonical candidate with static facts is always representable
  const eligibleForFutureSelectorInput =
    approved &&
    snapshot.eligibleForFutureComparison === true &&
    liveMarketComplete &&
    liveMarketFresh &&
    staticFacts.reviewedRiskScore != null &&
    staticFactsComplete &&
    blockers.length === 0;

  return {
    candidateId: staticFacts.candidateId,
    protocolName: staticFacts.protocolName,
    assetSymbol: staticFacts.assetSymbol,
    candidateType: staticFacts.candidateType,
    tokenModel: staticFacts.tokenModel,
    isLiquidStakingToken: staticFacts.isLiquidStakingToken,
    splTokenMint: staticFacts.splTokenMint,

    approval: {
      approvedForReadOnlyReview: staticFacts.approvedForReadOnlyReview,
      blockedByRiskApproval: staticFacts.blockedByRiskApproval,
      ...(staticFacts.reviewedRiskScore != null ? { reviewedRiskScore: staticFacts.reviewedRiskScore } : {}),
      reviewThreshold: SOL_STAKING_REVIEW_THRESHOLD,
      selectedByProtocolLogic: false,
      currentWinner: false,
    },

    yield: {
      currentApyPct,
      apy30dPct,
      apyDeltaPctPoints,
      absoluteApyDeltaPctPoints,
      methodologyNotes: [
        currentApyPct.methodology ?? "current APY from live market cache",
        apy30dPct.methodology ?? "30-day APY from live market cache",
        "APY delta is transparent arithmetic, not a stability score.",
      ],
    },

    adoption: {
      metricKind: adoptionMetricKind,
      metric: adoptionMetric,
      directlyComparableAcrossAllCandidates: false,
      notes: [
        isLst
          ? "LST TVL represents capital held in the liquid-staking pool/token (USD)."
          : "Native delegated stake represents SOL delegated to the validator (SOL).",
        "Both indicate adoption but are NOT directly interchangeable (USD TVL vs SOL delegated stake).",
      ],
    },

    fees: {
      annualManagementFeePct,
      validatorCommissionPct,
      directUnstakeFeePct,
      feeModel: isLst ? "lst_protocol_fee_model" : "native_validator_commission_model",
      directlyComparableAcrossCandidateTypes: false,
      notes: [
        "Each fee is preserved separately; no synthetic total fee is created.",
        "LST management fee and native validator commission are different concepts and are not equated.",
        "A validator commission is a cut of staking rewards, not a reduction of user principal.",
      ],
    },

    exit: {
      liquidityClass: isLst ? "liquid_token" : "native_stake_account",
      immediateExitAvailable,
      delayedExitAvailable,
      delayModel: staticFacts.delayModel,
      delayDescription,
      notes: [
        isLst
          ? "LST exit: instant market/LP route plus a delayed direct-unstake path."
          : "Native exit: epoch-based deactivation; no instant liquidity route.",
      ],
    },

    risk: {
      reviewedRiskScore,
      operationalRiskSummary,
      incidentSummary,
      riskScoreRecalculatedByNormalization: false,
    },

    liveMarket: {
      sourceSnapshotStatus: snapshot.status,
      sourceSnapshotFetchedAt: snapshot.fetchedAt,
      sourceCacheGeneratedAt: options.sourceCacheGeneratedAt,
      liveFieldsFresh: liveMarketFresh,
    },

    readiness: {
      approved,
      liveMarketComplete,
      liveMarketFresh,
      staticFactsComplete,
      normalized,
      eligibleForFutureSelectorInput,
      blockers,
      warnings,
    },

    selectedByProtocolLogic: false,
    currentWinner: false,
    selectorScoreCalculated: false,
    rankingCalculated: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/* ------------------------------------------------------------------ *
 * Set builder.
 * ------------------------------------------------------------------ */
export interface BuildNormalizedSetOptions {
  checkedAt: string;
}

/**
 * Build the normalized candidate set from the Step 14U cache. Validates the cache first, then
 * builds a normalized record for EVERY canonical candidate (including blocked INF, for
 * diagnostics), in canonical order — never reordered by a metric. Fails closed to an empty,
 * fully-excluded set if the cache is invalid.
 */
export function buildNormalizedSolStakingCandidateSet(
  cache: unknown,
  options: BuildNormalizedSetOptions,
): NormalizedSolStakingCandidateSet {
  const checkedAt = options.checkedAt;
  const validation = validateSolStakingMarketCache(cache);

  if (!validation.valid || !validation.cache) {
    const exclusions: Record<string, string[]> = {};
    for (const id of SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER) exclusions[id] = ["source_cache_invalid"];
    return {
      schemaVersion: SOL_STAKING_NORMALIZATION_SCHEMA_VERSION,
      generatedAt: checkedAt,
      checkedAt,
      sourceMarketCacheSchemaVersion: "unknown",
      sourceMarketCacheGeneratedAt: "unknown",
      canonicalCandidateOrder: [...SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER],
      candidates: {},
      selectorReadyCandidateIds: [],
      excludedCandidateIds: [...SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER],
      exclusions,
      selectorScoreCalculated: false,
      rankingCalculated: false,
      winnerSelected: false,
      updatesLiveRecommendations: false,
      notes: [`Source market cache failed validation: ${validation.errors.join(", ")}. Fail closed.`],
    };
  }

  const validCache = validation.cache;
  const candidates: Record<string, NormalizedSolStakingCandidate> = {};
  const selectorReadyCandidateIds: string[] = [];
  const excludedCandidateIds: string[] = [];
  const exclusions: Record<string, string[]> = {};

  for (const id of SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER) {
    const staticFacts = getSolStakingCandidateStaticFacts(id);
    const snapshot = getSolStakingMarketSnapshot(validCache, id, checkedAt);
    if (!staticFacts || !snapshot) {
      excludedCandidateIds.push(id);
      exclusions[id] = [staticFacts ? "missing_live_market_snapshot" : "missing_static_facts"];
      continue;
    }
    const normalized = normalizeSolStakingCandidate(snapshot, staticFacts, { checkedAt, sourceCacheGeneratedAt: validCache.generatedAt });
    candidates[id] = normalized;
    if (normalized.readiness.eligibleForFutureSelectorInput) {
      selectorReadyCandidateIds.push(id); // canonical order preserved by iteration
    } else {
      excludedCandidateIds.push(id);
      exclusions[id] = normalized.readiness.blockers;
    }
  }

  return {
    schemaVersion: SOL_STAKING_NORMALIZATION_SCHEMA_VERSION,
    generatedAt: checkedAt,
    checkedAt,
    sourceMarketCacheSchemaVersion: validCache.schemaVersion,
    sourceMarketCacheGeneratedAt: validCache.generatedAt,
    canonicalCandidateOrder: [...SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER],
    candidates,
    selectorReadyCandidateIds,
    excludedCandidateIds,
    exclusions,
    selectorScoreCalculated: false,
    rankingCalculated: false,
    winnerSelected: false,
    updatesLiveRecommendations: false,
    notes: [
      "Normalization only — no selector score, no ranking, no winner. selectorReadyCandidateIds is a data-readiness gate in canonical order, not a recommendation.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Validation + reads + diagnostics.
 * ------------------------------------------------------------------ */
export interface NormalizedValidationResult {
  valid: boolean;
  errors: string[];
}

const CANONICAL_ID_SET = new Set<string>(SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER);

/** Validate one normalized candidate. Fails closed. */
export function validateNormalizedSolStakingCandidate(candidate: unknown): NormalizedValidationResult {
  const errors: string[] = [];
  if (!candidate || typeof candidate !== "object") return { valid: false, errors: ["candidate_not_an_object"] };
  const c = candidate as NormalizedSolStakingCandidate;
  if (!CANONICAL_ID_SET.has(c.candidateId)) errors.push("unknown_candidate_id");
  if (c.candidateType !== "liquid_staking_token" && c.candidateType !== "native_staking") errors.push("invalid_candidate_type");
  if (c.candidateType === "native_staking" && (c.isLiquidStakingToken !== false || c.splTokenMint !== null)) errors.push("native_must_not_be_lst");
  if (!c.yield || !c.adoption || !c.fees || !c.exit || !c.risk || !c.readiness || !c.approval) errors.push("missing_sections");
  if (c.risk && c.risk.riskScoreRecalculatedByNormalization !== false) errors.push("risk_recalculated");
  const flagsFalse = c.selectorScoreCalculated === false && c.rankingCalculated === false && c.currentWinner === false && c.selectedByProtocolLogic === false && c.transactionsEnabled === false && c.walletSignatureRequired === false && c.updatesLiveRecommendations === false;
  if (!flagsFalse) errors.push("capability_flag_not_false");
  return { valid: errors.length === 0, errors };
}

/** Validate the normalized set. Fails closed; rejects any winner/ranking/selector state. */
export function validateNormalizedSolStakingCandidateSet(set: unknown): NormalizedValidationResult {
  const errors: string[] = [];
  if (!set || typeof set !== "object") return { valid: false, errors: ["set_not_an_object"] };
  const s = set as NormalizedSolStakingCandidateSet;
  if (s.schemaVersion !== SOL_STAKING_NORMALIZATION_SCHEMA_VERSION) errors.push("schema_version_mismatch");
  if (s.winnerSelected !== false) errors.push("winner_selected");
  if (s.rankingCalculated !== false) errors.push("ranking_calculated");
  if (s.selectorScoreCalculated !== false) errors.push("selector_score_calculated");
  if (!Array.isArray(s.canonicalCandidateOrder) || JSON.stringify(s.canonicalCandidateOrder) !== JSON.stringify([...SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER])) errors.push("canonical_order_altered");
  for (const [id, cand] of Object.entries(s.candidates ?? {})) {
    if (!CANONICAL_ID_SET.has(id)) { errors.push(`unknown_candidate_${id}`); continue; }
    const v = validateNormalizedSolStakingCandidate(cand);
    if (!v.valid) errors.push(`candidate_${id}_invalid:${v.errors.join("/")}`);
  }
  // selector-ready must be a subset of canonical order and never include a blocked candidate.
  for (const id of s.selectorReadyCandidateIds ?? []) {
    if (!CANONICAL_ID_SET.has(id)) errors.push(`selector_ready_unknown_${id}`);
    if (s.candidates?.[id]?.approval.blockedByRiskApproval === true) errors.push(`selector_ready_blocked_${id}`);
  }
  return { valid: errors.length === 0, errors };
}

/** The selector-ready candidates, in canonical order. Never sorted by any metric. */
export function listSelectorReadyNormalizedCandidates(set: NormalizedSolStakingCandidateSet): NormalizedSolStakingCandidate[] {
  const out: NormalizedSolStakingCandidate[] = [];
  for (const id of set.canonicalCandidateOrder) {
    if (set.selectorReadyCandidateIds.includes(id) && set.candidates[id]) out.push(set.candidates[id]);
  }
  return out; // canonical order, no APY/risk/TVL/fee/exit sort
}

export interface NormalizedCandidateDiagnostics {
  candidateId: string;
  normalized: boolean;
  eligibleForFutureSelectorInput: boolean;
  blockers: string[];
  warnings: string[];
  unavailableDimensions: string[];
  nonComparableDimensions: string[];
}

/** Per-candidate diagnostics: readiness, blockers, and which dimensions are unavailable / not comparable. Exposes no ranking. */
export function getSolStakingNormalizationDiagnostics(set: NormalizedSolStakingCandidateSet): NormalizedCandidateDiagnostics[] {
  const out: NormalizedCandidateDiagnostics[] = [];
  for (const id of set.canonicalCandidateOrder) {
    const c = set.candidates[id];
    if (!c) {
      out.push({ candidateId: id, normalized: false, eligibleForFutureSelectorInput: false, blockers: set.exclusions[id] ?? ["not_normalized"], warnings: [], unavailableDimensions: [], nonComparableDimensions: [] });
      continue;
    }
    const allMetrics: NormalizedSolStakingMetric<unknown>[] = [
      c.yield.currentApyPct, c.yield.apy30dPct, c.yield.apyDeltaPctPoints, c.yield.absoluteApyDeltaPctPoints,
      c.adoption.metric,
      c.fees.annualManagementFeePct, c.fees.validatorCommissionPct, c.fees.directUnstakeFeePct,
      c.exit.immediateExitAvailable, c.exit.delayedExitAvailable, c.exit.delayDescription,
      c.risk.reviewedRiskScore, c.risk.operationalRiskSummary, c.risk.incidentSummary,
    ];
    const unavailableDimensions = allMetrics.filter((m) => m.status !== "available").map((m) => `${m.key}:${m.status}`);
    const nonComparableDimensions = allMetrics.filter((m) => m.comparisonScope !== "all_candidates").map((m) => `${m.key}:${m.comparisonScope}`);
    out.push({
      candidateId: id,
      normalized: c.readiness.normalized,
      eligibleForFutureSelectorInput: c.readiness.eligibleForFutureSelectorInput,
      blockers: c.readiness.blockers,
      warnings: c.readiness.warnings,
      unavailableDimensions,
      nonComparableDimensions,
    });
  }
  return out;
}
