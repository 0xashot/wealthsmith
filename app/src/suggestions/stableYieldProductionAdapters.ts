/**
 * stableYieldProductionAdapters — Step 16H-G, stages C+D (normalize + validate). Turns a strictly
 * parsed source record into a canonical input for the EXISTING contracts:
 *   - `YieldStrategyMarketDataInput` (16C)
 *   - `YieldStrategyProductCapacitySnapshot`-shaped capacity input (16G)
 *
 * It selects no product, no leader, no lane, no amount, no Top Pick; it writes no copy and creates no
 * fallback product. Every path fails closed with a structured diagnostic.
 *
 * This module is deterministic and OFFLINE: retrieval (stage A) happens only in the developer-only
 * Node probe. The 16C contract pins `browserFetched: false`, so the browser must never call a yield
 * data provider — production data must arrive pre-normalized from a backend/job, which does not exist
 * yet (reported as an infrastructure blocker).
 */
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";
import type { YieldStrategyMarketDataInput } from "./yieldStrategyMarketDataTypes";
import { resolveStableYieldProductIdentity } from "./stableYieldProductionIdentity";
import { parseKaminoVaultRecord, type StableYieldRateUnit } from "./stableYieldSourceParsers";
import {
  STABLE_YIELD_PRODUCTION_ADAPTER_SCHEMA_VERSION,
  STABLE_YIELD_PRODUCTION_ADAPTER_POLICY_ID,
  type StableYieldAdapterDiagnostic,
  type StableYieldAdapterStage,
  type StableYieldIdentityReason,
  type StableYieldProductionAdapterResult,
  type StableYieldSourceErrorCategory,
} from "./stableYieldProductionAdapterTypes";

export const STABLE_YIELD_PRODUCTION_ADAPTERS_EXIST = true;
export const STABLE_YIELD_PRODUCTION_MARKET_ADAPTER_EXISTS = true;
export const STABLE_YIELD_PRODUCTION_CAPACITY_ADAPTER_EXISTS = true;

const KAMINO_ADAPTER_ID = "kamino_vault_state_v1";
const KAMINO_ADAPTER_VERSION = "1.0.0";
const KAMINO_SOURCE_NAME = "Kamino official SDK (klend-sdk) vault state";

/** Kamino's SDK vault yield calc returns a decimal fraction. UNVERIFIED live — see evidence manifest. */
const KAMINO_RATE_UNIT: StableYieldRateUnit = "fraction";

/** Canonical max age for production market data. Mirrors the 16C freshness contract — no new constant. */
export const STABLE_YIELD_PRODUCTION_MARKET_MAX_AGE_MS = 3_600_000;

/** Clock-skew tolerance for "future-dated". Reused from the repository's existing source conventions. */
const FUTURE_SKEW_TOLERANCE_MS = 60_000;

function baseDiagnostic(args: { strategyId: string; adapterId: string; adapterVersion: string; sourceName: string; checkedAt: string }): StableYieldAdapterDiagnostic {
  return {
    schemaVersion: STABLE_YIELD_PRODUCTION_ADAPTER_SCHEMA_VERSION,
    policyId: STABLE_YIELD_PRODUCTION_ADAPTER_POLICY_ID,
    adapterId: args.adapterId,
    adapterVersion: args.adapterVersion,
    strategyId: args.strategyId,
    sourceName: args.sourceName,
    stage: "configuration",
    fetchStatus: "not_attempted",
    parseStatus: "not_attempted",
    identityStatus: "not_attempted",
    freshnessStatus: "not_attempted",
    outputStatus: "unavailable",
    planningSafe: false,
    reason: "not_evaluated",
    sourceErrorCategory: "none",
    retryable: false,
    credentialsRequired: false,
    checkedAt: args.checkedAt,
    canonicalAvailability: "unavailable",
  };
}

function fail(d: StableYieldAdapterDiagnostic, patch: Partial<StableYieldAdapterDiagnostic> & { stage: StableYieldAdapterStage; reason: string; sourceErrorCategory: StableYieldSourceErrorCategory }): StableYieldAdapterDiagnostic {
  return { ...d, ...patch, planningSafe: false, outputStatus: patch.outputStatus ?? "unavailable", canonicalAvailability: patch.canonicalAvailability ?? "blocked" };
}

