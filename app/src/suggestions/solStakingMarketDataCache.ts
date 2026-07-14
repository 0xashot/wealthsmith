/**
 * solStakingMarketDataCache — Step 14U. Last-known-good cache behavior for the live SOL
 * staking market data: schema validation, refresh merge (preserving previous snapshots when a
 * refresh fails), point-in-time freshness reads, and a fresh-approved listing.
 *
 * INVARIANTS: never label old data fresh; never overwrite a valid previous snapshot with empty
 * refresh values; never change a preserved snapshot's original `fetchedAt`; return stale
 * anything older than the 24h window; fail closed on an invalid schema; ignore unknown
 * candidate IDs. The fresh-approved listing filters approved + complete + fresh candidates in
 * canonical registry order and NEVER ranks / sorts by performance / chooses a winner.
 */
import {
  SOL_STAKING_MARKET_CANDIDATE_ORDER,
  type SolStakingMarketCache,
  type SolStakingMarketRefreshStatus,
  type SolStakingMarketSnapshot,
} from "./solStakingMarketDataTypes";
import { SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION } from "./solStakingMarketDataSources";
import { restampSnapshotFreshness } from "./solStakingMarketDataRefresh";

export const SOL_STAKING_MARKET_CACHE_MODULE_EXISTS = true;
export const SOL_STAKING_MARKET_CACHE_RANKS_CANDIDATES = false;
export const SOL_STAKING_MARKET_CACHE_SELECTS_WINNER = false;

const CANONICAL_IDS = new Set(SOL_STAKING_MARKET_CANDIDATE_ORDER);
/** A snapshot with no usable data from this refresh (must not overwrite a good previous one). */
function isEmptySnapshot(s: SolStakingMarketSnapshot): boolean {
  return s.status === "source_error" || s.status === "missing";
}

/* ------------------------------------------------------------------ *
 * Validation — fail closed.
 * ------------------------------------------------------------------ */
export interface ValidateCacheOptions {
  expectedSchemaVersion?: string;
}
export interface ValidateCacheResult {
  valid: boolean;
  cache?: SolStakingMarketCache;
  errors: string[];
  ignoredCandidateIds: string[];
}

/**
 * Validate a raw parsed cache object. Fails closed on a missing/mismatched schema version or a
 * malformed shape. Unknown candidate IDs are dropped (ignored), not accepted into the canonical
 * set. Returns a sanitized cache when valid.
 */
export function validateSolStakingMarketCache(raw: unknown, options: ValidateCacheOptions = {}): ValidateCacheResult {
  const expected = options.expectedSchemaVersion ?? SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION;
  const errors: string[] = [];
  const ignoredCandidateIds: string[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, errors: ["cache_not_an_object"], ignoredCandidateIds };
  }
  const c = raw as Partial<SolStakingMarketCache>;
  if (c.schemaVersion !== expected) {
    return { valid: false, errors: [`schema_version_mismatch: got ${String(c.schemaVersion)}, expected ${expected}`], ignoredCandidateIds };
  }
  if (!c.candidates || typeof c.candidates !== "object" || Array.isArray(c.candidates)) {
    return { valid: false, errors: ["candidates_not_an_object"], ignoredCandidateIds };
  }
  if (typeof c.checkedAt !== "string" || Number.isNaN(Date.parse(c.checkedAt))) {
    return { valid: false, errors: ["invalid_checkedAt"], ignoredCandidateIds };
  }

  const candidates: Record<string, SolStakingMarketSnapshot> = {};
  for (const [id, snap] of Object.entries(c.candidates)) {
    if (!CANONICAL_IDS.has(id)) { ignoredCandidateIds.push(id); continue; }
    if (!snap || typeof snap !== "object") { errors.push(`candidate_${id}_malformed`); continue; }
    const s = snap as SolStakingMarketSnapshot;
    if (s.candidateId !== id || typeof s.status !== "string" || typeof s.fields !== "object") {
      errors.push(`candidate_${id}_malformed`);
      continue;
    }
    candidates[id] = s;
  }
  if (Object.keys(candidates).length === 0) {
    return { valid: false, errors: [...errors, "no_valid_candidates"], ignoredCandidateIds };
  }

  const cache: SolStakingMarketCache = {
    schemaVersion: expected,
    generatedAt: typeof c.generatedAt === "string" ? c.generatedAt : c.checkedAt,
    checkedAt: c.checkedAt,
    refreshAttemptedAt: typeof c.refreshAttemptedAt === "string" ? c.refreshAttemptedAt : c.checkedAt,
    candidates,
    refreshStatus: (c.refreshStatus as SolStakingMarketRefreshStatus) ?? "partial",
    successfulCandidateIds: Array.isArray(c.successfulCandidateIds) ? c.successfulCandidateIds.filter((x) => CANONICAL_IDS.has(x)) : [],
    failedCandidateIds: Array.isArray(c.failedCandidateIds) ? c.failedCandidateIds.filter((x) => CANONICAL_IDS.has(x)) : [],
    staleCandidateIds: Array.isArray(c.staleCandidateIds) ? c.staleCandidateIds.filter((x) => CANONICAL_IDS.has(x)) : [],
    notes: Array.isArray(c.notes) ? c.notes.filter((n): n is string => typeof n === "string") : [],
  };
  return { valid: true, cache, errors, ignoredCandidateIds };
}

