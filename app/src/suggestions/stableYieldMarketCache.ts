/**
 * stableYieldMarketCache — Step 16H-I. The canonical PUBLISHED Stable Yield market cache: its schema,
 * its strict validator, and the runtime consumption path.
 *
 * Lifecycle (mirrors the SOL-staking precedent):
 *
 *   refresh job (Node + official Kamino SDK over RPC)  →  tmp/stable-yield-market-refresh.json
 *        →  publisher (revalidates, never fetches)     →  public/generated/stable-yield-market-cache.json
 *        →  runtime (revalidates identity + freshness) →  the existing 16C market-data input
 *
 * This module is deterministic and OFFLINE: no network, no SDK, no RPC, no Node built-ins. It is safe
 * for the browser bundle precisely because it contains none of the retrieval machinery — the browser
 * only ever reads an already-normalized record, which is what the 16C `browserFetched: false` contract
 * demands.
 *
 * It approves nothing, ranks nothing, plans nothing, and creates no fallback values.
 */
import type { YieldStrategyMarketDataInput } from "./yieldStrategyMarketDataTypes";
import { normalizeRateToPercent, readDocumentedDecimalString } from "./stableYieldSourceParsers";
import { validateProductionFreshness } from "./stableYieldProductionAdapters";

export const STABLE_YIELD_MARKET_CACHE_SCHEMA_VERSION = "1.0.0" as const;
export const STABLE_YIELD_MARKET_CACHE_EXISTS = true;
export const STABLE_YIELD_REFRESH_ARTIFACT_EXISTS = true;

/** The published cache path, served as a same-origin static asset (never a third-party host). */
export const STABLE_YIELD_MARKET_CACHE_PATH = "/generated/stable-yield-market-cache.json";

/* ---- The EXACT canonical product. Duplicated here deliberately: the runtime revalidates identity
       rather than trusting whatever a cache file happens to claim. ---- */
export const SELECTED_VAULT_ADDRESS = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";
export const SELECTED_VAULT_SHARES_MINT = "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS";
export const SELECTED_VAULT_STRATEGY_ID = "kamino_steakhouse_usdc";
export const SELECTED_VAULT_DEPOSIT_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Vaults explicitly NOT selected (Step 16H-H human product decision). Listed so a mistake is loud:
 * a cache naming one of these is rejected by name in the diagnostic, not merely by address mismatch.
 */
export const REJECTED_VAULT_ADDRESSES: Record<string, string> = {
  BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2: "Steakhouse High Yield USDC",
  JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF: "Steakhouse USDC Testing",
};

/** The refresh artifact / published record. Every field is evidence; none is a planning grant. */
export interface StableYieldMarketRecord {
  schemaVersion: string;
  adapterId: string;
  adapterVersion: string;
  generatedAt: string;

  strategyId: string;
  productAddress: string;
  sharesMint: string;
  depositMint: string;
  programId?: string;
  productName?: string | null;
  chain: string;

  sourceType: string;
  sourceMethod: string;
  sourceSlot: string;
  /** CHAIN block time for `sourceSlot`. Authoritative. Never our local clock. */
  sourceTimestamp: string;
  fetchedAt: string;

  /** The SDK's Decimal, stringified. The parser owns fraction→percent; the job never converts. */
  netApyRaw: string;
  netApyUnit: "fraction" | "percent";
  apyProvenanceKind: string;
  browserFetched: false;

  minDepositRaw: string;
  mintDecimals: number;
  managementFeeBps: number;
  performanceFeeBps: number;

  depositCapRaw?: string | null;
  capacityState: string;
  capacityReason?: string;
  depositState: string;
  depositStateReason?: string;

  planningSafe: boolean;
  blockers: string[];
}

export type StableYieldCacheValidation =
  | { valid: true; record: StableYieldMarketRecord }
  | { valid: false; stage: string; reason: string };

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Strictly validate a refresh artifact / published cache record. Used by BOTH the publisher (before
 * writing) and the runtime (before consuming) — identity and freshness are checked twice on purpose,
 * because a file on disk is an untrusted input.
 *
 * `checkedAt` is supplied so the caller owns the clock (and fixtures stay deterministic).
 */