/**
 * Validate freshness against the canonical 16C rule set. The AUTHORITATIVE timestamp is the SOURCE's
 * own timestamp — never our local fetch time. A recent fetch of a stale upstream value is still stale.
 */
export function validateProductionFreshness(args: { sourceTimestamp: string; checkedAt: string; maximumAgeMs?: number }): { ok: true; ageMs: number } | { ok: false; status: "stale" | "future_dated" | "missing_timestamp" | "negative_age"; ageMs?: number } {
  const src = Date.parse(args.sourceTimestamp);
  const now = Date.parse(args.checkedAt);
  if (!Number.isFinite(src) || !Number.isFinite(now)) return { ok: false, status: "missing_timestamp" };
  const ageMs = now - src;
  if (ageMs < -FUTURE_SKEW_TOLERANCE_MS) return { ok: false, status: "future_dated", ageMs };
  if (ageMs < 0) return { ok: false, status: "negative_age", ageMs };
  if (ageMs > (args.maximumAgeMs ?? STABLE_YIELD_PRODUCTION_MARKET_MAX_AGE_MS)) return { ok: false, status: "stale", ageMs };
  return { ok: true, ageMs };
}

/* ------------------------------------------------------------------ *
 * Market / APY adapter (Kamino vault state)
 * ------------------------------------------------------------------ */

/**
 * Build a canonical 16C market-data input from a raw Kamino vault-state record.
 *
 * Runs: parse → identity → freshness → normalize. Any failure returns no `output` at all — a caller
 * cannot accidentally consume a partial record, because there is nothing to consume.
 *
 * APY policy: the SDK's net vault yield is the ONE selected field. This adapter never averages rates,
 * never picks the highest field, never infers an APY definition, and never derives APY from an APR.
 */
export function buildKaminoMarketDataInput(args: {
  entry: YieldStrategyRegistryEntry;
  raw: unknown;
  checkedAt: string;
  fetchedAt?: string;
  maximumAgeMs?: number;
}): StableYieldProductionAdapterResult<YieldStrategyMarketDataInput> {
  const { entry, raw, checkedAt } = args;
  const d0 = baseDiagnostic({ strategyId: entry.strategyId, adapterId: KAMINO_ADAPTER_ID, adapterVersion: KAMINO_ADAPTER_VERSION, sourceName: KAMINO_SOURCE_NAME, checkedAt });
  const envelope = { adapterId: KAMINO_ADAPTER_ID, adapterVersion: KAMINO_ADAPTER_VERSION, strategyId: entry.strategyId, sourceType: "official_protocol_sdk" as const, sourceName: KAMINO_SOURCE_NAME, sourceRef: "klend-sdk:KaminoVault.getState", checkedAt, fetchedAt: args.fetchedAt };

  if (entry.protocolId !== "kamino") {
    return { ...envelope, diagnostic: fail(d0, { stage: "configuration", reason: `adapter_protocol_mismatch:${entry.protocolId}`, sourceErrorCategory: "configuration" }) };
  }

  // ---- Stage B: strict parse ----
  const parsed = parseKaminoVaultRecord(raw, KAMINO_RATE_UNIT);
  if (!parsed.ok) {
    return { ...envelope, diagnostic: fail(d0, { stage: "source_parse", parseStatus: parsed.reason === "source_not_an_object" ? "schema_mismatch" : parsed.reason.includes("missing") ? "missing_field" : "invalid_field", reason: parsed.reason, ...(parsed.field ? { invalidField: parsed.field } : {}), sourceErrorCategory: "schema" }) };
  }
  const rec = parsed.value;

  // ---- Stage D1: exact identity ----
  const identity = resolveStableYieldProductIdentity({ entry, claim: { productAddress: rec.productAddress, assetMint: rec.assetMint, chain: rec.chain, protocolId: rec.protocolId, productName: rec.productName }, sourceAdapterId: KAMINO_ADAPTER_ID });
  if (!identity.verified) {
    const reason: StableYieldIdentityReason = identity.reason;
    return { ...envelope, sourceTimestamp: rec.sourceTimestamp, diagnostic: fail(d0, { stage: "identity_validation", parseStatus: "ok", identityStatus: reason === "duplicate_product_match" ? "duplicate" : reason === "product_identity_mismatch" || reason === "wrong_asset" || reason === "wrong_chain" ? "mismatch" : "unverified", reason: identity.reason, identityReason: reason, sourceErrorCategory: "identity", sourceTimestamp: rec.sourceTimestamp }) };
  }

  // ---- Stage D2: freshness (source time is authoritative) ----
  const fresh = validateProductionFreshness({ sourceTimestamp: rec.sourceTimestamp, checkedAt, maximumAgeMs: args.maximumAgeMs });
  if (!fresh.ok) {
    return { ...envelope, identity: identity.identity, sourceTimestamp: rec.sourceTimestamp, diagnostic: fail(d0, { stage: "freshness_validation", parseStatus: "ok", identityStatus: "verified", freshnessStatus: fresh.status, reason: `source_${fresh.status}`, sourceErrorCategory: "freshness", retryable: fresh.status === "stale", sourceTimestamp: rec.sourceTimestamp }) };
  }

  // ---- Stage C: canonical normalization ----
  const output: YieldStrategyMarketDataInput = {
    strategyId: entry.strategyId,
    sourceId: KAMINO_ADAPTER_ID,
    sourceLabel: KAMINO_SOURCE_NAME,
    provenanceKind: "backend_normalized",
    browserFetched: false,
    fetchedAt: rec.sourceTimestamp,
    maximumAgeMs: args.maximumAgeMs ?? STABLE_YIELD_PRODUCTION_MARKET_MAX_AGE_MS,
    apy: { netApyPct: rec.netApyPct, apyDefinition: "net", apyWindow: "current" },
  };

  return {
    ...envelope,
    identity: identity.identity,
    sourceTimestamp: rec.sourceTimestamp,
    output,
    diagnostic: { ...d0, stage: "canonical_output", fetchStatus: "ok", parseStatus: "ok", identityStatus: "verified", freshnessStatus: "fresh", outputStatus: "complete", planningSafe: true, reason: "normalized", sourceErrorCategory: "none", sourceTimestamp: rec.sourceTimestamp, canonicalAvailability: "available" },
  };
}

