/**
 * solStakingMarketDataRefresh — Step 14U. Deterministic, pure builders that turn validated
 * public source payloads into `SolStakingMarketSnapshot`s and assemble the live
 * `SolStakingMarketCache`. NO network I/O lives here (the refresh script injects payloads);
 * these are the fixture-tested surface.
 *
 * WHAT THIS DOES: parse the exact verified DefiLlama pool record for each LST (JitoSOL / mSOL /
 * JupSOL / bSOL / INF); reuse the Step 14T native validator pipeline (Stakewiz current +
 * Marinade 30-day history) for Jupiter Native Stake; mark each candidate fresh / partial /
 * stale / invalid / missing / source_error honestly; and map the EXISTING approval decision
 * onto each snapshot without recomputing it from market values.
 *
 * WHAT THIS NEVER DOES: rank candidates, compute a selector score, choose a winner, replace
 * Jito, update live recommendations, mutate approval evidence or risk scores, or add any
 * transaction/signature path. `eligibleForFutureComparison` is DATA-READINESS ONLY and does
 * not enable the selector.
 */
import {
  SOL_STAKING_MARKET_CANDIDATE_IDS,
  SOL_STAKING_MARKET_CANDIDATE_ORDER,
  type SolStakingMarketCache,
  type SolStakingMarketField,
  type SolStakingMarketRefreshStatus,
  type SolStakingMarketSnapshot,
  type SolStakingMarketSnapshotFields,
  type SolStakingMarketSnapshotStatus,
} from "./solStakingMarketDataTypes";
import {
  SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS,
  SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION,
  getSolStakingMarketSource,
  type SolStakingMarketSourceDescriptor,
} from "./solStakingMarketDataSources";
import {
  JUPITER_NATIVE_STAKE_VOTE_ACCOUNT,
  parseStakewizValidatorSummary,
} from "./nativeValidatorMarketData";
import { buildJupiterNativeStakeMarketPackage } from "./nativeValidatorMarinadeData";
import { JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED } from "./jitoSolBetaActivation";
import { SOL_LST_MSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solLiquidStakingMsolReadOnlyApproval";
import { SOL_LST_JUPSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solLiquidStakingJupsolReadOnlyApproval";
import { SOL_LST_BSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solLiquidStakingBsolReadOnlyApproval";
import { SOL_LST_INF_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solLiquidStakingInfReadOnlyApproval";
import { SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solNativeStakingBaselineReadOnlyApproval";

export const SOL_STAKING_MARKET_REFRESH_EXISTS = true;
export const SOL_STAKING_MARKET_REFRESH_ENABLES_SELECTOR = false;
export const SOL_STAKING_MARKET_REFRESH_RANKS_CANDIDATES = false;
export const SOL_STAKING_MARKET_REFRESH_SELECTS_WINNER = false;
export const SOL_STAKING_MARKET_REFRESH_MUTATES_EVIDENCE = false;
export const SOL_STAKING_MARKET_REFRESH_MUTATES_RISK_SCORES = false;
export const SOL_STAKING_MARKET_REFRESH_ENABLES_TRANSACTIONS = false;
export const SOL_STAKING_MARKET_REFRESH_REQUIRES_WALLET_SIGNATURE = false;

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/* ------------------------------------------------------------------ *
 * Approval map — the EXISTING deterministic decision, not recomputed from market values.
 * ------------------------------------------------------------------ */
interface ApprovalState {
  approvedForReadOnlyReview: boolean;
  blockedByRiskApproval: boolean;
}
const APPROVAL: Record<string, ApprovalState> = {
  [SOL_STAKING_MARKET_CANDIDATE_IDS.jito]: { approvedForReadOnlyReview: JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED, blockedByRiskApproval: false },
  [SOL_STAKING_MARKET_CANDIDATE_IDS.jupiter]: { approvedForReadOnlyReview: SOL_LST_JUPSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, blockedByRiskApproval: !SOL_LST_JUPSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE },
  [SOL_STAKING_MARKET_CANDIDATE_IDS.marinade]: { approvedForReadOnlyReview: SOL_LST_MSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, blockedByRiskApproval: !SOL_LST_MSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE },
  [SOL_STAKING_MARKET_CANDIDATE_IDS.blazestake]: { approvedForReadOnlyReview: SOL_LST_BSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, blockedByRiskApproval: !SOL_LST_BSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE },
  [SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake]: { approvedForReadOnlyReview: SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, blockedByRiskApproval: !SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE },
  // INF: blocked below the 7.0 review threshold — monitored, never selector-eligible.
  [SOL_STAKING_MARKET_CANDIDATE_IDS.sanctum]: { approvedForReadOnlyReview: SOL_LST_INF_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, blockedByRiskApproval: true },
};

export function getSolStakingMarketApprovalState(candidateId: string): ApprovalState {
  return APPROVAL[candidateId] ?? { approvedForReadOnlyReview: false, blockedByRiskApproval: true };
}

/* ------------------------------------------------------------------ *
 * (3) DefiLlama LST pool parser — exact-pool match, chain/project checks, finite validation.
 * ------------------------------------------------------------------ */
/** One parsed field: absent, present-but-invalid (value kept, flagged), or present-and-valid. */
export interface DefiLlamaFieldParse {
  present: boolean;
  valid: boolean;
  value?: number;
}
export interface DefiLlamaPoolParseResult {
  matched: boolean;
  currentApy: DefiLlamaFieldParse;
  apy30d: DefiLlamaFieldParse;
  tvl: DefiLlamaFieldParse;
  chain?: string;
  project?: string;
  blockers: string[];
  notes: string[];
}

const ABSENT_FIELD: DefiLlamaFieldParse = { present: false, valid: false };

interface DefiLlamaPoolRecord {
  pool?: unknown;
  chain?: unknown;
  project?: unknown;
  symbol?: unknown;
  apy?: unknown;
  apyMean30d?: unknown;
  apy30d?: unknown;
  tvlUsd?: unknown;
}

function defiLlamaPoolList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  const p = payload as { data?: unknown } | null;
  if (p && Array.isArray(p.data)) return p.data;
  return null;
}

/**
 * Parse the DefiLlama yields feed for ONE exact pool. Requires the stored pool UUID; rejects
 * any other pool, the wrong chain (when chain metadata exists), and the wrong project (only
 * when an `expectedProject` is supplied AND the record carries a project). Requires finite
 * non-negative current APY / 30-day APY / TVL. Never falls back to another protocol's record.
 */
export function parseDefiLlamaPoolMarketData(
  payload: unknown,
  options: { expectedPoolId: string; expectedChain?: string; expectedProject?: string },
): DefiLlamaPoolParseResult {
  const blockers: string[] = [];
  const notes: string[] = [];
  const absent = (): DefiLlamaPoolParseResult => ({ matched: false, currentApy: ABSENT_FIELD, apy30d: ABSENT_FIELD, tvl: ABSENT_FIELD, blockers: [...new Set(blockers)], notes });

  if (!payload || (typeof payload !== "object" && !Array.isArray(payload))) {
    blockers.push("source_payload_invalid");
    notes.push("DefiLlama payload is not an object/array.");
    return absent();
  }
  const list = defiLlamaPoolList(payload);
  if (!list) {
    blockers.push("source_schema_unrecognized");
    notes.push("DefiLlama payload has no data[] array.");
    return absent();
  }
  const rec = list.find((r) => r && typeof r === "object" && (r as DefiLlamaPoolRecord).pool === options.expectedPoolId) as DefiLlamaPoolRecord | undefined;
  if (!rec) {
    const anyPool = list.some((r) => r && typeof r === "object" && typeof (r as DefiLlamaPoolRecord).pool === "string");
    blockers.push(...(anyPool ? ["pool_id_mismatch", "candidate_record_missing"] : ["candidate_record_missing"]));
    notes.push(`Verified pool ${options.expectedPoolId} not found in the DefiLlama feed (no fallback to another pool).`);
    return absent();
  }

  const chain = typeof rec.chain === "string" ? rec.chain : undefined;
  const project = typeof rec.project === "string" ? rec.project : undefined;
  if (options.expectedChain && chain && chain.toLowerCase() !== options.expectedChain.toLowerCase()) {
    blockers.push("chain_mismatch");
    notes.push(`Pool chain '${chain}' != expected '${options.expectedChain}' — rejected.`);
  }
  if (options.expectedProject && project && project.toLowerCase() !== options.expectedProject.toLowerCase()) {
    blockers.push("protocol_mismatch");
    notes.push(`Pool project '${project}' != expected '${options.expectedProject}' — rejected.`);
  }
  // Hard mismatch → do not read values.
  if (blockers.includes("chain_mismatch") || blockers.includes("protocol_mismatch")) {
    return { ...absent(), chain, project };
  }

  // Present-but-invalid keeps the raw value (flagged) so it surfaces as `invalid`, not `missing`.
  const parseField = (rawPresent: boolean, n: number | undefined): DefiLlamaFieldParse => {
    if (!rawPresent) return { present: false, valid: false };
    if (n === undefined) return { present: true, valid: false }; // non-finite / non-numeric
    return { present: true, valid: n >= 0, value: n >= 0 ? round2(n) : n };
  };
  const has = (v: unknown) => v !== undefined && v !== null;

  const currentApy = parseField(has(rec.apy), num(rec.apy));
  const apy30dPresent = has(rec.apyMean30d) || has(rec.apy30d);
  const apy30d = parseField(apy30dPresent, num(rec.apyMean30d) ?? num(rec.apy30d));
  const tvl = parseField(has(rec.tvlUsd), num(rec.tvlUsd));

  if (!currentApy.present) blockers.push("current_apy_missing");
  else if (!currentApy.valid) blockers.push("field_invalid");
  if (!apy30d.present) blockers.push("apy_30d_missing");
  else if (!apy30d.valid) blockers.push("field_invalid");
  if (!tvl.present) blockers.push("tvl_missing");
  else if (!tvl.valid) blockers.push("field_invalid");

  notes.push(`DefiLlama pool ${options.expectedPoolId}: apy=${currentApy.value}, apyMean30d=${apy30d.value}, tvlUsd=${tvl.value}.`);
  return {
    matched: true,
    currentApy,
    apy30d,
    tvl,
    ...(chain ? { chain } : {}),
    ...(project ? { project } : {}),
    blockers: [...new Set(blockers)],
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * Field + snapshot assembly helpers.
 * ------------------------------------------------------------------ */
function fieldFreshStatus(fetchedAt: string | undefined, checkedAt: string, maxAgeHours: number): "fresh" | "stale" {
  if (!fetchedAt) return "stale";
  const t = Date.parse(fetchedAt);
  const c = Date.parse(checkedAt);
  if (Number.isNaN(t) || Number.isNaN(c)) return "stale";
  const age = c - t;
  return age >= 0 && age <= maxAgeHours * 3_600_000 ? "fresh" : "stale";
}

interface MkFieldArgs<T> {
  value: T | undefined;
  unit: SolStakingMarketField<T>["unit"];
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string | undefined;
  checkedAt: string;
  maxAgeHours: number;
  valid: boolean;
  sourceEpoch?: number;
  note: string;
}

function mkField<T>(a: MkFieldArgs<T>): SolStakingMarketField<T> | undefined {
  if (a.value === undefined || a.value === null) return undefined; // missing → omit
  const status: SolStakingMarketField<T>["status"] = !a.valid ? "invalid" : fieldFreshStatus(a.fetchedAt, a.checkedAt, a.maxAgeHours);
  return {
    value: a.value,
    unit: a.unit,
    sourceName: a.sourceName,
    sourceUrl: a.sourceUrl,
    fetchedAt: a.fetchedAt ?? a.checkedAt,
    sourceAsOf: a.fetchedAt,
    ...(a.sourceEpoch != null ? { sourceEpoch: a.sourceEpoch } : {}),
    status,
    notes: [a.note],
  };
}

const REQUIRED_FIELD_KEYS: Record<string, keyof SolStakingMarketSnapshotFields> = {
  current_apy_pct: "currentApyPct",
  apy_30d_pct: "apy30dPct",
  tvl_usd: "tvlUsd",
  delegated_stake_sol: "delegatedStakeSol",
  validator_commission_pct: "validatorCommissionPct",
  validator_delinquent: "validatorDelinquent",
  source_epoch: "sourceEpoch",
};

/** Reverse of REQUIRED_FIELD_KEYS: field object key → source field name. */
const FIELD_KEY_TO_NAME: Partial<Record<keyof SolStakingMarketSnapshotFields, string>> = Object.fromEntries(
  Object.entries(REQUIRED_FIELD_KEYS).map(([name, key]) => [key, name]),
) as Partial<Record<keyof SolStakingMarketSnapshotFields, string>>;

/** The max-age (hours) for a given field, read from the provider that supplies it. */
function providerMaxAgeForField(descriptor: SolStakingMarketSourceDescriptor, key: keyof SolStakingMarketSnapshotFields): number {
  const fname = FIELD_KEY_TO_NAME[key];
  if (fname) {
    for (const p of descriptor.providers) {
      if (p.providesFields.includes(fname as never)) return p.maximumAgeHours;
    }
  }
  return SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS;
}

interface AssembleArgs {
  descriptor: SolStakingMarketSourceDescriptor;
  fields: SolStakingMarketSnapshotFields;
  fetchedAt: string;
  checkedAt: string;
  blockers: string[];
  notes: string[];
  sourceError: boolean;
  delinquent: boolean;
}

/** Derive the snapshot status + eligibility from required-field states. Pure + deterministic. */
function assembleSnapshot(a: AssembleArgs): SolStakingMarketSnapshot {
  const { descriptor } = a;
  const missingFields: string[] = [];
  const staleFields: string[] = [];
  const invalidFields: string[] = [];
  let presentCount = 0;

  for (const fname of descriptor.requiredFields) {
    const key = REQUIRED_FIELD_KEYS[fname];
    const f = key ? a.fields[key] : undefined;
    if (!f || f.status === "missing") { missingFields.push(fname); continue; }
    presentCount++;
    if (f.status === "invalid") invalidFields.push(fname);
    else if (f.status === "stale") staleFields.push(fname);
  }

  let status: SolStakingMarketSnapshotStatus;
  if (presentCount === 0) status = a.sourceError ? "source_error" : "missing";
  else if (missingFields.length > 0) status = "partial";
  else if (invalidFields.length > 0) status = "invalid";
  else if (staleFields.length > 0) status = "stale";
  else status = "complete";

  const approval = getSolStakingMarketApprovalState(descriptor.candidateId);
  const freshEnoughForFutureComparison = status === "complete" && !a.delinquent;
  const eligibleForFutureComparison =
    freshEnoughForFutureComparison &&
    approval.approvedForReadOnlyReview &&
    !approval.blockedByRiskApproval &&
    descriptor.eligibleForFutureComparison;

  const blockers = [...new Set([...a.blockers, ...(a.delinquent ? ["validator_delinquent"] : [])])];

  return {
    candidateId: descriptor.candidateId,
    protocolName: descriptor.protocolName,
    assetSymbol: descriptor.assetSymbol,
    candidateType: descriptor.candidateType,
    fields: a.fields,
    fetchedAt: a.fetchedAt,
    checkedAt: a.checkedAt,
    status,
    missingFields,
    staleFields,
    blockers,
    notes: [...new Set(a.notes)],
    approvedForReadOnlyReview: approval.approvedForReadOnlyReview,
    blockedByRiskApproval: approval.blockedByRiskApproval,
    freshEnoughForFutureComparison,
    eligibleForFutureComparison,
    selectedByProtocolLogic: false,
    currentWinner: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/* ------------------------------------------------------------------ *
 * (6) Per-candidate builders.
 * ------------------------------------------------------------------ */
export interface BuildLstSnapshotInput {
  candidateId: string;
  defiLlamaPayload?: unknown;
  fetchedAt?: string;
  checkedAt: string;
}

/** Build an LST snapshot (JitoSOL / mSOL / JupSOL / bSOL / INF) from the DefiLlama feed. */
export function buildLstMarketSnapshot(input: BuildLstSnapshotInput): SolStakingMarketSnapshot {
  const descriptor = getSolStakingMarketSource(input.candidateId);
  if (!descriptor) throw new Error(`Unknown SOL staking market candidate: ${input.candidateId}`);
  const provider = descriptor.providers[0];
  const checkedAt = input.checkedAt;
  const fetchedAt = input.fetchedAt ?? checkedAt;
  const blockers: string[] = [];
  const notes: string[] = [];

  if (input.defiLlamaPayload === undefined) {
    blockers.push("source_request_failed");
    notes.push(`No DefiLlama payload supplied for ${input.candidateId}.`);
    return assembleSnapshot({ descriptor, fields: {}, fetchedAt, checkedAt, blockers, notes, sourceError: true, delinquent: false });
  }

  const parsed = parseDefiLlamaPoolMarketData(input.defiLlamaPayload, {
    expectedPoolId: provider.poolId as string,
    expectedChain: provider.expectedChain,
    expectedProject: provider.expectedProject,
  });
  blockers.push(...parsed.blockers);
  notes.push(...parsed.notes);

  const mkLstField = (fp: typeof parsed.currentApy, unit: "pct" | "usd", note: string) =>
    mkField<number>({ value: fp.value, unit, sourceName: provider.sourceName, sourceUrl: provider.sourceUrl, fetchedAt, checkedAt, maxAgeHours: provider.maximumAgeHours, valid: fp.valid, note });

  const fields: SolStakingMarketSnapshotFields = {
    currentApyPct: mkLstField(parsed.currentApy, "pct", "DefiLlama current APY"),
    apy30dPct: mkLstField(parsed.apy30d, "pct", "DefiLlama 30-day mean APY (apyMean30d)"),
    tvlUsd: mkLstField(parsed.tvl, "usd", "DefiLlama pool TVL"),
  };

  const sourceError = !parsed.matched && parsed.blockers.some((b) => b === "source_payload_invalid" || b === "source_schema_unrecognized");
  return assembleSnapshot({ descriptor, fields, fetchedAt, checkedAt, blockers, notes, sourceError, delinquent: false });
}

export interface BuildNativeSnapshotInput {
  stakewizPayload?: unknown;
  stakewizFetchedAt?: string;
  marinadePayload?: unknown;
  marinadeFetchedAt?: string;
  checkedAt: string;
}

/** Build the Jupiter Native Stake snapshot by reusing the Step 14T Stakewiz+Marinade pipeline. */
export function buildJupiterNativeStakeMarketSnapshot(input: BuildNativeSnapshotInput): SolStakingMarketSnapshot {
  const candidateId = SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake;
  const descriptor = getSolStakingMarketSource(candidateId) as SolStakingMarketSourceDescriptor;
  const [stakewizProvider, marinadeProvider] = descriptor.providers;
  const checkedAt = input.checkedAt;
  const notes: string[] = [];
  const blockers: string[] = [];

  const anySupplied = input.stakewizPayload !== undefined || input.marinadePayload !== undefined;
  if (!anySupplied) {
    blockers.push("source_request_failed");
    notes.push("No Stakewiz or Marinade payload supplied for Jupiter Native Stake.");
    return assembleSnapshot({ descriptor, fields: {}, fetchedAt: checkedAt, checkedAt, blockers, notes, sourceError: true, delinquent: false });
  }

  // Reuse the Step 14T combine builder for authoritative combined status + apy30d + cross-checks.
  const pkg = buildJupiterNativeStakeMarketPackage({
    stakewizPayload: input.stakewizPayload,
    stakewizFetchedAt: input.stakewizFetchedAt,
    marinadePayload: input.marinadePayload,
    marinadeFetchedAt: input.marinadeFetchedAt,
    checkedAt,
  });
  blockers.push(...pkg.blockers);
  notes.push(...pkg.notes);

  // Stakewiz supplies delinquency + epoch (not carried on the package type).
  const sw = input.stakewizPayload !== undefined
    ? parseStakewizValidatorSummary(input.stakewizPayload, { voteAccount: JUPITER_NATIVE_STAKE_VOTE_ACCOUNT })
    : undefined;
  const delinquent = sw?.delinquent === true;

  const swFetched = input.stakewizFetchedAt;
  const swMax = stakewizProvider.maximumAgeHours;
  const marFetched = input.marinadeFetchedAt;
  const marMax = marinadeProvider.maximumAgeHours;

  const fields: SolStakingMarketSnapshotFields = {
    delegatedStakeSol: mkField<number>({ value: pkg.activatedStakeSol, unit: "sol", sourceName: stakewizProvider.sourceName, sourceUrl: stakewizProvider.sourceUrl, fetchedAt: swFetched, checkedAt, maxAgeHours: swMax, valid: pkg.activatedStakeSol != null, note: "Stakewiz activated (delegated) stake" }),
    currentApyPct: mkField<number>({ value: pkg.currentApyPct, unit: "pct", sourceName: stakewizProvider.sourceName, sourceUrl: stakewizProvider.sourceUrl, fetchedAt: swFetched, checkedAt, maxAgeHours: swMax, valid: pkg.currentApyPct != null, note: "Stakewiz current APY (apy_estimate)" }),
    validatorCommissionPct: mkField<number>({ value: pkg.commissionPct, unit: "pct", sourceName: stakewizProvider.sourceName, sourceUrl: stakewizProvider.sourceUrl, fetchedAt: swFetched, checkedAt, maxAgeHours: swMax, valid: pkg.commissionPct != null, note: "Stakewiz validator commission" }),
    validatorDelinquent: mkField<boolean>({ value: sw?.delinquent, unit: "boolean", sourceName: stakewizProvider.sourceName, sourceUrl: stakewizProvider.sourceUrl, fetchedAt: swFetched, checkedAt, maxAgeHours: swMax, valid: typeof sw?.delinquent === "boolean", note: "Stakewiz delinquency flag" }),
    sourceEpoch: mkField<number>({ value: sw?.currentEpoch, unit: "epoch", sourceName: stakewizProvider.sourceName, sourceUrl: stakewizProvider.sourceUrl, fetchedAt: swFetched, checkedAt, maxAgeHours: swMax, valid: sw?.currentEpoch != null, sourceEpoch: sw?.currentEpoch, note: "Stakewiz current epoch" }),
    apy30dPct: mkField<number>({ value: pkg.apy30dPct, unit: "pct", sourceName: marinadeProvider.sourceName, sourceUrl: marinadeProvider.sourceUrl, fetchedAt: marFetched, checkedAt, maxAgeHours: marMax, valid: pkg.apy30dPct != null, note: "Marinade duration-weighted trailing-30-day validator APY (Step 14T)" }),
  };

  const fetchedAt = [swFetched, marFetched].filter((s): s is string => !!s).sort()[0] ?? checkedAt;
  const sourceError = input.stakewizPayload === undefined && input.marinadePayload === undefined;
  return assembleSnapshot({ descriptor, fields, fetchedAt, checkedAt, blockers, notes, sourceError, delinquent });
}

/** Convenience wrappers (identical builder, fixed candidate id) for the named-builder API. */
export const buildJitoSolMarketSnapshot = (payload: unknown | undefined, fetchedAt: string | undefined, checkedAt: string) =>
  buildLstMarketSnapshot({ candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.jito, defiLlamaPayload: payload, fetchedAt, checkedAt });
export const buildJupsolMarketSnapshot = (payload: unknown | undefined, fetchedAt: string | undefined, checkedAt: string) =>
  buildLstMarketSnapshot({ candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.jupiter, defiLlamaPayload: payload, fetchedAt, checkedAt });
export const buildMsolMarketSnapshot = (payload: unknown | undefined, fetchedAt: string | undefined, checkedAt: string) =>
  buildLstMarketSnapshot({ candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.marinade, defiLlamaPayload: payload, fetchedAt, checkedAt });
export const buildBsolMarketSnapshot = (payload: unknown | undefined, fetchedAt: string | undefined, checkedAt: string) =>
  buildLstMarketSnapshot({ candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.blazestake, defiLlamaPayload: payload, fetchedAt, checkedAt });
export const buildInfMarketSnapshot = (payload: unknown | undefined, fetchedAt: string | undefined, checkedAt: string) =>
  buildLstMarketSnapshot({ candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.sanctum, defiLlamaPayload: payload, fetchedAt, checkedAt });

/* ------------------------------------------------------------------ *
 * (6) Cache builder.
 * ------------------------------------------------------------------ */
export interface DefiLlamaFetchResult {
  payload?: unknown;
  fetchedAt?: string;
}

export interface BuildSolStakingMarketCacheInput {
  checkedAt: string;
  /** The shared DefiLlama /pools payload (one fetch feeds all LSTs). */
  defiLlama?: DefiLlamaFetchResult;
  /** Native validator provider payloads. */
  stakewiz?: { payload?: unknown; fetchedAt?: string };
  marinade?: { payload?: unknown; fetchedAt?: string };
  generatedAt?: string;
  refreshAttemptedAt?: string;
}

const SUCCESS_STATUSES: SolStakingMarketSnapshotStatus[] = ["complete", "partial", "stale"];

/**
 * Assemble the full live cache from injected provider payloads. Each candidate is built
 * INDEPENDENTLY: one failed provider never invalidates another candidate. Never ranks, scores,
 * or selects. `refreshStatus` is complete (all succeeded), partial (some), or failed (none).
 */
export function buildSolStakingMarketCache(input: BuildSolStakingMarketCacheInput): SolStakingMarketCache {
  const checkedAt = input.checkedAt;
  const generatedAt = input.generatedAt ?? checkedAt;
  const refreshAttemptedAt = input.refreshAttemptedAt ?? checkedAt;
  const dll = input.defiLlama;

  const candidates: Record<string, SolStakingMarketSnapshot> = {};
  candidates[SOL_STAKING_MARKET_CANDIDATE_IDS.jito] = buildJitoSolMarketSnapshot(dll?.payload, dll?.fetchedAt, checkedAt);
  candidates[SOL_STAKING_MARKET_CANDIDATE_IDS.jupiter] = buildJupsolMarketSnapshot(dll?.payload, dll?.fetchedAt, checkedAt);
  candidates[SOL_STAKING_MARKET_CANDIDATE_IDS.marinade] = buildMsolMarketSnapshot(dll?.payload, dll?.fetchedAt, checkedAt);
  candidates[SOL_STAKING_MARKET_CANDIDATE_IDS.blazestake] = buildBsolMarketSnapshot(dll?.payload, dll?.fetchedAt, checkedAt);
  candidates[SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake] = buildJupiterNativeStakeMarketSnapshot({
    stakewizPayload: input.stakewiz?.payload,
    stakewizFetchedAt: input.stakewiz?.fetchedAt,
    marinadePayload: input.marinade?.payload,
    marinadeFetchedAt: input.marinade?.fetchedAt,
    checkedAt,
  });
  candidates[SOL_STAKING_MARKET_CANDIDATE_IDS.sanctum] = buildInfMarketSnapshot(dll?.payload, dll?.fetchedAt, checkedAt);

  const successfulCandidateIds: string[] = [];
  const failedCandidateIds: string[] = [];
  const staleCandidateIds: string[] = [];
  for (const id of SOL_STAKING_MARKET_CANDIDATE_ORDER) {
    const snap = candidates[id];
    if (!snap) continue;
    if (SUCCESS_STATUSES.includes(snap.status)) successfulCandidateIds.push(id);
    else failedCandidateIds.push(id);
    if (snap.status === "stale") staleCandidateIds.push(id);
  }

  const refreshStatus: SolStakingMarketRefreshStatus =
    failedCandidateIds.length === 0 ? "complete" : successfulCandidateIds.length === 0 ? "failed" : "partial";

  return {
    schemaVersion: SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION,
    generatedAt,
    checkedAt,
    refreshAttemptedAt,
    candidates,
    refreshStatus,
    successfulCandidateIds,
    failedCandidateIds,
    staleCandidateIds,
    notes: [
      "Live market cache — separate from point-in-time approval evidence. Never selects, ranks, or moves funds.",
      `Freshness window ${SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS}h; schema ${SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION}.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * (7) Freshness re-stamping — for last-known-good carry-forward.
 * ------------------------------------------------------------------ */
/**
 * Re-evaluate a snapshot's freshness against a NEW `checkedAt` WITHOUT changing any field
 * `fetchedAt` or `value`. Old data becomes `stale` (never re-labelled `fresh`), which cascades
 * to `freshEnoughForFutureComparison` / `eligibleForFutureComparison`. Used when a failed
 * refresh carries a previous last-known-good snapshot forward. Deterministic and pure.
 */
export function restampSnapshotFreshness(snapshot: SolStakingMarketSnapshot, checkedAt: string): SolStakingMarketSnapshot {
  const descriptor = getSolStakingMarketSource(snapshot.candidateId);
  // Unknown candidate or empty snapshot: nothing to re-stamp; just move checkedAt forward.
  if (!descriptor || snapshot.status === "source_error" || snapshot.status === "missing") {
    return { ...snapshot, checkedAt };
  }

  const fields: SolStakingMarketSnapshotFields = {};
  (Object.keys(snapshot.fields) as (keyof SolStakingMarketSnapshotFields)[]).forEach((key) => {
    const f = snapshot.fields[key];
    if (!f) return;
    const status = f.status === "invalid"
      ? "invalid"
      : fieldFreshStatus(f.fetchedAt, checkedAt, providerMaxAgeForField(descriptor, key));
    // @ts-expect-error — homogeneous copy across the field union, preserving value/fetchedAt.
    fields[key] = { ...f, status };
  });

  const delinquent = snapshot.fields.validatorDelinquent?.value === true;
  return assembleSnapshot({
    descriptor,
    fields,
    fetchedAt: snapshot.fetchedAt,
    checkedAt,
    blockers: snapshot.blockers.filter((b) => b !== "validator_delinquent"),
    notes: snapshot.notes,
    sourceError: false,
    delinquent,
  });
}