export function validateStableYieldMarketRecord(raw: unknown, checkedAt: string): StableYieldCacheValidation {
  if (!isRec(raw)) return { valid: false, stage: "source_parse", reason: "record_not_an_object" };

  if (raw.schemaVersion !== STABLE_YIELD_MARKET_CACHE_SCHEMA_VERSION) return { valid: false, stage: "source_parse", reason: `unsupported_schema_version:${String(raw.schemaVersion)}` };

  // ---- Identity: exact, and never a rejected sibling vault ----
  const addr = raw.productAddress;
  if (typeof addr !== "string" || addr.length === 0) return { valid: false, stage: "identity_validation", reason: "missing_product_address" };
  const rejected = REJECTED_VAULT_ADDRESSES[addr];
  if (rejected) return { valid: false, stage: "identity_validation", reason: `rejected_non_selected_vault:${rejected}` };
  if (addr !== SELECTED_VAULT_ADDRESS) return { valid: false, stage: "identity_validation", reason: "product_identity_mismatch" };
  if (raw.strategyId !== SELECTED_VAULT_STRATEGY_ID) return { valid: false, stage: "identity_validation", reason: "strategy_id_mismatch" };
  if (raw.sharesMint !== SELECTED_VAULT_SHARES_MINT) return { valid: false, stage: "identity_validation", reason: "shares_mint_mismatch" };
  if (raw.depositMint !== SELECTED_VAULT_DEPOSIT_MINT) return { valid: false, stage: "identity_validation", reason: "wrong_asset" };
  if (raw.chain !== "solana_mainnet") return { valid: false, stage: "identity_validation", reason: "wrong_chain" };

  // ---- The browser must never be the source ----
  if (raw.browserFetched !== false) return { valid: false, stage: "source_parse", reason: "browser_fetched_is_not_allowed" };

  // ---- APY: documented decimal string, declared unit, no magnitude guessing ----
  if (raw.netApyUnit !== "fraction" && raw.netApyUnit !== "percent") return { valid: false, stage: "unit_normalization", reason: "undeclared_apy_unit" };
  const rate = readDocumentedDecimalString(raw, "netApyRaw");
  if (!rate.ok) return { valid: false, stage: "unit_normalization", reason: rate.reason };
  const pct = normalizeRateToPercent(rate.value, raw.netApyUnit, "netApyRaw");
  if (!pct.ok) return { valid: false, stage: "unit_normalization", reason: pct.reason };

  // ---- Freshness: the chain's own time, via the canonical 16C rule ----
  if (typeof raw.sourceSlot !== "string" || raw.sourceSlot.length === 0) return { valid: false, stage: "freshness_validation", reason: "missing_source_slot" };
  if (typeof raw.sourceTimestamp !== "string") return { valid: false, stage: "freshness_validation", reason: "missing_source_timestamp" };
  const fresh = validateProductionFreshness({ sourceTimestamp: raw.sourceTimestamp, checkedAt });
  if (!fresh.ok) return { valid: false, stage: "freshness_validation", reason: `source_${fresh.status}` };

  // ---- Constraints: integer token math ----
  if (typeof raw.mintDecimals !== "number" || raw.mintDecimals !== 6) return { valid: false, stage: "unit_normalization", reason: "unexpected_mint_decimals" };
  if (typeof raw.minDepositRaw !== "string" || !/^\d+$/.test(raw.minDepositRaw)) return { valid: false, stage: "unit_normalization", reason: "invalid_min_deposit_raw" };
  for (const f of ["managementFeeBps", "performanceFeeBps"] as const) {
    const v = raw[f];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 10_000) return { valid: false, stage: "unit_normalization", reason: `invalid_${f}` };
  }

  return { valid: true, record: raw as unknown as StableYieldMarketRecord };
}

/**
 * Convert an on-chain integer token amount to a USD-denominated number using exact integer math.
 * `100000` raw at 6dp is exactly `0.1` — computed by integer division + remainder rather than a float
 * round-trip, so no binary artifact can appear in a value the planner might one day use.
 */
export function rawTokenAmountToUsd(raw: string, decimals: number): number | null {
  if (!/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) return null;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = decimals > 0 ? padded.slice(padded.length - decimals) : "";
  const n = Number(decimals > 0 ? `${whole}.${frac}` : whole);
  return Number.isFinite(n) ? n : null;
}

/** The exact normalized net APY percent for a validated record. Never recalculated downstream. */
export function cacheRecordNetApyPct(record: StableYieldMarketRecord): number | null {
  const rate = readDocumentedDecimalString(record as unknown as Record<string, unknown>, "netApyRaw");
  if (!rate.ok) return null;
  const pct = normalizeRateToPercent(rate.value, record.netApyUnit, "netApyRaw");
  return pct.ok ? pct.value : null;
}

/**
 * Map a VALIDATED cache record onto the canonical 16C market-data input.
 *
 * Note what this does NOT do: it does not mark the product eligible, approved, or planning-safe. The
 * 16C join still only builds a real snapshot for an APPROVED entry, and this product is not approved.
 * A market input is data about a product, not permission to plan with it.
 */
export function cacheRecordToMarketDataInput(record: StableYieldMarketRecord): YieldStrategyMarketDataInput | null {
  const pct = cacheRecordNetApyPct(record);
  if (pct == null) return null;
  return {
    strategyId: record.strategyId,
    sourceId: record.adapterId,
    sourceLabel: record.sourceMethod,
    provenanceKind: "backend_normalized",
    browserFetched: false,
    // The CHAIN's time, not our fetch time — a recent fetch of stale chain data must stay stale.
    fetchedAt: record.sourceTimestamp,
    apy: { netApyPct: pct, apyDefinition: "net", apyWindow: "current" },
  };
}
