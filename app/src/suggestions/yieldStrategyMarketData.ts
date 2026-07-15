/**
 * yieldStrategyMarketData — Step 16C. The deterministic Stable Yield market-data NORMALIZER +
 * validators. It JOINS the Step 16B registry (the source of candidate identity) to injected,
 * documented market-data inputs and produces one per-product `YieldStrategyMarketSnapshot` in canonical
 * registry order. It preserves exact identity, preserves each source's APY MEANING, preserves TVL and
 * liquidity/withdrawal state, attaches freshness + provenance, and fails closed.
 *
 * IT DOES NOT: compare, rank, choose a leader, generate a suggestion, create UI, wire Demo / Real
 * Wallet, prepare execution, fetch from React, invent an address / APY / TVL / liquidity / withdrawal
 * behavior, or auto-approve a `documentation_required` entry. Only an APPROVED registry entry with a
 * documented exact address can carry market data; everything else stays a documentation-only,
 * `unavailable` snapshot. A zero-approved registry yields an empty approved set — a valid state.
 */
import {
  YIELD_STRATEGY_MARKET_DATA_POLICY_ID,
  YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION,
  YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION,
  type YieldApyData,
  type YieldFeeData,
  type YieldLaneCompatibility,
  type YieldLiquidityData,
  type YieldMarketFieldStatus,
  type YieldMarketProvenance,
  type YieldStrategyMarketDataInput,
  type YieldStrategyMarketDataSet,
  type YieldStrategyMarketDataValidationResult,
  type YieldStrategyMarketSnapshot,
  type YieldTvlData,
} from "./yieldStrategyMarketDataTypes";
import {
  YIELD_BUFFER_LANE_WITHDRAWAL_STATUSES,
  YIELD_MARKET_APPROVED_LIFECYCLES,
  YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS,
  YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS,
  YIELD_SUPPORTED_APY_DEFINITIONS,
  YIELD_SUPPORTED_APY_WINDOWS,
  YIELD_SUPPORTED_WITHDRAWAL_STATUSES,
  evaluateMarketFreshness,
  isApyDefinitionSufficientForComparison,
  isApyPayloadValid,
  isValidMarketNumber,
  laneMaxAgeMs,
} from "./yieldStrategyMarketDataPolicy";
import { listYieldStrategies } from "./yieldStrategyRegistry";
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";

export const YIELD_STRATEGY_MARKET_DATA_EXISTS = true;

const APPROVED = new Set<string>(YIELD_MARKET_APPROVED_LIFECYCLES);

/* ------------------------------------------------------------------ *
 * Lane-compatibility metadata (preserved, never used to SELECT a lane).
 * ------------------------------------------------------------------ */
function buildLaneCompatibility(entry: YieldStrategyRegistryEntry): YieldLaneCompatibility {
  const bufferLaneCandidate = entry.supportedLane === "safety_buffer_yield" && entry.riskLane === "buffer_eligible";
  const excessLaneCandidate = entry.supportedLane === "excess_usdc_yield" || bufferLaneCandidate;
  return {
    supportedLane: entry.supportedLane,
    riskLane: entry.riskLane,
    bufferLaneCandidate,
    excessLaneCandidate,
    bufferLaneFreshnessMaxAgeMs: YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS,
    excessLaneFreshnessMaxAgeMs: YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS,
    bufferLaneRequiresInstantLiquidity: true,
    bufferLaneRequiresDefinedWithdrawal: true,
    notes: ["Lane compatibility is preserved for a later step; 16C never selects a lane."],
  };
}

/* ------------------------------------------------------------------ *
 * Documentation-only snapshot (non-approved / no address / no input).
 * ------------------------------------------------------------------ */