/* ------------------------------------------------------------------ *
 * Merge — preserve last-known-good on failure.
 * ------------------------------------------------------------------ */
export interface MergeCacheOptions {
  checkedAt?: string;
}

/**
 * Merge a freshly-attempted cache over a previous one. For each canonical candidate: use the
 * attempted snapshot when it carries data; otherwise KEEP the previous snapshot as
 * last-known-good (re-stamped for freshness at the attempt's checkedAt — original `fetchedAt`
 * preserved, old data marked stale). A failed refresh never overwrites a good previous snapshot
 * with empty values, and every failure is recorded. Candidate order stays canonical.
 */
export function mergeSolStakingMarketRefresh(
  previousCache: SolStakingMarketCache | undefined,
  attemptedCache: SolStakingMarketCache,
  options: MergeCacheOptions = {},
): SolStakingMarketCache {
  const checkedAt = options.checkedAt ?? attemptedCache.checkedAt;
  const candidates: Record<string, SolStakingMarketSnapshot> = {};
  const successfulCandidateIds: string[] = [];
  const failedCandidateIds: string[] = [];
  const staleCandidateIds: string[] = [];
  const notes: string[] = [...attemptedCache.notes];

  for (const id of SOL_STAKING_MARKET_CANDIDATE_ORDER) {
    const att = attemptedCache.candidates[id];
    const prev = previousCache?.candidates[id];

    if (att && !isEmptySnapshot(att)) {
      candidates[id] = att;
      successfulCandidateIds.push(id);
    } else if (prev && !isEmptySnapshot(prev)) {
      // Refresh failed for this candidate — keep last-known-good, re-stamped for freshness.
      candidates[id] = restampSnapshotFreshness(prev, checkedAt);
      failedCandidateIds.push(id);
      notes.push(`Candidate ${id}: refresh failed; preserved previous last-known-good snapshot (original fetchedAt kept).`);
    } else if (att) {
      candidates[id] = { ...att, checkedAt };
      failedCandidateIds.push(id);
    } else if (prev) {
      candidates[id] = restampSnapshotFreshness(prev, checkedAt);
      failedCandidateIds.push(id);
    }

    const snap = candidates[id];
    if (snap && snap.status === "stale") staleCandidateIds.push(id);
  }

  const refreshStatus: SolStakingMarketRefreshStatus =
    failedCandidateIds.length === 0 ? "complete" : successfulCandidateIds.length === 0 ? "failed" : "partial";

  return {
    schemaVersion: attemptedCache.schemaVersion,
    generatedAt: attemptedCache.generatedAt,
    checkedAt,
    refreshAttemptedAt: attemptedCache.refreshAttemptedAt,
    candidates,
    refreshStatus,
    successfulCandidateIds,
    failedCandidateIds,
    staleCandidateIds,
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * Reads.
 * ------------------------------------------------------------------ */
/** Point-in-time snapshot read, re-stamped for freshness at `checkedAt` (old → stale). */
export function getSolStakingMarketSnapshot(
  cache: SolStakingMarketCache,
  candidateId: string,
  checkedAt: string,
): SolStakingMarketSnapshot | undefined {
  const snap = cache.candidates[candidateId];
  if (!snap) return undefined;
  return restampSnapshotFreshness(snap, checkedAt);
}

/**
 * The approved + complete + fresh candidates, in canonical registry order. This is a DATA-
 * READINESS filter only: it does NOT sort by performance, rank, or choose a winner.
 */
export function listFreshApprovedMarketSnapshots(cache: SolStakingMarketCache, checkedAt: string): SolStakingMarketSnapshot[] {
  const out: SolStakingMarketSnapshot[] = [];
  for (const id of SOL_STAKING_MARKET_CANDIDATE_ORDER) {
    const snap = cache.candidates[id];
    if (!snap) continue;
    const fresh = restampSnapshotFreshness(snap, checkedAt);
    if (fresh.approvedForReadOnlyReview && fresh.status === "complete" && fresh.eligibleForFutureComparison) {
      out.push(fresh);
    }
  }
  return out; // canonical order preserved; never sorted by APY/TVL
}