/* ------------------------------------------------------------------ *
 * Capacity adapter
 * ------------------------------------------------------------------ */

export interface StableYieldCapacityAdapterOutput {
  capacityMode: "explicit_remaining_capacity" | "verified_uncapped" | "deposits_paused" | "product_full" | "unavailable" | "unknown" | "invalid";
  acceptingDeposits: boolean;
  remainingDepositCapacityUsd?: number;
  sourceTimestamp: string;
}

/**
 * Build a canonical capacity result from a Kamino vault-state record.
 *
 * The hard rules this encodes (each is a fail condition for the release gate):
 *   - remaining capacity comes ONLY from explicit cap − explicit deposited, on the SAME product, in
 *     the SAME unit. Never TVL. Never withdrawal liquidity. Never lane capital. Never Infinity.
 *   - an ABSENT cap is `unknown`, never `verified_uncapped`. Absence of evidence is not evidence.
 *   - `verified_uncapped` requires an explicit source assertion that no cap applies. This adapter
 *     therefore CANNOT emit it: Kamino vault state exposes no "uncapped" assertion, only an optional
 *     cap field. Emitting it from a missing field is exactly the forbidden inference.
 *   - an absent deposits-enabled flag is `unknown`, never "enabled".
 */
export function buildKaminoCapacity(args: {
  entry: YieldStrategyRegistryEntry;
  raw: unknown;
  checkedAt: string;
  maximumAgeMs?: number;
}): StableYieldProductionAdapterResult<StableYieldCapacityAdapterOutput> {
  const { entry, raw, checkedAt } = args;
  const d0 = baseDiagnostic({ strategyId: entry.strategyId, adapterId: KAMINO_ADAPTER_ID, adapterVersion: KAMINO_ADAPTER_VERSION, sourceName: KAMINO_SOURCE_NAME, checkedAt });
  const envelope = { adapterId: KAMINO_ADAPTER_ID, adapterVersion: KAMINO_ADAPTER_VERSION, strategyId: entry.strategyId, sourceType: "official_protocol_sdk" as const, sourceName: KAMINO_SOURCE_NAME, sourceRef: "klend-sdk:KaminoVault.getState", checkedAt };

  const parsed = parseKaminoVaultRecord(raw, KAMINO_RATE_UNIT);
  if (!parsed.ok) return { ...envelope, diagnostic: fail(d0, { stage: "source_parse", parseStatus: "invalid_field", reason: parsed.reason, ...(parsed.field ? { invalidField: parsed.field } : {}), sourceErrorCategory: "schema" }) };
  const rec = parsed.value;

  const identity = resolveStableYieldProductIdentity({ entry, claim: { productAddress: rec.productAddress, assetMint: rec.assetMint, chain: rec.chain, protocolId: rec.protocolId }, sourceAdapterId: KAMINO_ADAPTER_ID });
  if (!identity.verified) {
    return { ...envelope, sourceTimestamp: rec.sourceTimestamp, diagnostic: fail(d0, { stage: "identity_validation", parseStatus: "ok", identityStatus: "unverified", reason: identity.reason, identityReason: identity.reason, sourceErrorCategory: "identity" }) };
  }

  const fresh = validateProductionFreshness({ sourceTimestamp: rec.sourceTimestamp, checkedAt, maximumAgeMs: args.maximumAgeMs });
  if (!fresh.ok) {
    return { ...envelope, identity: identity.identity, sourceTimestamp: rec.sourceTimestamp, diagnostic: fail(d0, { stage: "freshness_validation", parseStatus: "ok", identityStatus: "verified", freshnessStatus: fresh.status, reason: `capacity_${fresh.status}`, sourceErrorCategory: "freshness" }) };
  }

  const done = (out: StableYieldCapacityAdapterOutput, reason: string): StableYieldProductionAdapterResult<StableYieldCapacityAdapterOutput> => ({
    ...envelope,
    identity: identity.identity,
    sourceTimestamp: rec.sourceTimestamp,
    output: out,
    diagnostic: { ...d0, stage: "capacity_validation", fetchStatus: "ok", parseStatus: "ok", identityStatus: "verified", freshnessStatus: "fresh", outputStatus: "complete", planningSafe: true, reason, sourceErrorCategory: "none", sourceTimestamp: rec.sourceTimestamp, canonicalAvailability: "available" },
  });

  // Explicit deposit pause beats every capacity consideration. Note this is a DEPOSIT state — a
  // withdrawal pause is a different field and must never be read as a deposit pause.
  if (rec.depositsEnabled === false) return done({ capacityMode: "deposits_paused", acceptingDeposits: false, sourceTimestamp: rec.sourceTimestamp }, "deposits_paused");

  // No explicit cap → UNKNOWN. This is the single most important line in the adapter.
  if (rec.depositCapUsd === undefined || rec.depositedUsd === undefined) {
    return {
      ...envelope,
      identity: identity.identity,
      sourceTimestamp: rec.sourceTimestamp,
      output: { capacityMode: "unknown", acceptingDeposits: false, sourceTimestamp: rec.sourceTimestamp },
      diagnostic: fail(d0, { stage: "capacity_validation", parseStatus: "ok", identityStatus: "verified", freshnessStatus: "fresh", reason: "no_explicit_cap_evidence_absence_is_not_uncapped", missingField: rec.depositCapUsd === undefined ? "depositCapUsd" : "depositedUsd", sourceErrorCategory: "none", outputStatus: "partial", canonicalAvailability: "unavailable" }),
    };
  }

  const remaining = rec.depositCapUsd - rec.depositedUsd;
  if (!Number.isFinite(remaining)) return { ...envelope, identity: identity.identity, diagnostic: fail(d0, { stage: "capacity_validation", parseStatus: "ok", identityStatus: "verified", reason: "non_finite_remaining_capacity", invalidField: "depositCapUsd-depositedUsd", sourceErrorCategory: "schema" }) };
  // A negative remainder means cap/usage disagree (or refer to different products) — reject, never clamp.
  if (remaining < 0) return { ...envelope, identity: identity.identity, diagnostic: fail(d0, { stage: "capacity_validation", parseStatus: "ok", identityStatus: "verified", reason: "negative_remaining_capacity_conflicting_cap_and_usage", invalidField: "depositCapUsd", sourceErrorCategory: "schema" }) };
  if (remaining === 0) return done({ capacityMode: "product_full", acceptingDeposits: false, sourceTimestamp: rec.sourceTimestamp }, "product_full");

  return done({ capacityMode: "explicit_remaining_capacity", acceptingDeposits: true, remainingDepositCapacityUsd: remaining, sourceTimestamp: rec.sourceTimestamp }, "explicit_remaining_capacity");
}