function documentationOnlySnapshot(entry: YieldStrategyRegistryEntry, checkedAt: string, reason: string): YieldStrategyMarketSnapshot {
  const missingApy: YieldApyData = { status: "missing", apyDefinition: "unknown", apyWindow: "unknown", definitionSufficientForComparison: false, notes: [reason] };
  const missingTvl: YieldTvlData = { status: "missing", currency: "USD", notes: [reason] };
  const missingLiquidity: YieldLiquidityData = { status: "missing", withdrawalStatus: "unknown", liquidityConfidence: "unknown", notes: [reason] };
  const missingFees: YieldFeeData = { status: "missing", feeModel: "unknown", notes: [reason] };
  return {
    schemaVersion: "1.0.0",
    policyVersion: "1.0.0",
    strategyId: entry.strategyId,
    displayName: entry.displayName,
    protocolId: entry.protocolId,
    protocolDisplayName: entry.protocolDisplayName,
    strategyType: entry.strategyType,
    principalAsset: entry.principalAsset,
    supportedLane: entry.supportedLane,
    riskLane: entry.riskLane,
    lifecycle: entry.lifecycle,
    address: entry.address,
    status: "unavailable",
    apy: missingApy,
    tvl: missingTvl,
    liquidity: missingLiquidity,
    fees: missingFees,
    laneCompatibility: buildLaneCompatibility(entry),
    provenance: { kind: "none", browserFetched: false, present: false },
    checkedAt,
    maximumAgeMs: laneMaxAgeMs(entry.supportedLane),
    warnings: [],
    blockers: [reason],
    approvedForMarketData: false,
    marketDataComplete: false,
    marketDataFresh: false,
    eligibleForFutureComparison: false,
    comparisonEvaluated: false,
    eligibilityEvaluated: false,
    rankingCalculated: false,
    leaderSelected: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/* ------------------------------------------------------------------ *
 * Approved-product snapshot from an injected, documented market-data input.
 * ------------------------------------------------------------------ */
function normalizeApprovedSnapshot(entry: YieldStrategyRegistryEntry, input: YieldStrategyMarketDataInput, checkedAt: string): YieldStrategyMarketSnapshot {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const maximumAgeMs = laneMaxAgeMs(entry.supportedLane);

  // Provenance — a browser-provider fetch is never accepted.
  const provenance: YieldMarketProvenance = {
    kind: input.provenanceKind ?? "documented_source",
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    browserFetched: false,
    present: true,
  };
  if (input.browserFetched === true) blockers.push("browser_fetched_source_rejected");
  if (!input.sourceId) blockers.push("provenance_missing");

  // Freshness (per the lane bound).
  const fresh = evaluateMarketFreshness(input.fetchedAt, checkedAt, input.maximumAgeMs ?? maximumAgeMs);
  if (fresh.status === "invalid") blockers.push("invalid_timestamp");
  if (fresh.status === "missing") blockers.push("freshness_unknown");

  const fieldStatus = (present: boolean, valid: boolean): YieldMarketFieldStatus => {
    if (!present) return "missing";
    if (!valid) return "invalid";
    if (fresh.status === "stale") return "stale";
    if (fresh.status === "fresh") return "fresh";
    return "missing"; // freshness missing/invalid → the field cannot be trusted fresh
  };

  // ---- APY (preserve the source's MEANING; never collapse) ----
  const apyIn = input.apy ?? {};
  const apyDefinition = apyIn.apyDefinition ?? "unknown";
  const apyWindow = apyIn.apyWindow ?? "unknown";
  const apyPresent = apyIn.currentApyPct !== undefined || apyIn.grossApyPct !== undefined || apyIn.netApyPct !== undefined;
  const apyValid = isApyPayloadValid({ apyDefinition, apyWindow, currentApyPct: apyIn.currentApyPct, sevenDayApyPct: apyIn.sevenDayApyPct, thirtyDayApyPct: apyIn.thirtyDayApyPct, grossApyPct: apyIn.grossApyPct, netApyPct: apyIn.netApyPct });
  const apy: YieldApyData = {
    status: fieldStatus(apyPresent, apyValid),
    apyDefinition,
    apyWindow,
    ...(apyIn.currentApyPct !== undefined ? { currentApyPct: apyIn.currentApyPct } : {}),
    ...(apyIn.sevenDayApyPct !== undefined ? { sevenDayApyPct: apyIn.sevenDayApyPct } : {}),
    ...(apyIn.thirtyDayApyPct !== undefined ? { thirtyDayApyPct: apyIn.thirtyDayApyPct } : {}),
    ...(apyIn.grossApyPct !== undefined ? { grossApyPct: apyIn.grossApyPct } : {}),
    ...(apyIn.netApyPct !== undefined ? { netApyPct: apyIn.netApyPct } : {}),
    definitionSufficientForComparison: isApyDefinitionSufficientForComparison(apyDefinition),
    notes: apyPresent
      ? [`APY preserved as ${apyDefinition}/${apyWindow}; not collapsed or reinterpreted.`]
      : ["No APY reported by the source."],
  };
  if (apyPresent && !apyValid) blockers.push("apy_invalid");

  // ---- TVL ----
  const tvlPresent = input.tvlUsd !== undefined;
  const tvlValid = tvlPresent && isValidMarketNumber(input.tvlUsd);
  const tvl: YieldTvlData = {
    status: fieldStatus(tvlPresent, tvlValid),
    ...(tvlValid ? { tvlUsd: input.tvlUsd } : {}),
    currency: "USD",
    notes: tvlPresent ? ["Exact source TVL preserved (USD)."] : ["No TVL reported by the source."],
  };
  if (tvlPresent && !tvlValid) blockers.push("tvl_invalid");

  // ---- Liquidity / withdrawal (explicit only; never inferred) ----
  const liqIn = input.liquidity ?? {};
  const withdrawalStatus = liqIn.withdrawalStatus ?? "unknown";
  const withdrawalStatusKnown = (YIELD_SUPPORTED_WITHDRAWAL_STATUSES as readonly string[]).includes(withdrawalStatus);
  const liquidityNumbersValid = [liqIn.availableLiquidityUsd, liqIn.availableLiquidityRatio, liqIn.withdrawalDelayHours, liqIn.withdrawalWindowHours].every((v) => v === undefined || isValidMarketNumber(v));
  const liquidityPresent = liqIn.withdrawalStatus !== undefined || liqIn.availableLiquidityUsd !== undefined;
  const liquidity: YieldLiquidityData = {
    status: fieldStatus(liquidityPresent, withdrawalStatusKnown && liquidityNumbersValid),
    withdrawalStatus,
    ...(isValidMarketNumber(liqIn.availableLiquidityUsd) ? { availableLiquidityUsd: liqIn.availableLiquidityUsd } : {}),
    ...(isValidMarketNumber(liqIn.availableLiquidityRatio) ? { availableLiquidityRatio: liqIn.availableLiquidityRatio } : {}),
    ...(isValidMarketNumber(liqIn.withdrawalDelayHours) ? { withdrawalDelayHours: liqIn.withdrawalDelayHours } : {}),
    ...(liqIn.withdrawalQueueActive !== undefined ? { withdrawalQueueActive: liqIn.withdrawalQueueActive } : {}),
    ...(isValidMarketNumber(liqIn.withdrawalWindowHours) ? { withdrawalWindowHours: liqIn.withdrawalWindowHours } : {}),
    liquidityConfidence: liqIn.liquidityConfidence ?? (liqIn.withdrawalStatus !== undefined ? "explicit_source" : "unknown"),
    notes: ["Liquidity/withdrawal state is taken only from the source — never inferred from TVL/APY/protocol/category."],
  };
  if (!withdrawalStatusKnown) blockers.push("unknown_withdrawal_status");
  if (!liquidityNumbersValid) blockers.push("liquidity_invalid");

  // ---- Fees (each preserved separately; never summed) ----
  const feeIn = input.fees ?? {};
  const feesPresent = feeIn.managementFeePct !== undefined || feeIn.performanceFeePct !== undefined || feeIn.withdrawalFeePct !== undefined || feeIn.feeModel !== undefined;
  const feesValid = [feeIn.managementFeePct, feeIn.performanceFeePct, feeIn.withdrawalFeePct].every((v) => v === undefined || isValidMarketNumber(v));
  const fees: YieldFeeData = {
    status: fieldStatus(feesPresent, feesValid),
    ...(isValidMarketNumber(feeIn.managementFeePct) ? { managementFeePct: feeIn.managementFeePct } : {}),
    ...(isValidMarketNumber(feeIn.performanceFeePct) ? { performanceFeePct: feeIn.performanceFeePct } : {}),
    ...(isValidMarketNumber(feeIn.withdrawalFeePct) ? { withdrawalFeePct: feeIn.withdrawalFeePct } : {}),
    feeModel: feeIn.feeModel ?? "unknown",
    notes: ["Each fee preserved separately; no synthetic total fee is created."],
  };
  if (feesPresent && !feesValid) blockers.push("fees_invalid");

  // ---- Snapshot status ----
  const requiredPresent = apyPresent && tvlPresent && withdrawalStatus !== "unknown";
  const anyInvalid = [apy.status, tvl.status, liquidity.status, fees.status].includes("invalid") || blockers.some((b) => b.endsWith("_invalid") || b === "invalid_timestamp" || b === "browser_fetched_source_rejected");
  let status: YieldStrategyMarketSnapshot["status"];
  if (anyInvalid) status = "invalid";
  else if (fresh.status === "stale") status = "stale";
  else if (fresh.status === "fresh" && requiredPresent && blockers.length === 0) status = "complete";
  else status = "partial";

  const marketDataComplete = status === "complete";
  const marketDataFresh = fresh.status === "fresh";
  const eligibleForFutureComparison = marketDataComplete && blockers.length === 0;

  return {
    schemaVersion: "1.0.0",
    policyVersion: "1.0.0",
    strategyId: entry.strategyId,
    displayName: entry.displayName,
    protocolId: entry.protocolId,
    protocolDisplayName: entry.protocolDisplayName,
    strategyType: entry.strategyType,
    principalAsset: entry.principalAsset,
    supportedLane: entry.supportedLane,
    riskLane: entry.riskLane,
    lifecycle: entry.lifecycle,
    address: entry.address,
    status,
    apy,
    tvl,
    liquidity,
    fees,
    laneCompatibility: buildLaneCompatibility(entry),
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
    provenance,
    ...(input.fetchedAt ? { fetchedAt: input.fetchedAt } : {}),
    checkedAt,
    maximumAgeMs,
    ...(fresh.ageMs !== undefined ? { ageMs: fresh.ageMs } : {}),
    warnings,
    blockers,
    approvedForMarketData: true,
    marketDataComplete,
    marketDataFresh,
    eligibleForFutureComparison,
    comparisonEvaluated: false,
    eligibilityEvaluated: false,
    rankingCalculated: false,
    leaderSelected: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/* ------------------------------------------------------------------ *
 * Set builder — the registry-to-market-data join.
 * ------------------------------------------------------------------ */
export interface BuildYieldStrategyMarketDataOptions {
  checkedAt: string;
  /** Injected, documented market-data inputs keyed by strategyId. Defaults to none (empty-allowed). */
  inputs?: YieldStrategyMarketDataInput[];
}

/**
 * Build the market-data set. Iterates the registry in canonical order and, for each entry:
 *  - APPROVED lifecycle + documented address + a matching input → normalized snapshot;
 *  - anything else → documentation-only `unavailable` snapshot (never auto-approved, never fabricated).
 * Rejects unknown / duplicate input strategyIds. Zero approved products is a valid, empty state.
 */
export function buildYieldStrategyMarketDataSet(options: BuildYieldStrategyMarketDataOptions): YieldStrategyMarketDataSet {
  const checkedAt = options.checkedAt;
  const entries = listYieldStrategies();
  const knownIds = new Set(entries.map((e) => e.strategyId));

  // Index inputs; reject duplicates and unknown ids (fail closed — ignore, and record a note).
  const inputById = new Map<string, YieldStrategyMarketDataInput>();
  const notes: string[] = [];
  const seen = new Set<string>();
  for (const input of options.inputs ?? []) {
    if (!knownIds.has(input.strategyId)) { notes.push(`ignored_unknown_input:${input.strategyId}`); continue; }
    if (seen.has(input.strategyId)) { notes.push(`ignored_duplicate_input:${input.strategyId}`); continue; }
    seen.add(input.strategyId);
    inputById.set(input.strategyId, input);
  }

  const snapshots: Record<string, YieldStrategyMarketSnapshot> = {};
  const canonicalCandidateOrder: string[] = [];
  const approvedCandidateIds: string[] = [];
  const documentationRequiredCandidateIds: string[] = [];
  const marketReadyCandidateIds: string[] = [];
  const unavailableCandidateIds: string[] = [];

  for (const entry of entries) {
    canonicalCandidateOrder.push(entry.strategyId);
    const isApproved = APPROVED.has(entry.lifecycle);
    const hasAddress = typeof entry.address === "string" && entry.address.length > 0;
    const input = inputById.get(entry.strategyId);

    if (entry.lifecycle === "documentation_required") documentationRequiredCandidateIds.push(entry.strategyId);

    let snapshot: YieldStrategyMarketSnapshot;
    if (!isApproved) {
      snapshot = documentationOnlySnapshot(entry, checkedAt, "product_not_approved");
    } else if (!hasAddress) {
      snapshot = documentationOnlySnapshot(entry, checkedAt, "approved_without_documented_address");
    } else if (!input) {
      snapshot = documentationOnlySnapshot(entry, checkedAt, "no_market_data_input");
    } else {
      snapshot = normalizeApprovedSnapshot(entry, input, checkedAt);
    }

    snapshots[entry.strategyId] = snapshot;
    if (isApproved) approvedCandidateIds.push(entry.strategyId);
    if (snapshot.eligibleForFutureComparison) marketReadyCandidateIds.push(entry.strategyId);
    if (snapshot.status === "unavailable") unavailableCandidateIds.push(entry.strategyId);
  }

  return {
    schemaVersion: YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_MARKET_DATA_POLICY_ID,
    policyVersion: YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION,
    generatedAt: checkedAt,
    checkedAt,
    canonicalCandidateOrder,
    snapshots,
    approvedCandidateIds,
    documentationRequiredCandidateIds,
    marketReadyCandidateIds,
    unavailableCandidateIds,
    emptyApprovedSet: approvedCandidateIds.length === 0,
    comparisonEvaluated: false,
    rankingCalculated: false,
    leaderSelected: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    notes: [
      "Market-data join only — no comparison, ranking, leader, or suggestion.",
      "Only approved products with a documented address carry live data; zero approved is a valid empty state.",
      ...notes,
    ],
  };
}

/** The canonical empty-approved result: the deterministic set built with no injected inputs. */
export function buildEmptyApprovedYieldStrategyMarketDataSet(checkedAt: string): YieldStrategyMarketDataSet {
  return buildYieldStrategyMarketDataSet({ checkedAt, inputs: [] });
}

/* ------------------------------------------------------------------ *
 * Read-only accessors (canonical order; never sorted by a metric).
 * ------------------------------------------------------------------ */
export function listYieldStrategyMarketSnapshots(set: YieldStrategyMarketDataSet): YieldStrategyMarketSnapshot[] {
  return set.canonicalCandidateOrder.map((id) => set.snapshots[id]).filter((s): s is YieldStrategyMarketSnapshot => !!s);
}
export function getYieldStrategyMarketSnapshot(set: YieldStrategyMarketDataSet, strategyId: string): YieldStrategyMarketSnapshot | undefined {
  return set.snapshots[strategyId];
}
/** Approved products' snapshots, in canonical order (empty while none is approved). */
export function getApprovedYieldStrategyMarketSnapshots(set: YieldStrategyMarketDataSet): YieldStrategyMarketSnapshot[] {
  return listYieldStrategyMarketSnapshots(set).filter((s) => s.approvedForMarketData);
}
/** Data-readiness gate only — approved + complete + fresh, in canonical order. Enables nothing. */
export function getMarketReadyYieldStrategySnapshots(set: YieldStrategyMarketDataSet): YieldStrategyMarketSnapshot[] {
  return set.marketReadyCandidateIds.map((id) => set.snapshots[id]).filter((s): s is YieldStrategyMarketSnapshot => !!s);
}

/* ------------------------------------------------------------------ *
 * Validation (fails closed).
 * ------------------------------------------------------------------ */
const SNAPSHOT_STATUSES = new Set(["complete", "partial", "stale", "invalid", "unavailable"]);

/** Validate one snapshot. Fails closed on fabricated approval, bad enums, or any enabled capability. */
export function validateYieldStrategyMarketSnapshot(snapshot: unknown): YieldStrategyMarketDataValidationResult {
  const errors: string[] = [];
  if (!snapshot || typeof snapshot !== "object") return { valid: false, errors: ["snapshot_not_an_object"] };
  const s = snapshot as YieldStrategyMarketSnapshot;

  if (s.schemaVersion !== YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (s.policyVersion !== YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION) errors.push("wrong_policy_version");
  if (!s.strategyId) errors.push("missing_strategy_id");
  if (!SNAPSHOT_STATUSES.has(s.status)) errors.push("invalid_snapshot_status");

  // Capability flags must all be off.
  const flagsOff = s.comparisonEvaluated === false && s.eligibilityEvaluated === false && s.rankingCalculated === false && s.leaderSelected === false && s.suggestionGenerated === false && s.updatesProductOutput === false && s.transactionsEnabled === false && s.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");
  if (s.provenance?.browserFetched !== false) errors.push("browser_fetched_provenance");

  // Approval can never be fabricated: approvedForMarketData requires approved lifecycle + a documented address.
  if (s.approvedForMarketData === true) {
    if (!APPROVED.has(s.lifecycle)) errors.push("approved_market_data_without_approved_lifecycle");
    if (!(typeof s.address === "string" && s.address.length > 0)) errors.push("approved_market_data_without_address");
  }
  // A non-approved product must be an unavailable, documentation-only snapshot with no market values.
  if (!APPROVED.has(s.lifecycle)) {
    if (s.status !== "unavailable") errors.push("non_approved_must_be_unavailable");
    if (s.approvedForMarketData !== false || s.eligibleForFutureComparison !== false) errors.push("non_approved_marked_ready");
    if (s.apy?.currentApyPct !== undefined || s.tvl?.tvlUsd !== undefined) errors.push("non_approved_carries_market_values");
  }
  // eligibleForFutureComparison implies complete + approved + no blockers (data-readiness, not selection).
  if (s.eligibleForFutureComparison === true) {
    if (s.status !== "complete") errors.push("eligible_without_complete");
    if (s.approvedForMarketData !== true) errors.push("eligible_without_approval");
    if ((s.blockers?.length ?? 0) > 0) errors.push("eligible_with_blockers");
  }
  // Enum sanity.
  if (s.apy && !(YIELD_SUPPORTED_APY_DEFINITIONS as readonly string[]).includes(s.apy.apyDefinition)) errors.push("invalid_apy_definition");
  if (s.apy && !(YIELD_SUPPORTED_APY_WINDOWS as readonly string[]).includes(s.apy.apyWindow)) errors.push("invalid_apy_window");
  if (s.liquidity && !(YIELD_SUPPORTED_WITHDRAWAL_STATUSES as readonly string[]).includes(s.liquidity.withdrawalStatus)) errors.push("invalid_withdrawal_status");
  // Numeric sanity (no negative / non-finite market magnitudes survive).
  for (const [k, v] of [["apy_current", s.apy?.currentApyPct], ["tvl", s.tvl?.tvlUsd], ["liquidity_usd", s.liquidity?.availableLiquidityUsd]] as const) {
    if (v !== undefined && !isValidMarketNumber(v)) errors.push(`invalid_${k}_value`);
  }
  // A buffer-lane snapshot that is eligible must have an instant, defined withdrawal state.
  if (s.eligibleForFutureComparison === true && s.supportedLane === "safety_buffer_yield") {
    if (!(YIELD_BUFFER_LANE_WITHDRAWAL_STATUSES as readonly string[]).includes(s.liquidity.withdrawalStatus)) errors.push("buffer_lane_eligible_without_instant_liquidity");
  }
  return { valid: errors.length === 0, errors };
}

/** Validate the whole set. Fails closed; rejects duplicates, order drift, and any enabled capability. */
export function validateYieldStrategyMarketDataSet(set: unknown): YieldStrategyMarketDataValidationResult {
  const errors: string[] = [];
  if (!set || typeof set !== "object") return { valid: false, errors: ["set_not_an_object"] };
  const s = set as YieldStrategyMarketDataSet;

  if (s.schemaVersion !== YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (s.policyId !== YIELD_STRATEGY_MARKET_DATA_POLICY_ID) errors.push("wrong_policy_id");
  const flagsOff = s.comparisonEvaluated === false && s.rankingCalculated === false && s.leaderSelected === false && s.suggestionGenerated === false && s.updatesProductOutput === false && s.transactionsEnabled === false && s.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");

  if (!Array.isArray(s.canonicalCandidateOrder)) errors.push("missing_canonical_order");
  else {
    if (new Set(s.canonicalCandidateOrder).size !== s.canonicalCandidateOrder.length) errors.push("duplicate_candidate_ids");
    // Order must match the live registry order exactly (no metric-driven reordering).
    const registryOrder = listYieldStrategies().map((e) => e.strategyId);
    if (JSON.stringify(s.canonicalCandidateOrder) !== JSON.stringify(registryOrder)) errors.push("canonical_order_altered");
  }

  // approved set + empty flag consistency.
  if (s.emptyApprovedSet !== ((s.approvedCandidateIds?.length ?? 0) === 0)) errors.push("empty_approved_flag_inconsistent");
  // market-ready must be a subset of approved (data-readiness never bypasses approval).
  for (const id of s.marketReadyCandidateIds ?? []) {
    if (!(s.approvedCandidateIds ?? []).includes(id)) errors.push(`market_ready_without_approval:${id}`);
  }
  for (const [id, snap] of Object.entries(s.snapshots ?? {})) {
    const v = validateYieldStrategyMarketSnapshot(snap);
    if (!v.valid) errors.push(`snapshot_${id}_invalid:${v.errors.join("/")}`);
  }
  return { valid: errors.length === 0, errors };
}
